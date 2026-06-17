import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { PixelPlant } from './pixel-plants.jsx';

// 로그인 왼쪽 비주얼 — 실제 정원에서 쓰는 도트 식물(PixelPlant)이 마우스를 따라본다.
// PixelPlant 위에 같은 viewBox(0 0 16 16)의 투명 SVG를 덧대어, 화분 얼굴 위치에
// 흰자 + 눈동자를 그려 시선을 추적한다. shy=true(비밀번호 입력 중)면 시선을 내려 안 훔쳐본다.
//
// leaf 스테이지 화분 얼굴(눈) 좌표 — seed·cactus·fire 공통: 눈 (6,11)·(9,11), 입 (7,13).
// 화분 얼굴색(FACE)으로 박힌 점눈을 덮고, 같은 색·모양의 점눈(DOT)이 마우스를 따라 살짝 움직인다.
const EYES = [{ cx: 6.5, cy: 11.5 }, { cx: 9.5, cy: 11.5 }];
const MAXD = 0.8;
const DOT = '#1A3A5C';   // 원래 화분 점눈 색
const FACE = '#C8A882';  // 테라코타 화분 얼굴색(눈 주변)

function PotPal({ species, mouse, shy, size, bobDelay }) {
  const ref = useRef(null);
  const [blink, setBlink] = useState(false);
  const [offs, setOffs] = useState([{ x: 0, y: 0 }, { x: 0, y: 0 }]);

  // 3~6초 간격 랜덤 깜빡임
  useEffect(() => {
    let a, b;
    const loop = () => {
      a = setTimeout(() => {
        setBlink(true);
        b = setTimeout(() => { setBlink(false); loop(); }, 130);
      }, 2600 + Math.random() * 3800);
    };
    loop();
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);

  // 눈 중심을 화면 좌표로 환산해 마우스 방향으로 눈동자 오프셋(그리드 단위) 계산.
  // ref는 렌더가 아닌 effect에서만 읽는다.
  useEffect(() => {
    if (shy) { setOffs([{ x: 0, y: MAXD }, { x: 0, y: MAXD }]); return; }
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const u = r.width / 16;
    if (!u) return;
    setOffs(EYES.map((e) => {
      const dx = (mouse.x - (r.left + e.cx * u)) / u;
      const dy = (mouse.y - (r.top + e.cy * u)) / u;
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.min(d, MAXD) / d;
      return { x: dx * k, y: dy * k };
    }));
  }, [mouse, shy]);

  return (
    <motion.div
      ref={ref}
      style={{ position: 'relative', width: size, height: size, filter: 'drop-shadow(0 9px 10px rgba(74,52,28,0.26))' }}
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut', delay: bobDelay }}
    >
      <PixelPlant species={species} stage="leaf" size={size} />

      {/* 점눈 오버레이 — 박힌 점눈을 화분색으로 덮고, 같은 점눈이 마우스를 따라 살짝 움직인다 */}
      <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {EYES.map((e, i) => (
          <rect key={`c${i}`} x={e.cx - 0.8} y={e.cy - 0.8} width="1.6" height="1.6" fill={FACE} />
        ))}
        {blink ? (
          <g fill={DOT}>
            {EYES.map((e, i) => (
              <rect key={`b${i}`} x={e.cx - 0.65} y={e.cy - 0.18} width="1.3" height="0.5" />
            ))}
          </g>
        ) : (
          EYES.map((e, i) => (
            <g key={`p${i}`} transform={`translate(${offs[i].x} ${offs[i].y})`} style={{ transition: 'transform 0.08s ease-out' }}>
              <rect x={e.cx - 0.6} y={e.cy - 0.6} width="1.2" height="1.2" fill={DOT} />
            </g>
          ))
        )}
      </svg>
    </motion.div>
  );
}

export function PixelPals({ shy = false }) {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', width: '100%' }}>
      {/* 따뜻한 햇살 글로우 + 정원 바닥 그림자 */}
      <div
        style={{
          position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)',
          width: 460, height: 250, pointerEvents: 'none', filter: 'blur(12px)',
          background: 'radial-gradient(closest-side, rgba(230,177,78,0.28), rgba(116,201,140,0.16) 55%, transparent)',
        }}
      />
      <div
        style={{
          position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
          width: 360, height: 26, pointerEvents: 'none', borderRadius: '50%', filter: 'blur(5px)',
          background: 'radial-gradient(closest-side, rgba(74,52,28,0.22), transparent)',
        }}
      />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 'clamp(2px, 1.4vw, 18px)' }}>
        <PotPal species="cactus" mouse={mouse} shy={shy} size={108} bobDelay={0.4} />
        <PotPal species="fire" mouse={mouse} shy={shy} size={136} bobDelay={0} />
        <PotPal species="seed" mouse={mouse} shy={shy} size={116} bobDelay={0.8} />
      </div>
    </div>
  );
}
