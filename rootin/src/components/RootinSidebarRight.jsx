import React, { useState } from 'react';
import { Sidebar, SidebarContent } from "@/components/ui/sidebar";
import { Plant } from '@/plants.jsx';
import { useTilEditor } from '@/components/til/til-editor-context';
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

// 기본 제공 템플릿 — content는 에디터에 삽입될 HTML
const BUILTIN_TEMPLATES = [
  {
    id: 'b1',
    name: '오늘의 배움',
    desc: '새로 알게된 점과 적용할 점',
    content:
      '<h2>오늘 배운 것</h2><p></p><h2>왜 중요한가</h2><p></p><h2>다음에 적용할 점</h2><p></p>',
  },
  {
    id: 'b2',
    name: '트러블슈팅',
    desc: '문제 원인과 해결 과정 기록',
    content:
      '<h2>문제 상황</h2><p></p><h2>원인 분석</h2><p></p><h2>해결 과정</h2><p></p><h2>회고</h2><p></p>',
  },
  {
    id: 'b3',
    name: '알고리즘',
    desc: '접근 방식과 코드 설명',
    content:
      '<h2>문제</h2><p></p><h2>접근 방식</h2><p></p><h2>코드</h2><pre><code>// 여기에 코드</code></pre><h2>복잡도 · 회고</h2><p></p>',
  },
];

function ProgressBar({ value }) {
  return (
    <div style={{ width: '100%', height: 6, background: 'var(--rule)', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ width: `${value * 100}%`, height: '100%', background: 'var(--moss)', borderRadius: 3 }} />
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
  const xpGain = 120;
  const { editor, applyTemplate, customTemplates, saveCustomTemplate, deleteCustomTemplate } = useTilEditor();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');

  // BM-06 템플릿 이용 — 본문에 내용이 있으면 덮어쓰기 확인
  const handleApply = (content) => {
    if (!editor) return;
    const hasContent = editor.getText().trim().length > 0;
    if (hasContent && !window.confirm('현재 작성 중인 본문을 템플릿 내용으로 덮어쓸까요?')) return;
    applyTemplate(content);
  };

  // BM-07 템플릿 제작 — 현재 본문을 새 템플릿으로 저장
  const handleSaveTemplate = () => {
    const name = newName.trim();
    if (!name) return;
    saveCustomTemplate(name);
    setNewName('');
    setDialogOpen(false);
  };

  return (
    <Sidebar side="right" className="border-l border-border" {...props}>
      <SidebarContent className="p-5 flex flex-col gap-5">
        {/* Plant preview */}
        <div style={{
          padding: 18,
          background: 'linear-gradient(180deg, #ebf5ef 0%, #f5f7f5 100%)',
          borderRadius: 14,
          textAlign: 'center',
          border: '0.5px solid var(--leaf)',
        }}>
          <div className="eyebrow" style={{ color: 'var(--moss-2)' }}>지금 키우는 식물</div>
          <div style={{ margin: '14px 0 10px', display: 'flex', justifyContent: 'center' }}>
            <Plant stage="bloom" size={92} showRoots />
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>
            💻 코딩 · Lv.7 · 개화 중
          </div>
          <div style={{ marginTop: 12 }}>
            <ProgressBar value={0.62} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10.5, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
              <span>28 / 40 TIL</span>
              <span>다음 단계: 만개</span>
            </div>
          </div>
          <div style={{
            marginTop: 12, padding: '8px 12px',
            background: 'rgba(255,255,255,0.6)', border: '0.5px solid var(--leaf)',
            borderRadius: 8, fontSize: 11.5, color: 'var(--moss-2)',
          }}>
            ✨ 이번 글로 약 <b>+{xpGain} XP</b>
          </div>
        </div>

        {/* Templates */}
        <div>
          <SectionHeader eyebrow="템플릿" title="빠른 시작" action={
            <button
              onClick={() => setDialogOpen(true)}
              style={{ fontSize: 11, color: 'var(--moss-2)', fontFamily: 'var(--font-display)', fontWeight: 500, cursor: 'pointer', background: 'transparent', border: 'none' }}
            >+ 새 템플릿</button>
          } />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {BUILTIN_TEMPLATES.map((t, i) => (
              <TemplateButton
                key={t.id}
                name={t.name}
                desc={t.desc}
                highlight={i === 0}
                onApply={() => handleApply(t.content)}
              />
            ))}
            {customTemplates.map((t) => (
              <TemplateButton
                key={t.id}
                name={t.name}
                desc="내 템플릿"
                onApply={() => handleApply(t.content)}
                onDelete={() => deleteCustomTemplate(t.id)}
              />
            ))}
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
            <Button onClick={handleSaveTemplate} disabled={!newName.trim()}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}
