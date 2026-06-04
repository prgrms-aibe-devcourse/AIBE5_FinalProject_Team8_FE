import { useEffect, useState } from 'react';
import { Sidebar, SidebarContent } from "@/components/ui/sidebar";
import { useTilEditor } from '@/components/til/til-editor-context';
import { PixelPlant, PIXEL_SPECIES } from '@/pixel-plants.jsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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

function SectionHeader({ eyebrow, title, action }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="eyebrow">{eyebrow}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: 'var(--ink)' }}>{title}</div>
        {action}
      </div>
    </div>
  );
}

function TemplateButton({ name, desc, highlight, onApply, onDelete }) {
  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={onApply}
        style={{
          width: '100%',
          textAlign: 'left',
          padding: 12,
          paddingRight: onDelete ? 34 : 12,
          borderRadius: 10,
          background: highlight ? 'var(--paper-2)' : '#fff',
          border: '0.5px solid var(--rule)',
          cursor: 'pointer',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>{name}</div>
        {desc && <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 3 }}>{desc}</div>}
      </button>
      {onDelete && (
        <button
          type="button"
          aria-label={`${name} 템플릿 삭제`}
          onClick={onDelete}
          style={{
            position: 'absolute', top: 10, right: 10,
            width: 20, height: 20, borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--ink-3)', background: 'transparent', border: 'none', cursor: 'pointer',
            fontSize: 14, lineHeight: 1,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

export function RootinSidebarRight({ ...props }) {
  const {
    editor,
    applyTemplate,
    templates,
    saveCustomTemplate,
    deleteCustomTemplate,
    selectedPotDashboard,
    selectedPotDashboardLoading,
  } = useTilEditor();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [contentLength, setContentLength] = useState(0);

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

  // BM-06 템플릿 이용 — 본문에 내용이 있으면 덮어쓰기 확인
  const handleApply = (content) => {
    if (!editor) return;
    const hasContent = editor.getText().trim().length > 0;
    if (hasContent && !window.confirm('현재 작성 중인 본문을 템플릿 내용으로 덮어쓸까요?')) return;
    applyTemplate(content);
  };

  // BM-07 템플릿 제작 — 현재 본문을 새 템플릿으로 저장 (서버 연동)
  const handleSaveTemplate = async () => {
    const name = newName.trim();
    if (!name || saving) return;
    setSaving(true);
    try {
      await saveCustomTemplate(name);
      setNewName('');
      setDialogOpen(false);
    } catch {
      window.alert('템플릿 저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  // 템플릿 삭제 (서버 연동) — 기본 제공 템플릿은 삭제 불가
  const handleDeleteTemplate = (id) => {
    if (!window.confirm('이 템플릿을 삭제할까요?')) return;
    deleteCustomTemplate(id).catch(() => {
      window.alert('템플릿 삭제에 실패했습니다.');
    });
  };

  return (
    <Sidebar side="right" className="border-l border-border" {...props}>
      <SidebarContent className="p-5 flex flex-col gap-5">
        {/* Plant preview */}
        <GrowingPlantCard
          dashboard={selectedPotDashboard}
          loading={selectedPotDashboardLoading}
          contentLength={contentLength}
        />

        {/* Templates */}
        <div>
          <SectionHeader eyebrow="템플릿" title="빠른 시작" action={
            <button
              onClick={() => setDialogOpen(true)}
              style={{ fontSize: 11, color: 'var(--moss-2)', fontFamily: 'var(--font-display)', fontWeight: 500, cursor: 'pointer', background: 'transparent', border: 'none' }}
            >+ 새 템플릿</button>
          } />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {templates.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--ink-3)', padding: '4px 2px' }}>
                저장된 템플릿이 없습니다.
              </div>
            ) : (
              templates.map((t, i) => (
                <TemplateButton
                  key={t.id}
                  name={t.name}
                  desc={t.isDefault ? '기본 제공' : '내 템플릿'}
                  highlight={i === 0}
                  onApply={() => handleApply(t.content)}
                  onDelete={t.isDefault ? undefined : () => handleDeleteTemplate(t.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Tips */}
        <div style={{ padding: 14, background: 'var(--paper-2)', borderRadius: 10, fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.6 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--ink)', fontSize: 12, marginBottom: 6 }}>💡 경험치 가중치</div>
          글자수 · 연속 작성일에 따라 식물에게 가는 물의 양이 달라져요. 짧아도 매일 쓰는 게 가장 강해요.
        </div>
      </SidebarContent>

      {/* BM-07 새 템플릿 저장 다이얼로그 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 템플릿 저장</DialogTitle>
            <DialogDescription>
              현재 작성 중인 본문을 템플릿으로 저장합니다. 다음에 빠른 시작에서 불러올 수 있어요.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSaveTemplate();
              }
            }}
            placeholder="템플릿 이름"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>취소</Button>
            <Button onClick={handleSaveTemplate} disabled={!newName.trim() || saving}>{saving ? '저장 중…' : '저장'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
