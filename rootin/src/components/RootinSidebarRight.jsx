import { useEffect, useState } from 'react';
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
import { Sprout, FileText, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import { getMyTils, getTil, getDraft } from '@/api/til.js';
import { cn } from '@/lib/utils';

const PANEL_WIDTH = 340;

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

function inferSpecies(plantName = '') {
  if (plantName.includes('달빛')) return 'moonlight';
  if (plantName.includes('버섯')) return 'mushroom';
  return 'seed';
}

function calculateEstimatedExp(contentLength, streakDays) {
  if (contentLength <= 0) return 0;
  const baseExp = Math.min(contentLength * 0.2, 300);
  const multiplier = 1 + Math.min(Math.max(streakDays, 0) * 0.05, 0.5);
  return Math.floor(baseExp * multiplier);
}

function ProgressBar({ value }) {
  const safeValue = Math.min(1, Math.max(0, Number(value) || 0));
  return (
    <div style={{ width: '100%', height: 6, background: 'var(--rule)', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ width: `${safeValue * 100}%`, height: '100%', background: 'var(--moss)', borderRadius: 3, transition: 'width 320ms ease-out' }} />
    </div>
  );
}

function formatTilDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
}

export function RootinSidebarRight({ onEditTil, onResumeDraft, open = true, onToggle }) {
  const {
    editor,
    selectedPotId, setSelectedPotId, pots, potsLoading,
    currentTilId, dirty, draftSavedAt, resumeDraft,
    selectedPotDashboard, selectedPotDashboardLoading,
  } = useTilEditor();

  const [tils, setTils] = useState([]);
  const [tilsLoading, setTilsLoading] = useState(false);
  const [tilTotalCount, setTilTotalCount] = useState(0);
  const [draft, setDraft] = useState(null);
  const [contentLength, setContentLength] = useState(0);

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

  // 선택된 화분의 TIL 목록 로딩
  useEffect(() => {
    if (!selectedPotId) {
      setTils([]);
      setTilTotalCount(0);
      return;
    }
    let active = true;
    setTilsLoading(true);
    getMyTils({ potId: selectedPotId, page: 0, size: 20, sort: 'latest' })
      .then((page) => {
        if (!active) return;
        const content = Array.isArray(page?.content) ? page.content : [];
        setTils(content.map((t) => ({
          id: t.tilId,
          title: t.title,
          date: formatTilDate(t.publishedAt ?? t.createdAt),
          tags: Array.isArray(t.tags) ? t.tags : [],
          potId: t.potId,
        })));
        setTilTotalCount(page?.totalElements ?? content.length);
      })
      .catch(() => { if (active) { setTils([]); setTilTotalCount(0); } })
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

  // 임시저장본 "이어쓰기" → 에디터에 적용 + 수정 모드 해제
  const handleResumeDraft = () => {
    if (currentTilId && dirty) {
      if (!window.confirm('수정 중인 변경 사항이 사라질 수 있어요. 임시저장본으로 이동할까요?')) return;
    }
    resumeDraft(draft);
    onResumeDraft?.(selectedPotId);
  };

  // TIL 클릭 → 수정 모드 진입. 수정 중 저장 안 된 변경이 있으면 확인.
  const handleEdit = async (til) => {
    if (currentTilId && String(currentTilId) !== String(til.id) && dirty) {
      if (!window.confirm('저장하지 않은 변경 사항이 사라질 수 있어요. 이동할까요?')) return;
    }
    try {
      const d = await getTil(til.id);
      onEditTil?.({ ...d, id: d.tilId, potId: d.potId ?? til.potId });
    } catch {
      onEditTil?.({ ...til });
    }
  };

  return (
    <aside
      className="relative shrink-0 overflow-hidden transition-[width] duration-300 ease-out"
      style={{ width: open ? PANEL_WIDTH : 0 }}
      aria-hidden={!open}
    >
      {/* pull-tab — 화면 오른쪽 가장자리에 고정, 접힘/펼침 토글 */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={open ? '사이드 패널 접기' : '사이드 패널 펼치기'}
        className="til-pulltab fixed top-1/2 z-40 flex h-16 w-6 -translate-y-1/2 items-center justify-center rounded-l-xl text-muted-foreground"
        style={{ right: open ? PANEL_WIDTH : 0, transition: 'right 300ms ease-out' }}
      >
        {open ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
      </button>

      {/* 패널 본문 */}
      <div
        className={cn(
          'rootin-island-right h-svh overflow-y-auto scrollbar-subtle border-l border-border/60 transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0',
        )}
        style={{ width: PANEL_WIDTH }}
      >
        <div className="flex flex-col gap-4 p-4 pb-10">
          {/* 저장할 화분 선택 */}
          <div className="til-island-card til-island-card-in p-4" style={{ animationDelay: '0ms' }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>저장할 화분</div>
            <Select value={selectedPotId ?? undefined} onValueChange={(v) => setSelectedPotId(v)}>
              <SelectTrigger
                aria-label="화분 선택"
                className="h-11 w-full gap-2 rounded-xl border-border bg-card px-3.5 text-sm transition-all hover:border-primary/40 hover:shadow-sm data-[state=open]:border-primary/50 data-[state=open]:shadow-sm"
                disabled={potsLoading}
              >
                <Sprout className="size-4 text-primary/70" />
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
          </div>

          {/* 선택된 화분 식물 상태 카드 */}
          <GrowingPlantCard
            dashboard={selectedPotDashboard}
            loading={selectedPotDashboardLoading}
            contentLength={contentLength}
          />

          {/* 이 화분의 TIL 목록 + 임시저장본 */}
          <div className="til-island-card til-island-card-in p-4" style={{ animationDelay: '120ms' }}>
            <div className="mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
                <FileText className="size-4" style={{ color: 'var(--moss-2)' }} />
                이 화분의 TIL
              </div>
              {selectedPotId && !tilsLoading && (
                <span className="text-[11px] text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>{tilTotalCount}개</span>
              )}
            </div>

            {/* 임시저장본 (발행 전) — 클릭 시 이어쓰기 */}
            {selectedPotId && draft && (
              <button
                type="button"
                onClick={handleResumeDraft}
                className="group mb-2 block w-full rounded-xl border px-3 py-2.5 text-left transition-all hover:-translate-y-px hover:shadow-sm"
                style={{ background: 'var(--amber-soft)', borderColor: 'var(--amber)' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: 'var(--amber)', fontFamily: 'var(--font-display)' }}>
                    <Pencil className="size-3" />
                    임시저장 · 발행 전
                  </span>
                  <span className="text-[11px] text-muted-foreground transition-transform group-hover:translate-x-0.5">이어쓰기 →</span>
                </div>
                <div className="mt-1 truncate text-[13px] font-medium text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
                  {draft.title?.trim() || '(제목 없음)'}
                </div>
              </button>
            )}

            {!selectedPotId ? (
              <div className="px-0.5 py-1 text-xs text-muted-foreground">화분을 먼저 선택하세요.</div>
            ) : tilsLoading ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ) : tils.length === 0 ? (
              <div className="px-0.5 py-1 text-xs text-muted-foreground">아직 이 화분에 발행된 TIL이 없어요.</div>
            ) : (
              <div className="scrollbar-subtle flex max-h-[360px] flex-col gap-2 overflow-y-auto">
                {tils.map((t) => {
                  const isActive = currentTilId != null && String(t.id) === String(currentTilId);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleEdit(t)}
                      className={cn(
                        'w-full rounded-xl border px-3 py-2.5 text-left transition-all hover:-translate-y-px',
                        isActive
                          ? 'border-primary bg-accent shadow-[inset_2.5px_0_0_var(--moss)]'
                          : 'border-border/60 bg-card hover:border-primary/30 hover:shadow-sm',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 truncate text-[13px] font-medium text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
                          {t.title || '(제목 없음)'}
                        </div>
                        <div className="shrink-0 text-[11px] text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>{t.date}</div>
                      </div>
                      {t.tags.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {t.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="rounded-md bg-secondary px-1.5 py-px text-[10.5px]" style={{ color: 'var(--moss-2)' }}>#{tag}</span>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="til-island-card til-island-card-in p-3.5 text-xs leading-relaxed text-muted-foreground" style={{ animationDelay: '180ms' }}>
            <div className="mb-1.5 text-xs font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>💡 경험치 가중치</div>
            글자수 · 연속 작성일에 따라 식물에게 가는 물의 양이 달라져요. 짧아도 매일 쓰는 게 가장 강해요.
          </div>
        </div>
      </div>
    </aside>
  );
}

function GrowingPlantCard({ dashboard, loading, contentLength }) {
  const cardStyle = {
    animationDelay: '60ms',
    background: 'linear-gradient(180deg, color-mix(in oklch, var(--leaf) 55%, var(--card)) 0%, var(--card) 100%)',
  };

  if (loading) {
    return (
      <div className="til-island-card til-island-card-in p-[18px]" style={cardStyle}>
        <div className="eyebrow text-center" style={{ color: 'var(--moss-2)' }}>지금 키우는 식물</div>
        <div className="mx-auto my-3 size-[76px] rounded-[14px]" style={{ background: 'var(--paper-2)' }} />
        <div className="mx-auto h-3 w-[70%] rounded-full" style={{ background: 'var(--paper-2)' }} />
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="til-island-card til-island-card-in p-[18px] text-center text-xs leading-relaxed text-muted-foreground" style={cardStyle}>
        <div className="eyebrow mb-2.5" style={{ color: 'var(--moss-2)' }}>지금 키우는 식물</div>
        화분을 선택하면 현재 식물과 이번 글의 예상 경험치를 볼 수 있어요.
      </div>
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

  return (
    <div className="til-island-card til-island-card-in p-[18px] text-center" style={cardStyle}>
      <div className="eyebrow" style={{ color: 'var(--moss-2)' }}>지금 키우는 식물</div>
      <div className="til-plant-float my-2 flex justify-center">
        <PixelPlant species={species} stage={stage} size={86} glow={species === 'moonlight'} />
      </div>
      <div className="text-sm font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
        {dashboard.title} · Lv.{dashboard.level} · {stageLabel} 중
      </div>
      <div className="mt-1 text-[11.5px] text-muted-foreground">
        {stageName}이 자라고 있어요
      </div>
      <div className="mt-3">
        <ProgressBar value={progress / 100} />
        <div className="mt-1.5 flex justify-between text-[10.5px] text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
          <span>{currentExp} / {nextExp} EXP</span>
          <span>진척도 {progress}%</span>
        </div>
      </div>
      <div className="mt-3 rounded-lg px-3 py-2 text-[11.5px]" style={{ background: 'rgba(255,255,255,0.6)', border: '0.5px solid var(--leaf)', color: 'var(--moss-2)' }}>
        ✨ 이번 글로 약 <b>+{estimatedExp} XP</b>
      </div>
    </div>
  );
}
