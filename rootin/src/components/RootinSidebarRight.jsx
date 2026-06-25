import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTilEditor } from '@/components/til-shared/til-editor-context';
import { PixelPlant, PIXEL_SPECIES } from '@/pixel-plants.jsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, Sprout, FileText, Pencil, Lightbulb, Sparkles, Flame, Loader2, Plus } from 'lucide-react';
import { getMyTils, getTil, getDraft } from '@/api/til.js';
import { cn } from '@/lib/utils';
import { inferSpecies } from '@/utils/plant.js';
import { playSfx } from '@/lib/sfx.js';
import { EditorConfirmModal } from './EditorConfirmModal.jsx';
import '@/til-editor.css';
import './sidebar-right-monitor.css';

const SLIDE_OUT = 400;  // 접힘 시 디바이스를 우측으로 슬라이드 아웃하는 거리(슬롯 overflow가 담음)

const GROWTH_STAGE_TO_PIXEL_STAGE = {
  SEED: 'seed',
  SPROUT: 'sprout',
  MATURE: 'leaf',
  LEAF: 'leaf',
  BLOOM: 'bloom',
  FULL_BLOOM: 'full',
};

const GROWTH_STAGE_LABEL = {
  SEED: '씨앗',
  SPROUT: '새싹',
  MATURE: '성숙',
  LEAF: '성숙',
  BLOOM: '개화',
  FULL_BLOOM: '만개',
};


function calculateEstimatedExp(contentLength, streakDays) {
  if (contentLength <= 0) return 0;
  const baseExp = Math.min(contentLength * 0.2, 300);
  const multiplier = 1 + Math.min(Math.max(streakDays, 0) * 0.05, 0.5);
  return Math.floor(baseExp * multiplier);
}

function formatTilDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
}

const TIL_PAGE_SIZE = 30;

function mapTil(t) {
  return {
    id: t.tilId,
    title: t.title,
    date: formatTilDate(t.publishedAt ?? t.createdAt),
    tags: Array.isArray(t.tags) ? t.tags : [],
    potId: t.potId,
  };
}

// Stagger choreography — panel sections rise in sequence (Card Status List 패턴)
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};
const sectionVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.985 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 320, damping: 26 } },
};

// 공통 카드 셸 — rounded-2xl + 시맨틱 토큰 (ProfileCard / Card Status List 어휘)
function PanelCard({ className, children }) {
  return (
    <motion.section
      variants={sectionVariants}
      className={cn(
        'rounded-[var(--r-card)] border-2 border-[var(--leaf)] bg-[var(--paper-card)] shadow-[5px_5px_0_0_var(--leaf)]',
        className,
      )}
    >
      {children}
    </motion.section>
  );
}

// 현재 편집 대상임을 알리는 라이브 배지 (맥동하는 점 + 라벨)
function EditingBadge({ label, tone = 'moss' }) {
  const color = tone === 'amber' ? 'var(--amber)' : 'var(--leaf-2)';
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 24 }}
      className="inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
      style={{ background: `color-mix(in oklch, ${color} 15%, transparent)`, color }}
    >
      <motion.span
        className="size-1.5 rounded-full"
        style={{ background: color }}
        animate={{ opacity: [1, 0.3, 1], scale: [1, 0.75, 1] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      {label}
    </motion.span>
  );
}

