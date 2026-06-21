import { motion, useInView, useReducedMotion } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { PenLine, Sprout, LineChart, Sparkles, ArrowRight, Flame, Check, ChevronDown } from 'lucide-react';
import { PixelPlant } from '../pixel-plants.jsx';
import { RootinWordmark } from './RootinWordmark.jsx';

// ──────────────────────────────────────────────────────────────
// 노트북(사파리)으로 접속한 rootin.app — 실제 제품 소개 화면.
// 디자인: "하나의 살아있는 줄기". 흩어진 기록이 한 정원으로 자란다는
// 메타포를, 위에서 아래로 자라는 한 줄기 식물(좌측 스파인)로 시각화한다.
// 기능 4개는 줄기의 마디(노드)에서 잎처럼 펼쳐지고, 스크롤로 진입할 때마다
// 줄기 마디가 자라난다. 색은 실제 제품 토큰(warm sage), 타이포는 Space Grotesk.
// 구조(섹션·문구·앵커 id·onStart)는 그대로 유지 — MonitorSection 메뉴 스크롤 의존.
// ──────────────────────────────────────────────────────────────

// warm sage 디자인 토큰의 라이트 값(노트북 안 화면은 항상 정규 라이트 제품 화면)
const C = {
  paper: '#F7F2E7', paper2: '#F1EAD9', card: '#FFFDF7',
  ink: '#2E2A21', ink2: '#6C6353', ink3: '#9A9082',
  moss: '#4F7C52', moss2: '#38593B', sprout: '#6CA15C', leaf: '#E4EEDD',
  coral: '#E08A6B', honey: '#E6B14E',
  rule: '#E8DFCC', rule2: '#DBCFB6',
};

const EASE = [0.22, 1, 0.36, 1];

// 메인 로고 — 화분 마스코트
const RootinMascot = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" aria-hidden="true" style={{ display: 'block' }}>
    <path d="M40 34 C50 34 58 28 60 17 C49 16 41 22 40 34 Z" fill={C.sprout} />
    <path d="M40 36 C30 36 22 30 20 19 C31 18 39 24 40 36 Z" fill={C.moss} />
    <path d="M40 47 L40 30" fill="none" stroke={C.moss2} strokeWidth="4" strokeLinecap="round" />
    <rect x="18" y="44" width="44" height="9" rx="4.5" fill="#E0A07F" />
    <path d="M21 53 L59 53 L54.5 70 C54 72 52.4 73 50.4 73 L29.6 73 C27.6 73 26 72 25.5 70 Z" fill={C.coral} />
    <circle cx="34" cy="61" r="2" fill="#5A3A28" />
    <circle cx="46" cy="61" r="2" fill="#5A3A28" />
    <path d="M36 65.5 Q40 68.5 44 65.5" fill="none" stroke="#5A3A28" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const BrandLockup = ({ markSize = 30, fontSize = 21 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
    <RootinMascot size={markSize} />
    <span style={{ fontFamily: 'var(--font-display)', fontSize, fontWeight: 700, letterSpacing: '-0.02em', color: C.ink }}>
      <RootinWordmark leaf1={C.moss} leaf2={C.sprout} animate={false} />
    </span>
  </div>
);

// 인뷰에서 한 번 등장 — 페이지 전반의 기본 reveal
const Reveal = ({ children, y = 40, delay = 0, amount = 0.4, className, style }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.7, delay, ease: EASE }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
};

