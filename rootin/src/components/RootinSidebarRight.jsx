import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTilEditor } from '@/components/til/til-editor-context';
import { PixelPlant, PIXEL_SPECIES } from '@/pixel-plants.jsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, ChevronDown, Sprout, FileText, Pencil, Lightbulb, Sparkles, Flame, Loader2, Plus } from 'lucide-react';
import { getMyTils, getTil, getDraft } from '@/api/til.js';
import { cn } from '@/lib/utils';

const PANEL_WIDTH = 344;

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

const PLANT_NAME_TO_SPECIES = {
  '기본 씨앗':  'seed',
  '버섯씨앗':   'mushroom',
  '선인장씨앗': 'cactus',
  '불꽃씨앗':   'fire',
  '얼음씨앗':   'ice',
  '달빛씨앗':   'moonlight',
  '번개씨앗':   'bolt',
  '흑장미씨앗': 'rose',
};

function inferSpecies(plantName = '') {
  return PLANT_NAME_TO_SPECIES[plantName] ?? 'seed';
}

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
        'rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-sm)]',
        className,
      )}
    >
      {children}
    </motion.section>
  );
}

// 현재 편집 대상임을 알리는 라이브 배지 (맥동하는 점 + 라벨)
function EditingBadge({ label, tone = 'moss' }) {
  const color = tone === 'amber' ? 'var(--amber)' : 'var(--moss-2)';
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

  // "새 TIL 작성" → 에디터 비우고 신규 작성 상태로. 작성 중 내용 있으면 확인.
  const handleNewTil = () => {
    const hasContent = (editor?.getText().trim().length ?? 0) > 0;
    if (dirty && hasContent) {
      if (!window.confirm('작성 중인 내용이 사라질 수 있어요. 새 TIL을 시작할까요?')) return;
    }
    startNewTil();
    onNewTil?.();
    setDraftResumed(false);
  };

  // 임시저장본 "이어쓰기" → 에디터에 적용 + 수정 모드 해제
  const handleResumeDraft = () => {
    if (currentTilId && dirty) {
      if (!window.confirm('수정 중인 변경 사항이 사라질 수 있어요. 임시저장본으로 이동할까요?')) return;
    }
    resumeDraft(draft);
    onResumeDraft?.(selectedPotId);
    setDraftResumed(true);
  };

  // TIL 클릭 → 수정 모드 진입. 수정 중 저장 안 된 변경이 있으면 확인.
  const handleEdit = async (til) => {
    if (currentTilId && String(currentTilId) !== String(til.id) && dirty) {
      if (!window.confirm('저장하지 않은 변경 사항이 사라질 수 있어요. 이동할까요?')) return;
    }
    setDraftResumed(false);
    try {
      const d = await getTil(til.id);
      onEditTil?.({ ...d, id: d.tilId, potId: d.potId ?? til.potId });
    } catch {
      onEditTil?.({ ...til });
    }
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
    <aside
      className="relative shrink-0 overflow-hidden transition-[width] duration-300 ease-out"
      style={{ width: open ? PANEL_WIDTH : 0 }}
    >
      {/* 가장자리 토글 — 접힘/펼침 (항상 접근 가능하도록 aria-hidden 밖에 둠) */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={open ? '사이드 패널 접기' : '사이드 패널 펼치기'}
        className="fixed top-1/2 z-40 flex h-14 w-7 -translate-y-1/2 items-center justify-center rounded-l-xl border border-r-0 border-border bg-card text-muted-foreground shadow-[var(--shadow-md)] transition-[right,box-shadow,color] duration-300 ease-out hover:text-primary hover:shadow-[var(--shadow-lg)]"
        style={{ right: open ? PANEL_WIDTH : 0 }}
      >
        <ChevronRight className={cn('size-4 transition-transform duration-300', open ? '' : 'rotate-180')} />
      </button>

      {/* 패널 본문 */}
      <div
        className={cn(
          'h-svh overflow-y-auto scrollbar-subtle border-l border-border/60 bg-[var(--paper-2)] transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0',
        )}
        style={{ width: PANEL_WIDTH }}
        aria-hidden={!open}
      >
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
            className="flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-[var(--shadow-sm)] transition-shadow duration-200 hover:shadow-[var(--shadow-md)]"
            style={{ background: 'var(--grad-moss)', color: 'var(--primary-foreground)', fontFamily: 'var(--font-display)' }}
          >
            <Plus className="size-4" />
            새 TIL 작성
          </motion.button>

          {/* ① 저장할 화분 선택 */}
          <PanelCard className="p-4">
            <div className="mb-2 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground" style={{ fontFamily: 'var(--font-display)' }}>
              <Sprout className="size-3.5 text-primary" />
              저장할 화분
            </div>
            <Select value={selectedPotId ?? undefined} onValueChange={(v) => { setSelectedPotId(v); setDraftResumed(false); }}>
              <SelectTrigger
                aria-label="화분 선택"
                className="h-11 w-full gap-2 rounded-xl border-border bg-[var(--paper-2)] px-3.5 text-sm transition-all hover:border-primary/40 hover:bg-card data-[state=open]:border-primary/50 data-[state=open]:bg-card data-[state=open]:shadow-sm"
                disabled={potsLoading}
              >
                <SelectValue placeholder={potsLoading ? '불러오는 중…' : '화분을 선택하세요'} />
              </SelectTrigger>
              <SelectContent>
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
          <PlantHeroCard
            dashboard={selectedPotDashboard}
            loading={selectedPotDashboardLoading}
            contentLength={contentLength}
          />

          {/* ③ 이 화분의 TIL 목록 + 임시저장본 */}
          <PanelCard className="overflow-hidden">
            <div className="flex items-center justify-between px-4 pb-2.5 pt-4">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
                <FileText className="size-4 text-primary" />
                이 화분의 TIL
              </div>
              {selectedPotId && !tilsLoading && (
                <span className="rounded-full bg-[var(--paper-2)] px-2 py-0.5 text-[11px] text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                  {tilTotalCount}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2 px-4 pb-4">
              {/* 임시저장본 (발행 전) — 클릭 시 이어쓰기. 보는 중이면 활성 표시 */}
              {selectedPotId && draft && (
                <motion.button
                  type="button"
                  onClick={handleResumeDraft}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.99 }}
                  className={cn(
                    'group relative block w-full overflow-hidden rounded-xl border px-3 py-2.5 text-left transition-[background-color,border-color,box-shadow] duration-300',
                    draftActive ? 'shadow-[var(--shadow-md)]' : 'shadow-[var(--shadow-sm)]',
                  )}
                  style={{
                    background: draftActive
                      ? 'linear-gradient(135deg, color-mix(in oklch, var(--amber) 24%, var(--card)) 0%, color-mix(in oklch, var(--amber) 9%, var(--card)) 100%)'
                      : 'color-mix(in oklch, var(--amber) 14%, var(--card))',
                    borderColor: draftActive
                      ? 'color-mix(in oklch, var(--amber) 62%, transparent)'
                      : 'color-mix(in oklch, var(--amber) 45%, transparent)',
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
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: 'var(--amber)', fontFamily: 'var(--font-display)' }}>
                      <Pencil className="size-3" />
                      임시저장 · 발행 전
                    </span>
                    {draftActive ? (
                      <EditingBadge label="이어쓰는 중" tone="amber" />
                    ) : (
                      <span className="text-[11px] text-muted-foreground transition-transform group-hover:translate-x-0.5">이어쓰기 →</span>
                    )}
                  </div>
                  <div className="mt-1 truncate text-[13px] font-medium text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
                    {draft.title?.trim() || '(제목 없음)'}
                  </div>
                </motion.button>
              )}

              {!selectedPotId ? (
                <div className="rounded-xl border border-dashed border-border/70 px-3 py-4 text-center text-xs text-muted-foreground">
                  화분을 먼저 선택하세요.
                </div>
              ) : tilsLoading ? (
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-14 w-full rounded-xl" />
                  <Skeleton className="h-14 w-full rounded-xl" />
                  <Skeleton className="h-14 w-full rounded-xl" />
                </div>
              ) : tils.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/70 px-3 py-4 text-center text-xs text-muted-foreground">
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
                          'relative w-full shrink-0 overflow-hidden rounded-xl border px-3 py-2.5 text-left transition-[background-color,border-color,box-shadow] duration-300',
                          isActive
                            ? 'border-primary/45 shadow-[var(--shadow-md)]'
                            : 'border-border/60 bg-[var(--paper-2)] shadow-[var(--shadow-sm)] hover:border-primary/30 hover:bg-card',
                        )}
                        style={isActive ? { background: 'linear-gradient(135deg, color-mix(in oklch, var(--leaf) 72%, var(--card)) 0%, var(--card) 78%)' } : undefined}
                      >
                        {/* 활성 항목 좌측 액센트 레일 — 활성화 시 부드럽게 펼쳐짐 */}
                        {isActive && (
                          <motion.span
                            initial={{ opacity: 0, scaleY: 0.3 }}
                            animate={{ opacity: 1, scaleY: 1 }}
                            transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                            className="absolute inset-y-1.5 left-0 w-[3px] rounded-full"
                            style={{ background: 'linear-gradient(180deg, var(--moss) 0%, var(--sprout) 100%)' }}
                          />
                        )}
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 truncate text-[13px] font-medium text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
                            {t.title || '(제목 없음)'}
                          </div>
                          <div className="shrink-0 text-[11px] text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>{t.date}</div>
                        </div>
                        {(t.tags.length > 0 || isActive) && (
                          <div className="mt-1.5 flex items-center justify-between gap-2">
                            <div className="flex min-w-0 flex-wrap gap-1">
                              {t.tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="rounded-md bg-secondary px-1.5 py-px text-[10.5px]" style={{ color: 'var(--moss-2)' }}>#{tag}</span>
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
                      className="mt-0.5 flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-[var(--paper-2)] py-2 text-[12px] font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground disabled:opacity-60"
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
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg" style={{ background: 'color-mix(in oklch, var(--sprout) 20%, var(--card))', color: 'var(--moss-2)' }}>
                <Lightbulb className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>경험치 가중치</div>
                <div className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">
                  글자수 · 연속 작성일에 따라 식물에게 가는 물의 양이 달라져요. 짧아도 매일 쓰는 게 가장 강해요.
                </div>
              </div>
            </div>
          </PanelCard>
        </motion.div>
      </div>
    </aside>
  );
}

function StatCell({ label, value, divider }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-1', divider && 'border-x border-border/60')}>
      <div className="text-[13px] font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>{value}</div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">{label}</div>
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
        <div className="h-16" style={{ background: 'linear-gradient(135deg, color-mix(in oklch, var(--moss) 20%, var(--card)) 0%, color-mix(in oklch, var(--leaf) 62%, var(--card)) 100%)' }} />
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
        <div className="h-16" style={{ background: 'linear-gradient(135deg, color-mix(in oklch, var(--moss) 20%, var(--card)) 0%, color-mix(in oklch, var(--leaf) 62%, var(--card)) 100%)' }} />
        <div className="-mt-8 px-5 pb-5 text-center">
          <div className="mx-auto flex size-20 items-center justify-center rounded-2xl border-4 border-card bg-[var(--paper-2)] text-3xl shadow-sm">🌱</div>
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
      <div className="relative h-16" style={{ background: 'linear-gradient(135deg, color-mix(in oklch, var(--moss) 22%, var(--card)) 0%, color-mix(in oklch, var(--leaf) 62%, var(--card)) 100%)' }}>
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-card/85 px-2.5 py-1 text-[11px] font-bold shadow-sm backdrop-blur" style={{ color: 'var(--moss-2)', fontFamily: 'var(--font-display)' }}>
          Lv.{level}
        </div>
      </div>

      {/* relative z-10 — relative 헤더가 static 본문보다 늦게(위에) 그려져 아바타 윗부분을 덮는 것 방지 */}
      <div className="relative z-10 -mt-8 px-5 pb-5">
        {/* 식물 아바타 (헤더 위로 겹침 + 부유 모션) */}
        <motion.div
          {...floatProps}
          className="mx-auto flex size-20 items-center justify-center rounded-2xl border-4 border-card bg-[var(--paper-2)] shadow-sm"
        >
          <PixelPlant species={species} stage={stage} size={56} glow={species === 'moonlight'} />
        </motion.div>

        <div className="mt-2.5 text-center">
          <div className="truncate text-sm font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            {dashboard.title}
          </div>
          <div className="mt-0.5 text-[11.5px] text-muted-foreground">
            {stageName} · {stageLabel} 중
          </div>
        </div>

        {/* EXP 프로그래스바 */}
        <div className="mt-3.5">
          <div className="mb-1 flex items-center justify-between text-[10.5px] text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
            <span>EXP</span>
            <span>{currentExp} / {nextExp}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, var(--moss) 0%, var(--sprout) 100%)' }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>

        {/* 스탯 그리드 (ProfileCard 어휘) */}
        <div className="mt-3.5 grid grid-cols-3 rounded-xl border border-border/60 bg-[var(--paper-2)] py-2.5">
          <StatCell label="레벨" value={`Lv.${level}`} />
          <StatCell label="연속" value={<span className="inline-flex items-center gap-0.5"><Flame className="size-3" style={{ color: 'var(--amber)' }} />{streakDays}일</span>} divider />
          <StatCell label="진척도" value={`${progress}%`} />
        </div>

        {/* 이번 글 예상 경험치 */}
        <div className="mt-3 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-semibold" style={{ background: 'color-mix(in oklch, var(--sprout) 18%, var(--card))', color: 'var(--moss-2)' }}>
          <Sparkles className="size-3.5" />
          이번 글로 약 +{estimatedExp} XP
        </div>
      </div>
    </PanelCard>
  );
}