export function RootinSidebarRight({ onEditTil, onResumeDraft, onNewTil, open = true, onToggle }) {
  const {
    editor,
    selectedPotId, setSelectedPotId, pots, potsLoading,
    currentTilId, dirty, draftSavedAt, resumeDraft, startNewTil,
    selectedPotDashboard, selectedPotDashboardLoading,
  } = useTilEditor();

  const [tils, setTils] = useState([]);
  const [tilsLoading, setTilsLoading] = useState(false);
  const [tilsLoadingMore, setTilsLoadingMore] = useState(false);
  const [tilTotalCount, setTilTotalCount] = useState(0);
  const [tilPage, setTilPage] = useState(0);
  const [draft, setDraft] = useState(null);
  const [contentLength, setContentLength] = useState(0);
  // "이어쓰기"로 임시저장본을 에디터에 띄운 상태인지(=임시저장본을 보는 중) 추적
  const [draftResumed, setDraftResumed] = useState(false);
  // 에디터 확인 모달 — 저장 안 된 변경을 잃을 수 있는 동작(새 TIL/임시저장 불러오기/다른 TIL 수정) 공용.
  // null 이면 닫힘, { tag, icon, title, description, confirmLabel, onConfirm } 객체면 노출.
  const [confirmAction, setConfirmAction] = useState(null);

  // "더 보기" 비동기 응답이 도착했을 때 화분이 바뀌었는지 검사하기 위한 참조
  const selectedPotIdRef = useRef(selectedPotId);
  useEffect(() => { selectedPotIdRef.current = selectedPotId; }, [selectedPotId]);

  // 임시저장본을 보는 중인지 — 발행 TIL 편집 중(currentTilId 존재)이면 아님
  const draftActive = draftResumed && currentTilId == null;

  // 본문 글자 수 추적 (예상 경험치 계산용)
  useEffect(() => {
    if (!editor) {
      setContentLength(0);
      return;
    }
    const updateContentLength = () => {
      setContentLength(editor.getText().replace(/\s/g, '').length);
    };
    updateContentLength();
    editor.on('update', updateContentLength);
    return () => {
      editor.off('update', updateContentLength);
    };
  }, [editor]);

  // 선택된 화분의 TIL 목록 로딩 (첫 페이지)
  useEffect(() => {
    if (!selectedPotId) {
      setTils([]);
      setTilTotalCount(0);
      setTilPage(0);
      return;
    }
    let active = true;
    setTilsLoading(true);
    getMyTils({ potId: selectedPotId, page: 0, size: TIL_PAGE_SIZE, sort: 'latest' })
      .then((page) => {
        if (!active) return;
        const content = Array.isArray(page?.content) ? page.content : [];
        setTils(content.map(mapTil));
        setTilTotalCount(page?.totalElements ?? content.length);
        setTilPage(0);
      })
      .catch(() => { if (active) { setTils([]); setTilTotalCount(0); setTilPage(0); } })
      .finally(() => { if (active) setTilsLoading(false); });
    return () => { active = false; };
  }, [selectedPotId]);

  // 선택된 화분의 임시저장본 로딩 (자동저장 성공 시점에도 갱신)
  useEffect(() => {
    if (!selectedPotId) {
      setDraft(null);
      return;
    }
    let active = true;
    getDraft(selectedPotId)
      .then((d) => { if (active) setDraft(d); })
      .catch(() => { if (active) setDraft(null); });
    return () => { active = false; };
  }, [selectedPotId, draftSavedAt]);

  // 새 TIL 시작 실행 — 에디터 비우고 신규 작성 상태로.
  const proceedNewTil = () => {
    playSfx('confirm');
    startNewTil();
    onNewTil?.();
    setDraftResumed(false);
  };

  // "새 TIL 작성" → 작성 중 내용이 있거나 이 화분에 임시저장본이 있으면 확인 모달, 없으면 바로 시작.
  const handleNewTil = () => {
    const hasContent = (editor?.getText().trim().length ?? 0) > 0;
    // 이 화분에 임시저장본이 있으면, 에디터가 비어 있어도 새 TIL을 시작해 한 글자라도 쓰면
    // 그 임시저장본이 덮어써져 사라질 수 있다. 그래서 임시저장본이 있으면 항상 경고한다.
    // (작성 모드에서 내용이 있을 때도 동일하게 보호한다.)
    const hasDraft = draft != null;
    if (hasDraft || (hasContent && (dirty || currentTilId == null))) {
      setConfirmAction({
        icon: 'plus',
        tag: '새 TIL',
        title: hasDraft ? '임시저장된 글이 있어요' : '작성 중인 글을 비울까요?',
        description: hasDraft
          ? <>이 화분에 임시저장된 글이 있어요.<br />새 TIL을 시작하면 덮어쓸 수 있어요.</>
          : <>지금 작성 중인 글이 사라져요.<br />새 TIL을 시작할까요?</>,
        confirmLabel: '새로 작성',
        onConfirm: proceedNewTil,
      });
      return;
    }
    proceedNewTil();
  };

  // 임시저장본 "이어쓰기" 실행 — 에디터에 적용 + 수정 모드 해제
  const proceedResumeDraft = () => {
    playSfx('nav');
    resumeDraft(draft);
    onResumeDraft?.(selectedPotId);
    setDraftResumed(true);
  };

  // 임시저장본 "이어쓰기" → 수정 중 변경이 있으면 확인 모달
  const handleResumeDraft = () => {
    if (currentTilId && dirty) {
      setConfirmAction({
        icon: 'book',
        tag: '임시저장',
        title: '임시저장본을 불러올까요?',
        description: <>수정 중인 변경 사항은 사라져요.<br />임시저장본으로 이동할까요?</>,
        confirmLabel: '이어쓰기',
        onConfirm: proceedResumeDraft,
      });
      return;
    }
    proceedResumeDraft();
  };

  // TIL 수정 진입 실행
  const proceedEdit = async (til) => {
    playSfx('nav');
    setDraftResumed(false);
    try {
      const d = await getTil(til.id);
      onEditTil?.({ ...d, id: d.tilId, potId: d.potId ?? til.potId });
    } catch {
      onEditTil?.({ ...til });
    }
  };

  // TIL 클릭 → 수정 모드 진입. 수정 중 저장 안 된 변경이 있으면 확인 모달.
  const handleEdit = (til) => {
    if (currentTilId && String(currentTilId) !== String(til.id) && dirty) {
      setConfirmAction({
        icon: 'gear',
        tag: '수정',
        title: '다른 TIL로 이동할까요?',
        description: <>저장하지 않은 변경 사항은 사라져요.<br />선택한 TIL을 수정할까요?</>,
        confirmLabel: '이동',
        onConfirm: () => proceedEdit(til),
      });
      return;
    }
    proceedEdit(til);
  };

  // "더 보기" → 다음 페이지를 불러와 목록 끝에 이어 붙임
  const handleLoadMore = async () => {
    if (!selectedPotId || tilsLoadingMore) return;
    const potId = selectedPotId;
    const nextPage = tilPage + 1;
    setTilsLoadingMore(true);
    try {
      const page = await getMyTils({ potId, page: nextPage, size: TIL_PAGE_SIZE, sort: 'latest' });
      if (selectedPotIdRef.current !== potId) return; // 응답 도착 전 화분이 바뀌면 폐기
      const content = Array.isArray(page?.content) ? page.content : [];
      setTils((prev) => [...prev, ...content.map(mapTil)]);
      if (typeof page?.totalElements === 'number') setTilTotalCount(page.totalElements);
      setTilPage(nextPage);
    } catch {
      /* noop — 다음 페이지 로딩 실패 시 조용히 무시 */
    } finally {
      setTilsLoadingMore(false);
    }
  };

  return (
    <aside className="rt-app rt-app-editor rt-monitor-slot">
      {/* 모니터 디바이스 — 고정 오버레이라 여닫아도 에디터 인셋이 안 변함(본문 떨림 없음).
          좌측 Game Boy 와 동일한 슬라이드(translateX)·색·입체. 내부 기능은 불변. */}
      <div
        className="rt-monitor-device"
        style={{
          transform: open ? 'none' : `translateX(${SLIDE_OUT}px)`,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'transform 0.52s cubic-bezier(0.7, 0, 0.18, 1), opacity 0.4s ease',
        }}
        aria-hidden={!open}
      >
        {/* 세로형 토글 — 모니터 왼쪽 모서리에 박힘(좌측 .side-toggle 차용) */}
        <button
          type="button"
          onClick={() => { playSfx('nav'); onToggle?.(); }}
          aria-expanded={open}
          aria-label="사이드 패널 접기"
          className="rt-monitor-handle"
        >
          <span className="rt-mh-grip" aria-hidden="true" />
          <span className="rt-mh-chevron" aria-hidden="true" />
          <span className="rt-mh-cap" aria-hidden="true">패널</span>
        </button>

        {/* 모니터 본체 — 크림 플라스틱 셸(다층 입체) */}
        <div className="rt-monitor-body">
          {/* 회청색 베젤 — 좌측과 동일한 색 4겹 구조(셸→베젤→검은프레임→스크린) */}
          <div className="rt-monitor-bezel">
            {/* 베젤 상단 — 전원 LED + 캡션 */}
            <div className="rt-monitor-top">
              <span className="rt-monitor-led" aria-hidden="true" />
              <span className="rt-monitor-cap">Rootin · Grow Display</span>
            </div>

            {/* 스크린 — 검은 프레임 안에 밝은 콘텐츠 + CRT 오버레이 */}
            <div className="rt-monitor-screen">
          <div className="rt-monitor-content scrollbar-subtle">
        <motion.div
          className="flex flex-col gap-3.5 p-4 pb-12"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* 새 TIL 작성 — 에디터를 비우고 새 글 시작 */}
          <motion.button
            type="button"
            onClick={handleNewTil}
            variants={sectionVariants}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.99 }}
            className="flex w-full items-center justify-center gap-1.5 rounded-[var(--r-chip)] border-2 border-[var(--leaf)] px-4 py-2.5 text-sm font-semibold text-[color:var(--paper-card)] transition-[transform,box-shadow] duration-150"
            style={{ background: 'var(--leaf)', boxShadow: '2px 2px 0 0 var(--leaf-2)' }}
          >
            <Plus className="size-4" />
            새 TIL 작성
          </motion.button>

          {/* ① 저장할 화분 선택 */}
          <PanelCard className="p-4">
            <div className="mb-2 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[color:var(--leaf-2)]">
              <Sprout className="size-3.5 text-[var(--leaf-2)]" />
              저장할 화분
            </div>
            <Select value={selectedPotId ?? undefined} onValueChange={(v) => { playSfx('toggle'); setSelectedPotId(v); setDraftResumed(false); }}>
              <SelectTrigger
                aria-label="화분 선택"
                className="h-11 w-full gap-2 rounded-[var(--r-chip)] border-2 border-[var(--leaf)] bg-[var(--paper-card)] px-3.5 text-sm text-[color:var(--leaf)] shadow-[2px_2px_0_0_var(--leaf)] transition-[transform,box-shadow] hover:-translate-x-px hover:-translate-y-px hover:shadow-[3px_3px_0_0_var(--leaf)] data-[state=open]:shadow-[3px_3px_0_0_var(--leaf)]"
                disabled={potsLoading}
              >
                <SelectValue placeholder={potsLoading ? '불러오는 중…' : '화분을 선택하세요'} />
              </SelectTrigger>
              <SelectContent className="rt-pop">
                {pots.length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">화분이 없습니다</div>
                ) : (
                  pots.map((pot) => (
                    <SelectItem key={pot.id} value={String(pot.id)}>{pot.title}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </PanelCard>

          {/* ② 지금 키우는 식물 + 경험치 + 예상 XP */}
          <div className="guide-editor-plant-status">
            <PlantHeroCard
              dashboard={selectedPotDashboard}
              loading={selectedPotDashboardLoading}
              contentLength={contentLength}
            />
          </div>

          {/* ③ 이 화분의 TIL 목록 + 임시저장본 */}
          <PanelCard className="guide-editor-history overflow-hidden">
            <div className="flex items-center justify-between px-3 pb-2.5 pt-4">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-[color:var(--leaf)]">
                <FileText className="size-4 text-[var(--leaf-2)]" />
                이 화분의 TIL
              </div>
              {selectedPotId && !tilsLoading && (
                <span className="rounded-[var(--r-chip)] bg-[var(--paper-warm)] px-2 py-0.5 text-[11px] text-[color:var(--muted-2)]" style={{ fontFamily: 'var(--font-mono)' }}>
                  {tilTotalCount}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2 px-3 pb-4">
              {/* 임시저장본 (발행 전) — 클릭 시 이어쓰기. 보는 중이면 활성 표시 */}
              {selectedPotId && draft && (
                <motion.button
                  type="button"
                  onClick={handleResumeDraft}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.99 }}
                  className="group relative block w-full overflow-hidden rounded-[var(--r-chip)] border-2 px-3 py-2.5 text-left transition-[transform,box-shadow] duration-200"
                  style={{
                    background: draftActive ? 'var(--amber-soft)' : 'color-mix(in oklch, var(--amber-soft) 55%, var(--paper-card))',
                    borderColor: 'var(--amber)',
                    boxShadow: draftActive ? '3px 3px 0 0 var(--amber)' : '2px 2px 0 0 var(--amber)',
                  }}
                >
                  {draftActive && (
                    <motion.span
                      initial={{ opacity: 0, scaleY: 0.3 }}
                      animate={{ opacity: 1, scaleY: 1 }}
                      transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                      className="absolute inset-y-1.5 left-0 w-[3px] rounded-full"
                      style={{ background: 'linear-gradient(180deg, var(--amber) 0%, color-mix(in oklch, var(--amber) 65%, white) 100%)' }}
                    />
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: '#9a7322' }}>
                      <Pencil className="size-3" />
                      임시저장 · 발행 전
                    </span>
                    {draftActive ? (
                      <EditingBadge label="이어쓰는 중" tone="amber" />
                    ) : (
                      <span className="text-[11px] text-[color:var(--muted-2)] transition-transform group-hover:translate-x-0.5">이어쓰기 →</span>
                    )}
                  </div>
                  <div className="mt-1 line-clamp-2 text-[13px] font-medium leading-snug text-[color:var(--leaf)]">
                    {draft.title?.trim() || '(제목 없음)'}
                  </div>
                </motion.button>
              )}

              {!selectedPotId ? (
                <div className="rounded-[var(--r-chip)] border-2 border-dashed border-[var(--line-strong)] px-3 py-4 text-center text-xs text-[color:var(--muted-2)]">
                  화분을 먼저 선택하세요.
                </div>
              ) : tilsLoading ? (
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-14 w-full rounded-xl" />
                  <Skeleton className="h-14 w-full rounded-xl" />
                  <Skeleton className="h-14 w-full rounded-xl" />
                </div>
              ) : tils.length === 0 ? (
                <div className="rounded-[var(--r-chip)] border-2 border-dashed border-[var(--line-strong)] px-3 py-4 text-center text-xs text-[color:var(--muted-2)]">
                  아직 이 화분에 발행된 TIL이 없어요.
                </div>
              ) : (
                <div className="scrollbar-subtle flex max-h-[440px] flex-col gap-2 overflow-y-auto pr-0.5">
                  {tils.map((t, index) => {
                    const isActive = currentTilId != null && String(t.id) === String(currentTilId);
                    return (
                      <motion.button
                        key={t.id}
                        type="button"
                        onClick={() => handleEdit(t)}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index * 0.02, 0.2), type: 'spring', stiffness: 360, damping: 28 }}
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.99 }}
                        className={cn(
                          'relative w-full shrink-0 overflow-hidden rounded-[var(--r-chip)] border-2 px-3 py-2.5 text-left transition-[transform,box-shadow] duration-200',
                          isActive
                            ? 'border-[var(--leaf)] bg-[var(--paper-warm)] shadow-[3px_3px_0_0_var(--leaf)]'
                            : 'border-[var(--line-strong)] bg-[var(--paper-card)] shadow-[2px_2px_0_0_var(--line-strong)] hover:border-[var(--leaf-2)] hover:shadow-[3px_3px_0_0_var(--leaf-2)]',
                        )}
                      >
                        {/* 활성 항목 좌측 액센트 레일 — 활성화 시 부드럽게 펼쳐짐 */}
                        {isActive && (
                          <motion.span
                            initial={{ opacity: 0, scaleY: 0.3 }}
                            animate={{ opacity: 1, scaleY: 1 }}
                            transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                            className="absolute inset-y-1.5 left-0 w-[3px] rounded-full"
                            style={{ background: 'linear-gradient(180deg, var(--leaf) 0%, var(--leaf-3) 100%)' }}
                          />
                        )}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 line-clamp-2 text-[13px] font-medium leading-snug text-[color:var(--leaf)]">
                            {t.title || '(제목 없음)'}
                          </div>
                          <div className="mt-px shrink-0 text-[11px] text-[color:var(--muted-2)]" style={{ fontFamily: 'var(--font-mono)' }}>{t.date}</div>
                        </div>
                        {(t.tags.length > 0 || isActive) && (
                          <div className="mt-1.5 flex items-center justify-between gap-2">
                            <div className="flex min-w-0 flex-wrap gap-1">
                              {t.tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="rounded-[3px] bg-[var(--paper-2)] px-1.5 py-px text-[10.5px]" style={{ color: 'var(--leaf-2)' }}>#{tag}</span>
                              ))}
                            </div>
                            {isActive && <EditingBadge label="편집 중" tone="moss" />}
                          </div>
                        )}
                      </motion.button>
                    );
                  })}

                  {tils.length < tilTotalCount && (
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      disabled={tilsLoadingMore}
                      className="mt-0.5 flex shrink-0 items-center justify-center gap-1.5 rounded-[var(--r-chip)] border-2 border-[var(--line-strong)] bg-[var(--paper-card)] py-2 text-[12px] font-medium text-[color:var(--muted-2)] transition-colors hover:border-[var(--leaf-2)] hover:text-[color:var(--leaf)] disabled:opacity-60"
                    >
                      {tilsLoadingMore ? (
                        <><Loader2 className="size-3.5 animate-spin" /> 불러오는 중…</>
                      ) : (
                        <><ChevronDown className="size-3.5" /> 더 보기 ({tilTotalCount - tils.length}개)</>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </PanelCard>

          {/* ④ 경험치 가중치 팁 */}
          <PanelCard className="p-3.5">
            <div className="flex gap-2.5">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-[var(--r-chip)]" style={{ background: 'color-mix(in oklch, var(--leaf-3) 30%, var(--paper-card))', color: 'var(--leaf-2)' }}>
                <Lightbulb className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[color:var(--leaf)]">경험치 가중치</div>
                <div className="mt-0.5 text-[11.5px] leading-relaxed text-[color:var(--muted-2)]">
                  글자수 · 연속 작성일에 따라 식물에게 가는 물의 양이 달라져요. 짧아도 매일 쓰는 게 가장 강해요.
                </div>
              </div>
            </div>
          </PanelCard>
        </motion.div>
          </div>

          {/* CRT 오버레이 — 클릭/스크롤 통과(pointer-events:none) */}
          <span className="rt-monitor-fx rt-monitor-scan" aria-hidden="true" />
          <span className="rt-monitor-fx rt-monitor-glass" aria-hidden="true" />
          <span className="rt-monitor-fx rt-monitor-vignette" aria-hidden="true" />
            </div>
          </div>

          {/* 브랜드 + 통풍구 (크림 셸 위) */}
          <div className="rt-monitor-brandrow" aria-hidden="true">
            <span className="rt-monitor-brand">ROOTIN<i>™</i></span>
            <span className="rt-monitor-vent" />
          </div>
        </div>
      </div>

      {/* 접힘 미니 독 — 좌측 Game Boy Micro 차용. 새 TIL + 식물/레벨/연속일 요약 + 펼치기 */}
      <MiniDock dashboard={selectedPotDashboard} open={open} onToggle={onToggle} onNewTil={handleNewTil} />

      {confirmAction && (
        <EditorConfirmModal
          icon={confirmAction.icon}
          tag={confirmAction.tag}
          title={confirmAction.title}
          description={confirmAction.description}
          confirmLabel={confirmAction.confirmLabel}
          onConfirm={() => { const run = confirmAction.onConfirm; setConfirmAction(null); run(); }}
          onClose={() => setConfirmAction(null)}
        />
      )}
    </aside>
  );
}

function MiniDock({ dashboard, open, onToggle, onNewTil }) {
  const hasData = !!dashboard;
  const growthStage = dashboard?.plant?.growthStage ?? 'SEED';
  const level = dashboard?.level ?? null;
  const streak = Math.max(0, Number(dashboard?.streakDays) || 0);
  const progress = Math.min(100, Math.max(0, Math.round(dashboard?.progressPercentage ?? 0)));
  const species = inferSpecies(dashboard?.plant?.name ?? '기본 씨앗');
  const stage = GROWTH_STAGE_TO_PIXEL_STAGE[growthStage] ?? 'seed';
  const stageLabel = GROWTH_STAGE_LABEL[growthStage] ?? '씨앗';

  return (
    <div className="rt-monitor-dock" data-shown={!open || undefined} aria-hidden={open}>
      <div className="rt-mdock">
        {/* 새 TIL 작성 — 접힌 상태에서도 바로 새 글 시작 */}
        <button type="button" className="rt-mdock-new" aria-label="새 TIL 작성" onClick={() => onNewTil?.()}>
          <Plus className="size-4" />
          새 TIL
        </button>
        {hasData && <span className="rt-mdock-title">{dashboard.title}</span>}
        <div className="rt-mdock-screen">
          <div className="rt-mdock-lcd">
            {hasData
              ? <PixelPlant species={species} stage={stage} size={40} />
              : <span style={{ fontSize: 28 }}>🌱</span>}
          </div>
        </div>
        <span className="rt-mdock-lv">Lv.{level ?? '–'}</span>
        <span className="rt-mdock-stage">{hasData ? stageLabel : '화분 선택'}</span>
        {hasData && (
          <div className="rt-mdock-exp" role="img" aria-label={`경험치 ${progress}%`}>
            <div className="rt-mdock-exp-fill" style={{ width: `${progress}%` }} />
          </div>
        )}
        <div className="rt-mdock-stats">
          <span className="rt-mdock-stat"><Flame className="size-3" style={{ color: 'var(--amber)' }} />{streak}</span>
          <span className="rt-mdock-stat"><Sparkles className="size-3" style={{ color: 'var(--leaf-2)' }} />{progress}%</span>
        </div>
        <button
          type="button"
          className="rt-mdock-expand"
          aria-label="사이드 패널 펼치기"
          onClick={() => { playSfx('nav'); onToggle?.(); }}
        >
          <span className="rt-mdock-chev" aria-hidden="true" />
          <span className="rt-mdock-expand-cap">펼치기</span>
        </button>
      </div>
    </div>
  );
}

function StatCell({ label, value, divider }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-1', divider && 'border-x-2 border-[var(--line-strong)]')}>
      <div className="text-[13px] font-bold text-[color:var(--leaf)]">{value}</div>
      <div className="mt-0.5 text-[10px] text-[color:var(--muted-2)]">{label}</div>
    </div>
  );
}

function PlantHeroCard({ dashboard, loading, contentLength }) {
  const reduceMotion = useReducedMotion();
  const floatProps = reduceMotion
    ? {}
    : { animate: { y: [0, -5, 0] }, transition: { duration: 4.2, repeat: Infinity, ease: 'easeInOut' } };

  if (loading) {
    return (
      <PanelCard className="overflow-hidden">
        <div className="h-16" style={{ background: 'linear-gradient(180deg, var(--paper-warm), var(--paper-2))', boxShadow: 'inset 0 0 0 1px var(--line)' }} />
        <div className="-mt-8 px-5 pb-5">
          <Skeleton className="mx-auto size-20 rounded-2xl" />
          <Skeleton className="mx-auto mt-3 h-3.5 w-2/3 rounded-full" />
          <Skeleton className="mt-4 h-2 w-full rounded-full" />
          <Skeleton className="mt-4 h-12 w-full rounded-xl" />
        </div>
      </PanelCard>
    );
  }

  if (!dashboard) {
    return (
      <PanelCard className="overflow-hidden">
        <div className="h-16" style={{ background: 'linear-gradient(180deg, var(--paper-warm), var(--paper-2))', boxShadow: 'inset 0 0 0 1px var(--line)' }} />
        <div className="-mt-8 px-5 pb-5 text-center">
          <div className="mx-auto flex size-20 items-center justify-center rounded-[var(--r-card)] border-4 border-[var(--paper-card)] bg-[var(--paper-2)] text-3xl shadow-[2px_2px_0_0_var(--line-strong)]">🌱</div>
          <div className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
            화분을 선택하면 현재 식물과<br />이번 글의 예상 경험치를 볼 수 있어요.
          </div>
        </div>
      </PanelCard>
    );
  }

  const plantName = dashboard.plant?.name ?? '기본 씨앗';
  const species = inferSpecies(plantName);
  const growthStage = dashboard.plant?.growthStage ?? 'SEED';
  const stage = GROWTH_STAGE_TO_PIXEL_STAGE[growthStage] ?? 'seed';
  const stageLabel = GROWTH_STAGE_LABEL[growthStage] ?? '씨앗';
  const stageName = PIXEL_SPECIES[species]?.stages?.[stage]?.name ?? plantName;
  const progress = Math.min(100, Math.max(0, Math.round(dashboard.progressPercentage ?? 0)));
  const estimatedExp = calculateEstimatedExp(contentLength, dashboard.streakDays ?? 0);
  const currentExp = Math.max(0, Number(dashboard.currentLevelExp) || 0);
  const nextExp = Math.max(1, Number(dashboard.nextLevelExpRequired) || 100);
  const level = dashboard.level ?? 1;
  const streakDays = Math.max(0, Number(dashboard.streakDays) || 0);

  return (
    <PanelCard className="overflow-hidden">
      {/* 그라데이션 헤더 + 레벨 배지 */}
      <div className="relative h-16" style={{ background: 'linear-gradient(180deg, var(--paper-warm), var(--paper-2))', boxShadow: 'inset 0 0 0 1px var(--line)' }}>
        <div className="rt-badge rt-badge--leaf absolute right-3 top-3 font-bold">
          Lv.{level}
        </div>
      </div>

      {/* relative z-10 — relative 헤더가 static 본문보다 늦게(위에) 그려져 아바타 윗부분을 덮는 것 방지 */}
      <div className="relative z-10 -mt-8 px-5 pb-5">
        {/* 식물 아바타 (헤더 위로 겹침 + 부유 모션) */}
        <motion.div
          {...floatProps}
          className="mx-auto flex size-20 items-center justify-center rounded-[var(--r-card)] border-4 border-[var(--paper-card)] bg-[var(--paper-2)] shadow-[2px_2px_0_0_var(--line-strong)]"
        >
          <PixelPlant species={species} stage={stage} size={56} glow={species === 'moonlight'} />
        </motion.div>

        <div className="mt-2.5 text-center">
          <div className="truncate text-sm font-bold text-[color:var(--leaf)]">
            {dashboard.title}
          </div>
          <div className="mt-0.5 text-[11.5px] text-[color:var(--muted-2)]">
            {stageName} · {stageLabel} 중
          </div>
        </div>

        {/* EXP 프로그래스바 — 픽셀 LCD 바 */}
        <div className="mt-3.5">
          <div className="mb-1 flex items-center justify-between text-[10.5px] text-[color:var(--muted-2)]" style={{ fontFamily: 'var(--font-mono)' }}>
            <span>EXP</span>
            <span>{currentExp} / {nextExp}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-[3px] bg-[var(--paper-2)] shadow-[inset_0_0_0_1px_var(--line-strong)]">
            <motion.div
              className="h-full"
              style={{ background: 'var(--leaf-2)', boxShadow: 'inset 0 0 0 1px rgba(20,40,12,.18)' }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>

        {/* 스탯 그리드 */}
        <div className="mt-3.5 grid grid-cols-3 rounded-[var(--r-chip)] border-2 border-[var(--line-strong)] bg-[var(--paper-warm)] py-2.5">
          <StatCell label="레벨" value={`Lv.${level}`} />
          <StatCell label="연속" value={<span className="inline-flex items-center gap-0.5"><Flame className="size-3" style={{ color: 'var(--amber)' }} />{streakDays}일</span>} divider />
          <StatCell label="진척도" value={`${progress}%`} />
        </div>

        {/* 이번 글 예상 경험치 */}
        <div className="mt-3 flex items-center justify-center gap-1.5 rounded-[var(--r-chip)] px-3 py-2 text-[12px] font-semibold" style={{ background: 'var(--amber-soft)', color: '#9a7322' }}>
          <Sparkles className="size-3.5" />
          이번 글로 약 +{estimatedExp} XP
        </div>
      </div>
    </PanelCard>
  );
}
