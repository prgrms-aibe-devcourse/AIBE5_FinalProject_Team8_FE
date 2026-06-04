import { RootinLogo, Plant, STAGE_META } from './plants.jsx';

// ─── LandingScreen ────────────────────────────────────────────────────────────

const FEATURES = [
  {
    emoji: '📝',
    title: 'TIL 작성',
    desc: '오늘 배운 것을 한 줄로 기록하세요. 리치 에디터로 코드, 이미지, 링크를 자유롭게 담을 수 있어요.',
  },
  {
    emoji: '🌱',
    title: '식물 성장',
    desc: 'TIL을 쌓을수록 화분의 식물이 자랍니다. 씨앗 → 새싹 → 꽃까지, 기록이 시각적으로 성장해요.',
  },
  {
    emoji: '📊',
    title: '대시보드',
    desc: '학습 통계와 스트릭을 한눈에 확인하세요. 꾸준함이 그래프로 쌓이는 걸 직접 볼 수 있어요.',
  },
  {
    emoji: '✨',
    title: 'AI 학습 도구',
    desc: '내 TIL로 복습 문제와 요약을 자동 생성해줍니다. 기록만 해도 AI가 학습지를 만들어줘요.',
  },
];


export function LandingScreen({ onStart }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--paper)',
      display: 'flex',
      flexDirection: 'column',
      overflowX: 'hidden',
    }}>

      {/* ── Nav ── */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 48px',
        borderBottom: '0.5px solid var(--rule)',
        background: 'var(--paper)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <RootinLogo size={32} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
            Rootin
          </span>
        </div>
        <button
          onClick={onStart}
          style={{
            padding: '9px 22px', borderRadius: 8,
            background: 'var(--ink)', color: '#fff',
            fontSize: 13.5, fontWeight: 500, border: 'none', cursor: 'pointer',
            letterSpacing: '-0.01em',
          }}
        >
          로그인
        </button>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        background: 'linear-gradient(135deg, #1a3a5c 0%, #2a5a8c 60%, #3d8b5e 130%)',
        color: '#fff',
        padding: '80px 48px 60px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        <div className="eyebrow" style={{ color: '#a8d5b5', letterSpacing: '0.12em', marginBottom: 16 }}>
          학습의 뿌리를 내리다
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 700,
          lineHeight: 1.25, letterSpacing: '-0.03em', maxWidth: 640,
        }}>
          매일의 기록이<br />
          <span style={{ color: '#a8d5b5' }}>뿌리가 되어</span> 꽃을 피웁니다.
        </h1>
        <p style={{ fontSize: 16, color: 'rgba(232,245,236,0.75)', marginTop: 20, lineHeight: 1.7, maxWidth: 480 }}>
          오늘 배운 한 줄을 화분에 심으면 식물이 자랍니다.<br />
          기록이 쌓일수록 정원도 깊어져요.
        </p>
        <button
          onClick={onStart}
          style={{
            marginTop: 36, padding: '14px 36px', borderRadius: 10,
            background: '#fff', color: '#1a3a5c',
            fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer',
            letterSpacing: '-0.01em', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          }}
        >
          🌱 지금 시작하기
        </button>

        {/* Plant row */}
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'flex-end',
          gap: 32, marginTop: 56, opacity: 0.9,
        }}>
          {['seed', 'sprout', 'leaf', 'bloom', 'full'].map((s) => (
            <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <Plant stage={s} size={56} color="#ffd0e0" />
              <div style={{ fontSize: 10, color: '#a8d5b5', fontFamily: 'var(--font-display)', letterSpacing: '0.06em' }}>
                {STAGE_META[s].label}
              </div>
            </div>
          ))}
        </div>

        {/* bg pattern */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
          backgroundSize: '36px 36px', pointerEvents: 'none',
        }} />
      </section>

      {/* ── Features ── */}
      <section style={{ padding: '72px 48px', maxWidth: 960, margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div className="eyebrow" style={{ color: 'var(--moss-2)' }}>핵심 기능</div>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700,
            color: 'var(--ink)', marginTop: 8, letterSpacing: '-0.02em',
          }}>
            이런 걸 할 수 있어요
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{
              background: '#fff', border: '0.5px solid var(--rule)',
              borderRadius: 14, padding: '28px 28px',
            }}>
              <div style={{ fontSize: 32, marginBottom: 14 }}>{f.emoji}</div>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600,
                color: 'var(--ink)', marginBottom: 8,
              }}>
                {f.title}
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.65 }}>
                {f.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA bottom ── */}
      <section style={{
        padding: '72px 48px', textAlign: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700,
          color: 'var(--ink)', letterSpacing: '-0.02em',
        }}>
          오늘 첫 화분을 심어보세요
        </h2>
        <p style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 12, lineHeight: 1.7 }}>
          이메일 하나로 바로 시작할 수 있어요. 무료입니다.
        </p>
        <button
          onClick={onStart}
          style={{
            marginTop: 28, padding: '14px 40px', borderRadius: 10,
            background: 'var(--ink)', color: '#fff',
            fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer',
            letterSpacing: '-0.01em',
          }}
        >
          🌱 무료로 시작하기
        </button>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: '0.5px solid var(--rule)',
        padding: '24px 48px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <RootinLogo size={22} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--ink-2)' }}>Rootin</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>© 2026 Rootin. All rights reserved.</div>
      </footer>

    </div>
  );
}
