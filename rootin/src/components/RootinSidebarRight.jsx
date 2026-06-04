import { useEffect, useState } from 'react';
import { Sidebar, SidebarContent } from "@/components/ui/sidebar";
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
import { Sprout, FileText, Pencil } from 'lucide-react';
import { getMyTils, getTil, getDraft } from '@/api/til.js';

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
      <div style={{ width: `${safeValue * 100}%`, height: '100%', background: 'var(--moss)', borderRadius: 3 }} />
    </div>
  );
}

function formatTilDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
}

export function RootinSidebarRight({ onEditTil, onResumeDraft, ...props }) {
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
    <Sidebar side="right" className="border-l border-border" {...props}>
      <SidebarContent className="p-5 flex flex-col gap-5">
        {/* 저장할 화분 선택 */}
        <div>
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

        {/* 선택된 화분 식물 상태 카드 (context의 대시보드 사용) */}
        <GrowingPlantCard
          dashboard={selectedPotDashboard}
          loading={selectedPotDashboardLoading}
          contentLength={contentLength}
        />

        {/* 이 화분의 TIL 목록 */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>
              <FileText className="size-4" style={{ color: 'var(--moss-2)' }} />
              이 화분의 TIL
            </div>
            {selectedPotId && !tilsLoading && (
              <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{tilTotalCount}개</span>
            )}
          </div>

          {/* 임시저장본 (발행 전) — 클릭 시 이어쓰기 */}
          {selectedPotId && draft && (
            <button
              type="button"
              onClick={handleResumeDraft}
              style={{
                width: '100%', textAlign: 'left', marginBottom: 8,
                padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                background: 'var(--amber-soft)', border: '1px solid var(--amber)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: 'var(--amber)', fontFamily: 'var(--font-display)' }}>
                  <Pencil className="size-3" />
                  임시저장 · 발행 전
                </span>
                <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>이어쓰기 →</span>
              </div>
              <div style={{ marginTop: 4, fontSize: 13, fontWeight: 500, color: 'var(--ink)', fontFamily: 'var(--font-display)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {draft.title?.trim() || '(제목 없음)'}
              </div>
            </button>
          )}

          {!selectedPotId ? (
            <div style={{ fontSize: 12, color: 'var(--ink-3)', padding: '4px 2px' }}>
              화분을 먼저 선택하세요.
            </div>
          ) : tilsLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Skeleton className="h-12 w-full rounded-[10px]" />
              <Skeleton className="h-12 w-full rounded-[10px]" />
              <Skeleton className="h-12 w-full rounded-[10px]" />
            </div>
          ) : tils.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--ink-3)', padding: '4px 2px' }}>
              아직 이 화분에 발행된 TIL이 없어요.
            </div>
          ) : (
            <div className="scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
              {tils.map((t) => {
                const isActive = currentTilId != null && String(t.id) === String(currentTilId);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleEdit(t)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderRadius: 10,
                      cursor: 'pointer',
                      background: isActive ? 'var(--leaf)' : '#fff',
                      border: isActive ? '1px solid var(--moss)' : '0.5px solid var(--rule)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ minWidth: 0, fontSize: 13, fontWeight: 500, color: 'var(--ink)', fontFamily: 'var(--font-display)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.title || '(제목 없음)'}
                      </div>
                      <div style={{ flexShrink: 0, fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{t.date}</div>
                    </div>
                    {t.tags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                        {t.tags.slice(0, 3).map((tag) => (
                          <span key={tag} style={{ fontSize: 10.5, color: 'var(--moss-2)', background: 'var(--paper-2)', borderRadius: 6, padding: '1px 6px' }}>#{tag}</span>
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
        <div style={{ padding: 14, background: 'var(--paper-2)', borderRadius: 10, fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.6 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--ink)', fontSize: 12, marginBottom: 6 }}>💡 경험치 가중치</div>
          글자수 · 연속 작성일에 따라 식물에게 가는 물의 양이 달라져요. 짧아도 매일 쓰는 게 가장 강해요.
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

function GrowingPlantCard({ dashboard, loading, contentLength }) {
  if (loading) {
    return (
      <div style={{
        padding: 18,
        background: 'linear-gradient(180deg, #ebf5ef 0%, #f5f7f5 100%)',
        borderRadius: 14,
        border: '0.5px solid var(--leaf)',
      }}>
        <div className="eyebrow" style={{ color: 'var(--moss-2)', textAlign: 'center' }}>지금 키우는 식물</div>
        <div style={{ margin: '16px auto 12px', width: 76, height: 76, borderRadius: 14, background: 'var(--paper-2)' }} />
        <div style={{ height: 12, width: '70%', margin: '0 auto', borderRadius: 999, background: 'var(--paper-2)' }} />
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div style={{
        padding: 18,
        background: 'linear-gradient(180deg, #ebf5ef 0%, #f5f7f5 100%)',
        borderRadius: 14,
        textAlign: 'center',
        border: '0.5px solid var(--leaf)',
        fontSize: 12,
        color: 'var(--ink-3)',
        lineHeight: 1.6,
      }}>
        <div className="eyebrow" style={{ color: 'var(--moss-2)', marginBottom: 10 }}>지금 키우는 식물</div>
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
    <div style={{
      padding: 18,
      background: 'linear-gradient(180deg, #ebf5ef 0%, #f5f7f5 100%)',
      borderRadius: 14,
      textAlign: 'center',
      border: '0.5px solid var(--leaf)',
    }}>
      <div className="eyebrow" style={{ color: 'var(--moss-2)' }}>지금 키우는 식물</div>
      <div style={{ margin: '14px 0 8px', display: 'flex', justifyContent: 'center' }}>
        <PixelPlant species={species} stage={stage} size={86} glow={species === 'moonlight'} />
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>
        {dashboard.title} · Lv.{dashboard.level} · {stageLabel} 중
      </div>
      <div style={{ marginTop: 4, fontSize: 11.5, color: 'var(--ink-3)' }}>
        {stageName}이 자라고 있어요
      </div>
      <div style={{ marginTop: 12 }}>
        <ProgressBar value={progress / 100} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10.5, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
          <span>{currentExp} / {nextExp} EXP</span>
          <span>진척도 {progress}%</span>
        </div>
      </div>
      <div style={{
        marginTop: 12, padding: '8px 12px',
        background: 'rgba(255,255,255,0.6)', border: '0.5px solid var(--leaf)',
        borderRadius: 8, fontSize: 11.5, color: 'var(--moss-2)',
      }}>
        ✨ 이번 글로 약 <b>+{estimatedExp} XP</b>
      </div>
    </div>
  );
}
