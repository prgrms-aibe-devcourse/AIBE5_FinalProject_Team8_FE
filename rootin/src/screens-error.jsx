import { Component } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PixelPlant } from './pixel-plants.jsx';

// 404 / 500 오류 화면 — rootin 토큰 팔레트에 8비트 레트로 게임 스킨.
// 식물 도감 픽셀 캐릭터를 주인공으로 사용한다.

const PIXEL_FONT = "'Press Start 2P', 'JetBrains Mono', monospace";

// 8비트 픽셀 버튼 — 샤프 모서리 + 하드 그림자 + 눌림 애니메이션
function PixelButton({ children, variant = 'primary', onClick }) {
  const palette = {
    primary: { bg: 'var(--moss)', color: '#fff', border: 'var(--ink)' },
    secondary: { bg: 'var(--card)', color: 'var(--ink)', border: 'var(--ink)' },
  };
  const v = palette[variant] ?? palette.primary;
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: 'var(--font-body)',
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: '0.02em',
        padding: '11px 18px',
        color: v.color,
        background: v.bg,
        border: `2px solid ${v.border}`,
        borderRadius: 0,
        boxShadow: `4px 4px 0 var(--ink)`,
        cursor: 'pointer',
        transition: 'transform 60ms steps(2), box-shadow 60ms steps(2)',
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'translate(4px, 4px)';
        e.currentTarget.style.boxShadow = '0 0 0 var(--ink)';
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'translate(0, 0)';
        e.currentTarget.style.boxShadow = '4px 4px 0 var(--ink)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translate(0, 0)';
        e.currentTarget.style.boxShadow = '4px 4px 0 var(--ink)';
      }}
    >
      {children}
    </button>
  );
}

// 공유 레이아웃 — 아케이드 화면 카드(타이틀바 + 본문 + 스캔라인)
function ErrorArcade({ code, codeColor, statusBar, species, stage, glow, heading, message, actions }) {
  return (
    <div
      style={{
        minHeight: '100%',
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        background: 'var(--paper)',
        fontFamily: 'var(--font-body)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 배경 픽셀 격자 — 은은한 8비트 무드 */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(var(--rule) 1px, transparent 1px), linear-gradient(90deg, var(--rule) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          opacity: 0.4,
          pointerEvents: 'none',
        }}
      />

      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        style={{
          position: 'relative',
          width: 'min(480px, 92vw)',
          background: 'var(--card)',
          border: '3px solid var(--ink)',
          boxShadow: '10px 10px 0 var(--ink)',
        }}
      >
        {/* 타이틀 바 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '9px 12px',
            background: 'var(--ink)',
            color: 'var(--paper)',
            fontFamily: PIXEL_FONT,
            fontSize: 8,
            letterSpacing: '0.06em',
          }}
        >
          <span>ROOTIN.EXE</span>
          <span style={{ color: codeColor }}>{statusBar}</span>
        </div>

        {/* 본문 */}
        <div style={{ padding: '32px 28px 30px', textAlign: 'center', position: 'relative' }}>
          {/* 캐릭터 — 위아래로 둥실 */}
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}
          >
            <PixelPlant species={species} stage={stage} size={132} glow={glow} />
          </motion.div>

          {/* 큰 픽셀 코드 */}
          <div
            style={{
              fontFamily: PIXEL_FONT,
              fontSize: 'clamp(40px, 11vw, 56px)',
              color: codeColor,
              textShadow: '4px 4px 0 var(--ink)',
              letterSpacing: '0.04em',
              lineHeight: 1.1,
              marginBottom: 18,
            }}
          >
            {code}
          </div>

          <h1 style={{ fontSize: 19, fontWeight: 700, color: 'var(--ink)', margin: '0 0 8px', letterSpacing: '-0.01em' }}>
            {heading}
          </h1>
          <p style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--ink-3)', margin: '0 auto 22px', maxWidth: 320 }}>
            {message}
          </p>

          {/* 점멸 안내 */}
          <motion.div
            animate={{ opacity: [1, 1, 0, 0] }}
            transition={{ duration: 1, repeat: Infinity, times: [0, 0.5, 0.5, 1] }}
            style={{
              fontFamily: PIXEL_FONT,
              fontSize: 8,
              color: 'var(--ink-3)',
              letterSpacing: '0.08em',
              marginBottom: 18,
            }}
          >
            ▶ PRESS START
          </motion.div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {actions}
          </div>

          {/* CRT 스캔라인 오버레이 */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'repeating-linear-gradient(rgba(0,0,0,0.05) 0 1px, transparent 1px 3px)',
              pointerEvents: 'none',
            }}
          />
        </div>
      </motion.div>
    </div>
  );
}

// 404 — 길을 잃은 식물. 라우터 내부에서 렌더되므로 useNavigate 사용.
export function NotFoundScreen() {
  const navigate = useNavigate();
  return (
    <ErrorArcade
      code="404"
      codeColor="var(--moss)"
      statusBar="STAGE NOT FOUND"
      species="mushroom"
      stage="leaf"
      heading="페이지를 찾을 수 없어요"
      message="이 길에는 아직 아무것도 심어지지 않았어요. 주소가 바뀌었거나 사라진 페이지일 수 있어요."
      actions={(
        <>
          <PixelButton variant="primary" onClick={() => navigate('/dashboard')}>대시보드로</PixelButton>
          <PixelButton variant="secondary" onClick={() => navigate(-1)}>이전으로</PixelButton>
        </>
      )}
    />
  );
}

// 500 — 서버에 불이 났다. ErrorBoundary가 라우터 밖에서도 쓸 수 있어 전체 새로고침으로 복구.
export function ServerErrorScreen({ onReload, onHome }) {
  const reload = onReload ?? (() => window.location.reload());
  const home = onHome ?? (() => window.location.assign('/dashboard'));
  return (
    <ErrorArcade
      code="500"
      codeColor="var(--danger)"
      statusBar="SYSTEM ERROR"
      species="fire"
      stage="bloom"
      glow
      heading="서버에 문제가 생겼어요"
      message="잠시 화분에 불이 붙었어요. 정원사가 문제를 살펴보는 중이니 잠시 후 다시 시도해 주세요."
      actions={(
        <>
          <PixelButton variant="primary" onClick={reload}>다시 시도</PixelButton>
          <PixelButton variant="secondary" onClick={home}>홈으로</PixelButton>
        </>
      )}
    />
  );
}

// 렌더링 중 발생한 예외를 잡아 500 화면을 띄우는 에러 바운더리
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // 콘솔에 남겨 디버깅에 활용 (외부 로깅 연동 시 이 지점에 추가)
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return <ServerErrorScreen />;
    }
    return this.props.children;
  }
}
