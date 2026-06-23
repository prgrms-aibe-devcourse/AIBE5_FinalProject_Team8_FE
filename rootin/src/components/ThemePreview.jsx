/* =========================================================================
   ROOTIN — 테마 보관함 미리보기 (ThemePreview)
   각 테마를 실제 팔레트로 축소 렌더한 미니 앱 목업. "딱 보기만 해도 어떤
   테마인지" 알 수 있게 한다. 활성 앱 테마와 무관하게 항상 같은 모습이어야
   하므로(클래식 화면에서도 게임보이 미리보기를 보여줘야 함) CSS 변수가 아닌
   고정 hex 값으로 그린다. 부모가 크기를 정하고, 미리보기는 그 안을 꽉 채운다.
   ========================================================================= */

// 부드러운(라이트/다크) 테마 — 같은 레이아웃, 색만 다름
const SOFT = {
  classic: {
    page: '#F7F2E7', card: '#FFFDF7', rail: '#F0E7D3', ink: '#2E2A21',
    sub: '#B8AF9D', leaf: '#4F7C52', pot: '#E08A6B', chip: '#E4EEDD',
    line: '#EBE2CF',
  },
  dark: {
    page: '#171B16', card: '#262C23', rail: '#1F241D', ink: '#ECEFE6',
    sub: '#6E7768', leaf: '#8FBF86', pot: '#E89A7C', chip: '#2A3727',
    line: '#2E3528', glow: true,
  },
};

// 둥근 잎 새싹 — 화분에 심긴 모양
function SoftSprout({ leaf, pot }) {
  return (
    <div style={{ position: 'relative', width: 26, height: 28, flex: '0 0 auto' }} aria-hidden="true">
      <span style={{ position: 'absolute', left: 1, top: 4, width: 11, height: 7, background: leaf, borderRadius: '12px 3px 12px 3px', transform: 'rotate(-14deg)' }} />
      <span style={{ position: 'absolute', right: 1, top: 1, width: 11, height: 7, background: leaf, borderRadius: '3px 12px 3px 12px', transform: 'rotate(14deg)' }} />
      <span style={{ position: 'absolute', left: '50%', top: 8, width: 2.5, height: 11, marginLeft: -1.25, background: leaf, borderRadius: 2 }} />
      <span style={{ position: 'absolute', left: 6, bottom: 0, width: 14, height: 9, background: pot, borderRadius: '2px 2px 5px 5px' }} />
      <span style={{ position: 'absolute', left: 5, bottom: 7, width: 16, height: 3, background: pot, borderRadius: 2, filter: 'brightness(1.12)' }} />
    </div>
  );
}

function SoftPreview({ p }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: p.page, display: 'flex', gap: 8, paddingRight: 10 }}>
      {/* 좌측 사이드바 레일 */}
      <div style={{
        width: '17%', background: p.rail, borderRadius: '0 10px 10px 0',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '11px 0',
      }}>
        <span style={{ width: 11, height: 11, borderRadius: 4, background: p.leaf }} />
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ width: 9, height: 3, borderRadius: 2, background: p.line }} />
        ))}
      </div>
      {/* 본문 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7, padding: '11px 0' }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ width: '42%', height: 6, borderRadius: 3, background: p.ink, opacity: 0.82 }} />
          <span style={{ width: 13, height: 13, borderRadius: '50%', background: p.pot }} />
        </div>
        {/* 새싹 카드 */}
        <div style={{
          flex: 1, background: p.card, borderRadius: 9, border: `1px solid ${p.line}`,
          boxShadow: p.glow ? `0 0 12px ${p.leaf}40` : '0 1px 4px rgba(0,0,0,.05)',
          display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px',
        }}>
          <SoftSprout leaf={p.leaf} pot={p.pot} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 0 }}>
            <span style={{ width: '72%', height: 5, borderRadius: 3, background: p.ink, opacity: 0.78 }} />
            <span style={{ width: '46%', height: 5, borderRadius: 3, background: p.sub }} />
          </div>
        </div>
        {/* 스탯 칩 */}
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{ flex: 1, height: 15, borderRadius: 6, background: p.chip }} />
          <span style={{ flex: 1, height: 15, borderRadius: 6, background: p.card, border: `1px solid ${p.line}` }} />
          <span style={{ width: 28, height: 15, borderRadius: 6, background: p.leaf }} />
        </div>
      </div>
    </div>
  );
}

/* ---- 게임보이: 도트 매트릭스 LCD ---- */
// 픽셀 새싹 스프라이트 (8×8). 1=잎/줄기, 3=화분
const GB_SPRITE = [
  '00100100',
  '01110110',
  '00111100',
  '00011000',
  '00011000',
  '03333330',
  '03333330',
  '00333300',
];
const GB_DARK = '#14340f';
const GB_MID = '#356121';
const GB_POT = '#22480f';

function PixelSprout() {
  const cell = 4;
  return (
    <div
      aria-hidden="true"
      style={{ position: 'relative', width: 8 * cell, height: 8 * cell, imageRendering: 'pixelated' }}
    >
      {GB_SPRITE.flatMap((row, y) =>
        [...row].map((c, x) => {
          if (c === '0') return null;
          return (
            <span
              key={`${x}-${y}`}
              style={{
                position: 'absolute', left: x * cell, top: y * cell, width: cell, height: cell,
                background: c === '3' ? GB_POT : GB_DARK,
              }}
            />
          );
        }),
      )}
    </div>
  );
}

function GameboyPreview() {
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#1b1e13', padding: 7 }}>
      <div style={{
        position: 'relative', width: '100%', height: '100%', overflow: 'hidden',
        borderRadius: 3, imageRendering: 'pixelated',
        background: 'linear-gradient(180deg, #bcd35c 0%, #a4c043 100%)',
        boxShadow: 'inset 0 0 0 2px rgba(0,0,0,.32)',
      }}>
        {/* 스캔라인 결 */}
        <span style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'repeating-linear-gradient(0deg, rgba(15,40,15,.13) 0 1px, transparent 1px 3px)',
        }} />
        {/* 상단 HUD */}
        <div style={{ position: 'absolute', top: 6, left: 8, right: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: '"Galmuri9","Galmuri11",monospace', fontSize: 7, letterSpacing: 1.5, color: GB_DARK }}>ROOTIN</span>
          <span style={{ display: 'flex', gap: 2 }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ width: 4, height: 4, background: GB_MID, clipPath: 'polygon(50% 0,100% 38%,82% 100%,18% 100%,0 38%)' }} />
            ))}
          </span>
        </div>
        {/* 중앙 픽셀 새싹 */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <PixelSprout />
        </div>
        {/* 하단 EXP 바 */}
        <div style={{ position: 'absolute', bottom: 6, left: 8, right: 8, height: 6, background: '#cfe07d', border: `1.5px solid ${GB_DARK}` }}>
          <span style={{ display: 'block', width: '64%', height: '100%', background: GB_MID }} />
        </div>
      </div>
    </div>
  );
}

export function ThemePreview({ theme }) {
  if (theme === 'gameboy') return <GameboyPreview />;
  return <SoftPreview p={SOFT[theme] || SOFT.classic} />;
}

export default ThemePreview;
