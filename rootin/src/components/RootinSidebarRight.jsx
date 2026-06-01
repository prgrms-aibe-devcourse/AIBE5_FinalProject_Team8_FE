import React from 'react';
import { Sidebar, SidebarContent } from "@/components/ui/sidebar";
import { Plant } from '@/plants.jsx';

const TEMPLATES = [
  { id: 't1', name: '오늘의 배움', desc: '새로 알게된 점과 적용할 점' },
  { id: 't2', name: '트러블슈팅', desc: '문제 원인과 해결 과정 기록' },
  { id: 't3', name: '알고리즘', desc: '접근 방식과 코드 설명' },
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

export function RootinSidebarRight({ ...props }) {
  const xpGain = 120;
  
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
            <button style={{ fontSize: 11, color: 'var(--moss-2)', fontFamily: 'var(--font-display)', fontWeight: 500, cursor: 'pointer', background: 'transparent', border: 'none' }}>+ 새 템플릿</button>
          } />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {TEMPLATES.map((t, i) => (
              <button key={t.id} style={{
                textAlign: 'left',
                padding: 12, borderRadius: 10,
                background: i === 0 ? 'var(--paper-2)' : '#fff',
                border: '0.5px solid var(--rule)',
                cursor: 'pointer'
              }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>{t.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 3 }}>{t.desc}</div>
              </button>
            ))}
          </div>
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