// 숫자 카운트업 — 인뷰 진입 시 0 → to
function CountUp({ to, suffix = '', duration = 1.3 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (reduce) { setN(to); return; }
    let raf;
    let start;
    const tick = (now) => {
      if (start === undefined) start = now;
      const t = Math.min(1, (now - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - t, 3);
      setN(Math.round(to * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration, reduce]);
  return <span ref={ref}>{n}{suffix}</span>;
}

// ── 제품 화면 목업: 중첩 브라우저 크롬 없이, 따뜻한 카드 패널로 ──
const Panel = ({ label, accent = C.moss, children }) => (
  <div
    style={{
      background: C.card,
      border: `1px solid ${C.rule}`,
      borderRadius: 20,
      boxShadow: '0 30px 60px -28px rgba(46,42,33,0.34), 0 2px 5px rgba(46,42,33,0.04), inset 0 1px 0 #fff',
      overflow: 'hidden',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 16px', borderBottom: `1px solid ${C.paper2}`, background: `linear-gradient(${C.card}, #FBF6EA)` }}>
      <span style={{ width: 7, height: 7, borderRadius: 2, background: accent, transform: 'rotate(45deg)' }} />
      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.02em', color: C.ink2 }}>{label}</span>
      <span style={{ marginLeft: 'auto', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.16em', color: C.ink3 }}>ROOTIN</span>
    </div>
    <div style={{ padding: 18 }}>{children}</div>
  </div>
);

const StatTile = ({ icon, label, value, suffix, accent }) => (
  <div style={{ flex: 1, background: `linear-gradient(160deg,#fff,#FBF6EA)`, border: `1px solid ${C.rule}`, borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, boxShadow: '0 2px 8px rgba(46,42,33,0.04)' }}>
    <span style={{ width: 30, height: 30, borderRadius: 9, background: `${accent}22`, color: accent, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
    <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: C.ink, lineHeight: 1, letterSpacing: '-0.02em' }}><CountUp to={value} suffix={suffix} /></div>
    <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink3 }}>{label}</div>
  </div>
);

// 잔디(컨트리뷰션) — 인뷰에서 좌→우 웨이브로 채워진다
const GRASS_COLS = 20;
const GRASS_ROWS = 7;
const GRASS = Array.from({ length: GRASS_COLS * GRASS_ROWS }, (_, i) => Math.abs(Math.sin(i * 78.233 + 12.9898)));
const grassColor = (v) => (v < 0.2 ? '#EFE7D4' : v < 0.42 ? '#CDE3BD' : v < 0.62 ? '#9CCB86' : v < 0.82 ? C.sprout : C.moss);

const GrassGrid = () => {
  const reduce = useReducedMotion();
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${GRASS_COLS}, 1fr)`, gridAutoRows: '1fr', gap: 4 }}>
      {GRASS.map((v, i) => {
        const col = i % GRASS_COLS;
        return (
          <motion.span
            key={i}
            initial={reduce ? false : { opacity: 0, scale: 0.3 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.4, delay: col * 0.03, ease: EASE }}
            style={{ aspectRatio: '1 / 1', borderRadius: 3, background: grassColor(v) }}
          />
        );
      })}
    </div>
  );
};

const DashboardMock = () => (
  <Panel label="대시보드 · 이번 주" accent={C.moss}>
    <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
      <StatTile icon={<Flame size={16} />} label="연속 기록" value={14} suffix="일" accent={C.coral} />
      <StatTile icon={<PenLine size={16} />} label="이번 달 TIL" value={23} suffix="개" accent={C.moss} />
    </div>
    <div style={{ fontSize: 11.5, fontWeight: 700, color: C.ink3, marginBottom: 9 }}>지난 20주의 기록</div>
    <GrassGrid />
  </Panel>
);

const GARDEN = [
  { species: 'seed', stage: 'full', name: '알고리즘', pct: 100 },
  { species: 'rose', stage: 'bloom', name: 'CS 기초', pct: 72 },
  { species: 'cactus', stage: 'leaf', name: '리액트', pct: 45 },
];
const GardenMock = () => {
  const reduce = useReducedMotion();
  return (
    <Panel label="내 정원" accent={C.coral}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {GARDEN.map((p, i) => (
          <motion.div
            key={p.name}
            initial={reduce ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.5, delay: 0.1 + i * 0.12, ease: [0.34, 1.56, 0.64, 1] }}
            style={{ background: 'linear-gradient(180deg,#fff,#F6F2E6)', border: `1px solid ${C.rule}`, borderRadius: 14, padding: '14px 8px 12px', textAlign: 'center', boxShadow: '0 2px 8px rgba(46,42,33,0.05)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', filter: 'drop-shadow(0 4px 5px rgba(46,42,33,0.18))' }}>
              <PixelPlant species={p.species} stage={p.stage} size={58} />
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: C.ink, margin: '8px 0 6px' }}>{p.name}</div>
            <div style={{ height: 5, borderRadius: 3, background: C.paper2, overflow: 'hidden' }}>
              <motion.div
                initial={reduce ? false : { width: 0 }}
                whileInView={{ width: `${p.pct}%` }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.9, delay: 0.3 + i * 0.12, ease: EASE }}
                style={{ height: '100%', background: `linear-gradient(90deg,${C.sprout},${C.moss})` }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </Panel>
  );
};

const EditorMock = () => (
  <Panel label="새 TIL" accent={C.honey}>
    <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: C.ink, marginBottom: 10, letterSpacing: '-0.01em' }}>오늘 배운 React useMemo</div>
    <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
      {['B', 'i', 'H1', '“ ”', '</>'].map((t) => (
        <span key={t} style={{ fontSize: 11, fontWeight: 700, color: C.ink2, background: C.paper2, borderRadius: 7, padding: '4px 8px' }}>{t}</span>
      ))}
    </div>
    <div style={{ height: 8, borderRadius: 4, background: C.paper2, marginBottom: 7, width: '92%' }} />
    <div style={{ height: 8, borderRadius: 4, background: C.paper2, marginBottom: 14, width: '74%' }} />
    <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', background: C.leaf, border: `1px solid #CFE3C4`, borderLeft: `3px solid ${C.moss}`, borderRadius: 10, padding: '10px 12px' }}>
      <Sprout size={15} color={C.moss} style={{ marginTop: 1, flexShrink: 0 }} />
      <span style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.5 }}>의존성이 같으면 계산을 건너뛴다 — 콜아웃으로 핵심만 정리.</span>
    </div>
  </Panel>
);

const AiMock = () => (
  <Panel label="AI 복습" accent={C.moss2}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
      <Sparkles size={15} color={C.moss} />
      <span style={{ fontSize: 12.5, fontWeight: 700, color: C.ink2 }}>오늘의 복습 퀴즈</span>
    </div>
    <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, marginBottom: 12, lineHeight: 1.5 }}>Q. useMemo가 값을 다시 계산하는 조건은?</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {[{ t: '의존성 배열의 값이 바뀔 때', ok: true }, { t: '컴포넌트가 리렌더될 때마다', ok: false }].map((o, i) => (
        <motion.div
          key={o.t}
          initial={{ opacity: 0, x: -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.4, delay: 0.15 + i * 0.12, ease: EASE }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, color: o.ok ? C.moss2 : C.ink2, background: o.ok ? C.leaf : '#fff', border: `1px solid ${o.ok ? '#CFE3C4' : C.rule}`, borderRadius: 10, padding: '9px 11px' }}
        >
          <span style={{ width: 17, height: 17, borderRadius: '50%', flexShrink: 0, background: o.ok ? C.moss : 'transparent', border: o.ok ? 'none' : `1.5px solid ${C.rule2}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            {o.ok && <Check size={11} color="#fff" strokeWidth={3} />}
          </span>
          {o.t}
        </motion.div>
      ))}
    </div>
  </Panel>
);

const FEATURES = [
  { n: '01', anchor: 'feature-til', icon: PenLine, title: 'TIL 기록', desc: '노션 스타일 에디터로 오늘 배운 것을 가볍게 적습니다. 템플릿·태그·임시저장으로 기록의 문턱을 낮췄어요.', Mock: EditorMock, accent: C.honey },
  { n: '02', anchor: 'feature-garden', icon: Sprout, title: '식물 정원', desc: 'TIL을 쓰면 화분에 물이 차고 식물이 자랍니다. 씨앗부터 만개까지 키워 수확하고 도감을 채우세요.', Mock: GardenMock, accent: C.coral },
  { n: '03', anchor: 'feature-dashboard', icon: LineChart, title: '성장 대시보드', desc: '잔디 그래프와 연속 기록(스트릭), 관심사 분포로 나의 꾸준함이 눈에 보이는 결과로 쌓입니다.', Mock: DashboardMock, accent: C.moss },
  { n: '04', anchor: 'feature-ai', icon: Sparkles, title: 'AI 학습 도구', desc: '작성한 TIL을 AI가 요약하고 복습 문제를 만들어 줍니다. 흩어진 기록이 진짜 내 지식이 되도록.', Mock: AiMock, accent: C.moss2 },
];

const STAGES = [
  { stage: 'seed', label: '씨앗' },
  { stage: 'sprout', label: '새싹' },
  { stage: 'leaf', label: '잎' },
  { stage: 'bloom', label: '개화' },
  { stage: 'full', label: '만개' },
];

// 살아있는 줄기의 마디 — 잎이 펼쳐지듯 스프링으로 등장
const SpineNode = ({ icon: Icon, accent }) => {
  const reduce = useReducedMotion();
  return (
    <div className="rootin-site-spine">
      {/* 줄기(세로 그라데이션) — 인뷰에서 위→아래로 자라 내려온다 */}
      <motion.span
        className="rootin-site-stem"
        initial={reduce ? false : { scaleY: 0 }}
        whileInView={{ scaleY: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.8, ease: EASE }}
      />
      {/* 마디(노드) — 잎이 펼쳐지듯. 위치는 CSS 앵커가, 등장은 framer가 담당(transform 충돌 회피) */}
      <span className="rootin-site-node-anchor">
        <motion.span
          className="rootin-site-node"
          initial={reduce ? false : { scale: 0, rotate: -40 }}
          whileInView={{ scale: 1, rotate: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ type: 'spring', stiffness: 240, damping: 16, delay: 0.18 }}
          style={{ background: `linear-gradient(150deg, ${C.sprout}, ${accent})`, boxShadow: `0 10px 22px -7px ${accent}cc, inset 0 1px 0 rgba(255,255,255,0.5)` }}
        >
          <Icon size={22} strokeWidth={2.2} color="#fff" />
        </motion.span>
      </span>
    </div>
  );
};

export const SiteDescriptions = ({ onStart }) => {
  const reduce = useReducedMotion();
  return (
    <div style={{ background: `radial-gradient(135% 70% at 78% -5%, #FFFDF7 0%, ${C.paper} 46%)`, color: C.ink, fontFamily: 'var(--font-body)' }}>

      {/* ── 사이트 헤더 ── */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px clamp(20px, 5vw, 64px)', background: 'rgba(247,242,231,0.72)', borderBottom: `1px solid ${C.rule}`, backdropFilter: 'blur(8px)' }}>
        <BrandLockup />
        <nav style={{ display: 'flex', alignItems: 'center', gap: 'clamp(14px, 2.4vw, 30px)' }}>
          <span className="rootin-site-navlink">기능</span>
          <span className="rootin-site-navlink">정원</span>
          <span className="rootin-site-navlink">통계</span>
          <span className="rootin-site-navlink">AI</span>
        </nav>
      </header>

      {/* ── 히어로 ── */}
      <section id="intro" style={{ minHeight: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 'clamp(40px, 8vh, 90px) clamp(20px, 5vw, 64px)', position: 'relative', overflow: 'hidden' }}>
        {/* 떠다니는 잎 — 은은한 앰비언트 */}
        {!reduce && [{ x: '12%', y: '20%', s: 34, d: 0 }, { x: '84%', y: '28%', s: 26, d: 1.2 }, { x: '76%', y: '70%', s: 30, d: 0.6 }].map((l, i) => (
          <motion.div
            key={i}
            aria-hidden="true"
            style={{ position: 'absolute', left: l.x, top: l.y, opacity: 0.5 }}
            animate={{ y: [0, -14, 0], rotate: [0, 8, 0] }}
            transition={{ duration: 5 + i, repeat: Infinity, ease: 'easeInOut', delay: l.d }}
          >
            <PixelPlant species="seed" stage="sprout" size={l.s} />
          </motion.div>
        ))}

        <motion.span
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 16px', borderRadius: 999, background: C.leaf, color: C.moss2, fontSize: 13, fontWeight: 800, boxShadow: 'inset 0 1px 0 #fff, 0 2px 10px rgba(79,124,82,0.12)' }}
        >
          <Sprout size={15} /> 매일의 TIL을 식물로
        </motion.span>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 6vw, 5rem)', fontWeight: 700, lineHeight: 1.06, letterSpacing: '-0.04em', margin: '26px 0 0' }}>
          {['오늘 배운 것이', '뿌리 깊은 습관이 됩니다'].map((line, li) => (
            <span key={li} style={{ display: 'block', overflow: 'hidden' }}>
              <motion.span
                style={{ display: 'inline-block' }}
                initial={reduce ? false : { y: '110%' }}
                animate={{ y: 0 }}
                transition={{ duration: 0.9, delay: 0.15 + li * 0.12, ease: EASE }}
              >
                {li === 1 ? (<><span style={{ color: C.moss }}>뿌리</span> 깊은 습관이 됩니다</>) : line}
              </motion.span>
            </span>
          ))}
        </h1>

        <motion.p
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5, ease: EASE }}
          style={{ margin: '24px auto 0', maxWidth: 560, fontSize: 'clamp(1.05rem, 1.6vw, 1.28rem)', lineHeight: 1.65, color: C.ink2 }}
        >
          Rootin은 매일의 학습 기록을 식물로 키우는 게임형 학습 습관 서비스입니다.
          꾸준함이 정원이 되어 눈에 보이는 성장으로 남습니다.
        </motion.p>

        {/* 씨앗 — 줄기가 자라기 시작하는 곳 */}
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
          style={{ marginTop: 38, filter: 'drop-shadow(0 8px 10px rgba(46,42,33,0.18))' }}
        >
          <motion.div animate={reduce ? {} : { y: [0, -6, 0] }} transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}>
            <PixelPlant species="seed" stage="sprout" size={64} />
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          style={{ position: 'absolute', bottom: 'clamp(18px, 4vh, 40px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: C.ink3 }}
        >
          <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase' }}>스크롤</span>
          <motion.div animate={reduce ? {} : { y: [0, 7, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}>
            <ChevronDown size={20} />
          </motion.div>
        </motion.div>
      </section>

      {/* ── 기능 (살아있는 줄기 위의 마디들) ── */}
      <section id="features" style={{ maxWidth: 1120, margin: '0 auto', padding: '0 clamp(20px, 5vw, 64px)' }}>
        <Reveal style={{ textAlign: 'center', padding: 'clamp(20px,4vh,44px) 0 clamp(16px,3vh,32px)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 12.5, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.moss, marginBottom: 12 }}>왜 Rootin인가</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 3.6vw, 2.9rem)', fontWeight: 700, letterSpacing: '-0.03em', margin: 0, lineHeight: 1.12 }}>기록이 성장이 되는 네 가지 방법</h2>
        </Reveal>

        <div className="rootin-site-spine-track">
          {FEATURES.map((f, i) => {
            const mockLeft = i % 2 === 1;
            return (
              <article key={f.title} id={f.anchor} className="rootin-site-feature">
                <SpineNode icon={f.icon} accent={f.accent} />

                <div className="rootin-site-feature-body" style={{ direction: mockLeft ? 'rtl' : 'ltr' }}>
                  <Reveal y={36} amount={0.4} style={{ direction: 'ltr' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 800, letterSpacing: '0.06em', color: f.accent }}>{f.n}</span>
                      <span style={{ height: 1, flex: '0 0 28px', background: C.rule2 }} />
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.55rem, 2.6vw, 2.1rem)', fontWeight: 700, letterSpacing: '-0.025em', margin: '0 0 14px', lineHeight: 1.15 }}>{f.title}</h3>
                    <p style={{ fontSize: 'clamp(1rem, 1.4vw, 1.12rem)', lineHeight: 1.75, color: C.ink2, margin: 0, maxWidth: 440 }}>{f.desc}</p>
                  </Reveal>

                  <motion.div
                    initial={reduce ? false : { opacity: 0, y: 40, rotateX: 10 }}
                    whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                    viewport={{ once: true, amount: 0.35 }}
                    transition={{ duration: 0.8, ease: EASE }}
                    whileHover={reduce ? {} : { y: -6 }}
                    style={{ direction: 'ltr', perspective: 1000 }}
                  >
                    <f.Mock />
                  </motion.div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* ── 성장 단계 (도트 식물) ── */}
      <section style={{ background: `linear-gradient(180deg, ${C.paper} 0%, ${C.paper2} 100%)`, padding: 'clamp(56px, 9vh, 110px) clamp(20px, 5vw, 64px)', marginTop: 'clamp(30px,6vh,70px)' }}>
        <Reveal style={{ maxWidth: 1120, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 12.5, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.ink3, marginBottom: 10 }}>하나의 TIL이 자라나는 길</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 3vw, 2.3rem)', fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 clamp(32px,5vh,56px)' }}>씨앗에서 만개까지</h2>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 'clamp(4px, 1.2vw, 16px)', flexWrap: 'wrap' }}>
            {STAGES.map((s, i) => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'flex-end', gap: 'clamp(4px, 1.2vw, 16px)' }}>
                <motion.div
                  initial={reduce ? false : { opacity: 0, y: 26, scale: 0.8 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: 0.5, delay: i * 0.13, ease: [0.34, 1.56, 0.64, 1] }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '18px 16px 14px', borderRadius: 18, background: 'linear-gradient(180deg,#fff,#FBF6EA)', border: `1px solid ${C.rule}`, minWidth: 92, boxShadow: '0 14px 30px -16px rgba(46,42,33,0.3), inset 0 1px 0 #fff' }}
                >
                  <div style={{ filter: 'drop-shadow(0 5px 6px rgba(46,42,33,0.2))' }}>
                    <PixelPlant species="seed" stage={s.stage} size={54} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.ink2 }}>{s.label}</span>
                </motion.div>
                {i < STAGES.length - 1 && <ArrowRight size={18} color={C.sprout} strokeWidth={2.6} style={{ marginBottom: 28 }} />}
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ── 최종 CTA (시작 버튼은 여기 한 곳) ── */}
      <section style={{ padding: 'clamp(64px, 11vh, 150px) clamp(20px, 5vw, 64px)' }}>
        <Reveal style={{ maxWidth: 920, margin: '0 auto' }}>
          <motion.div
            animate={reduce ? {} : { y: [0, -8, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 32,
              background: `linear-gradient(150deg, ${C.moss} 0%, ${C.moss2} 100%)`,
              color: '#F6F2E7',
              padding: 'clamp(44px, 7vw, 84px) clamp(28px, 5vw, 72px)',
              textAlign: 'center',
              boxShadow: `0 40px 80px -28px ${C.moss2}, inset 0 1px 0 rgba(255,255,255,0.18)`,
            }}
          >
            <div style={{ position: 'absolute', top: -40, right: -10, opacity: 0.16 }}>
              <PixelPlant species="seed" stage="full" size={150} />
            </div>
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18, filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.25))' }}>
                <RootinMascot size={56} />
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.9rem, 3.6vw, 3rem)', fontWeight: 700, letterSpacing: '-0.03em', margin: 0, lineHeight: 1.16 }}>
                오늘, 첫 씨앗을 심어보세요
              </h2>
              <p style={{ margin: '16px auto 0', maxWidth: 480, fontSize: 'clamp(1rem,1.5vw,1.15rem)', lineHeight: 1.6, opacity: 0.9 }}>
                1분이면 충분합니다. 매일의 작은 기록이 모여 당신만의 정원으로 자라납니다.
              </p>
              <button
                type="button"
                onClick={onStart}
                className="rootin-site-cta"
                style={{ marginTop: 36, display: 'inline-flex', alignItems: 'center', gap: 10, padding: '17px 40px', borderRadius: 999, background: '#FBF7EE', color: C.moss2, fontSize: 17, fontWeight: 800, border: 'none', cursor: 'pointer' }}
              >
                무료로 시작하기 <ArrowRight size={19} strokeWidth={2.6} />
              </button>
            </div>
          </motion.div>
        </Reveal>
      </section>

      {/* ── 푸터 ── */}
      <footer style={{ borderTop: `1px solid ${C.rule}`, padding: '32px clamp(20px, 5vw, 64px)', background: C.paper2 }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <BrandLockup markSize={26} fontSize={17} />
          <div style={{ fontSize: 13, color: C.ink3 }}>© {new Date().getFullYear()} Rootin · 뿌리 깊은 학습 루틴</div>
        </div>
      </footer>
    </div>
  );
};
