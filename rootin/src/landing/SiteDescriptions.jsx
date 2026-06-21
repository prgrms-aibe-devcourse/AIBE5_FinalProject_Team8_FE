import { motion, useInView, useReducedMotion } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { PenLine, Sprout, LineChart, Sparkles, ArrowRight, Flame, Check, ChevronDown } from 'lucide-react';
import { PixelPlant } from '../pixel-plants.jsx';
import { RootinWordmark } from './RootinWordmark.jsx';

// ──────────────────────────────────────────────────────────────
// 노트북(사파리)으로 접속한 rootin.app — 실제 제품 소개 화면.
// 한 화면에 하나의 장면. 스크롤하면 기능이 한 번에 하나씩 풀스크린으로 등장하고,
// 끝에서 씨앗이 흙에서 자라 만개하며 시작 CTA로 이어진다.
// 색은 실제 제품 토큰(warm sage), 타이포는 Space Grotesk. 배경은 레이어드
// 그라데이션 + 그레인 + 은은히 흐르는 빛. 구조의 동사(쓰다·기르다·확인하다·복습하다)가
// rootin의 하루 루프를 그대로 라벨링한다.
// 앵커 id(#intro/#features/#feature-*)·onStart·PixelPlant는 유지 — 히어로 메뉴 스크롤 의존.
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

// 종이 그레인 — 밋밋함을 없애는 미세 텍스처(데이터 URI, 외부 요청 없음)
const GRAIN = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

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

const BrandLockup = ({ markSize = 30, fontSize = 21, dark = false }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
    <RootinMascot size={markSize} />
    <span style={{ fontFamily: 'var(--font-display)', fontSize, fontWeight: 700, letterSpacing: '-0.02em', color: dark ? '#F6F2E7' : C.ink }}>
      <RootinWordmark leaf1={dark ? C.sprout : C.moss} leaf2={dark ? C.leaf : C.sprout} animate={false} />
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

// ── 제품 화면 목업: 따뜻한 카드 패널 ──
const Panel = ({ label, accent = C.moss, children }) => (
  <div
    style={{
      background: C.card,
      border: `1px solid ${C.rule}`,
      borderRadius: 22,
      boxShadow: '0 40px 80px -34px rgba(46,42,33,0.42), 0 4px 10px rgba(46,42,33,0.05), inset 0 1px 0 #fff',
      overflow: 'hidden',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '13px 17px', borderBottom: `1px solid ${C.paper2}`, background: `linear-gradient(${C.card}, #FBF6EA)` }}>
      <span style={{ width: 7, height: 7, borderRadius: 2, background: accent, transform: 'rotate(45deg)' }} />
      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.02em', color: C.ink2 }}>{label}</span>
      <span style={{ marginLeft: 'auto', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.16em', color: C.ink3 }}>ROOTIN</span>
    </div>
    <div style={{ padding: 20 }}>{children}</div>
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

// rootin의 하루 루프 — 동사 아이브로우가 순서를 의미로 만든다(01/02 숫자 대신)
const FEATURES = [
  { verb: '쓰다', anchor: 'feature-til', icon: PenLine, title: 'TIL 기록', desc: '노션 스타일 에디터로 오늘 배운 것을 가볍게 적습니다. 템플릿·태그·임시저장으로 기록의 문턱을 낮췄어요.', Mock: EditorMock, accent: C.honey },
  { verb: '기르다', anchor: 'feature-garden', icon: Sprout, title: '식물 정원', desc: 'TIL을 쓰면 화분에 물이 차고 식물이 자랍니다. 씨앗부터 만개까지 키워 수확하고 도감을 채우세요.', Mock: GardenMock, accent: C.coral },
  { verb: '확인하다', anchor: 'feature-dashboard', icon: LineChart, title: '성장 대시보드', desc: '잔디 그래프와 연속 기록(스트릭), 관심사 분포로 나의 꾸준함이 눈에 보이는 결과로 쌓입니다.', Mock: DashboardMock, accent: C.moss },
  { verb: '복습하다', anchor: 'feature-ai', icon: Sparkles, title: 'AI 학습 도구', desc: '작성한 TIL을 AI가 요약하고 복습 문제를 만들어 줍니다. 흩어진 기록이 진짜 내 지식이 되도록.', Mock: AiMock, accent: C.moss2 },
];

const STAGES = [
  { stage: 'seed', label: '씨앗', size: 46 },
  { stage: 'sprout', label: '새싹', size: 52 },
  { stage: 'leaf', label: '잎', size: 60 },
  { stage: 'bloom', label: '개화', size: 68 },
  { stage: 'full', label: '만개', size: 78 },
];

// 은은히 흐르는 빛 — 밋밋함 대신 깊이감. reduce면 정지.
const Glow = ({ color, top, left, size = 620, dur = 16, delay = 0 }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      aria-hidden="true"
      style={{ position: 'absolute', top, left, width: size, height: size, borderRadius: '50%', background: `radial-gradient(circle, ${color} 0%, transparent 68%)`, filter: 'blur(8px)', pointerEvents: 'none', zIndex: 0 }}
      animate={reduce ? {} : { x: [0, 40, -20, 0], y: [0, -30, 24, 0], scale: [1, 1.08, 0.96, 1] }}
      transition={{ duration: dur, repeat: Infinity, ease: 'easeInOut', delay }}
    />
  );
};

// 한 기능 = 한 화면. 비대칭 스플릿, 좌우 교차.
const FeatureScreen = ({ f, reverse }) => {
  const reduce = useReducedMotion();
  return (
    <section id={f.anchor} className="rootin-site-screen">
      <div className="rootin-site-screen-inner" style={{ direction: reverse ? 'rtl' : 'ltr' }}>
        <Reveal y={44} amount={0.4} style={{ direction: 'ltr' }}>
          <div className="rootin-site-eyebrow" style={{ color: f.accent }}>
            <span className="rootin-site-eyebrow-mark" style={{ background: f.accent }}>
              <f.icon size={15} strokeWidth={2.4} color="#fff" />
            </span>
            {f.verb}
          </div>
          <h3 className="rootin-site-feature-title">{f.title}</h3>
          <p className="rootin-site-feature-desc">{f.desc}</p>
        </Reveal>

        <div style={{ direction: 'ltr', position: 'relative' }}>
          {/* 목업 뒤 은은한 액센트 — 깊이감 */}
          <div aria-hidden="true" style={{ position: 'absolute', inset: '-12% -8%', background: `radial-gradient(60% 60% at 50% 45%, ${f.accent}22, transparent 70%)`, filter: 'blur(20px)', zIndex: 0 }} />
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 48, rotateX: 10 }}
            whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.85, ease: EASE }}
            whileHover={reduce ? {} : { y: -8 }}
            style={{ position: 'relative', zIndex: 1, perspective: 1100, maxWidth: 500, margin: '0 auto' }}
          >
            <f.Mock />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export const SiteDescriptions = ({ onStart }) => {
  const reduce = useReducedMotion();
  return (
    <div style={{ position: 'relative', background: `linear-gradient(180deg, #FBF7EE 0%, ${C.paper} 34%, ${C.paper2} 100%)`, color: C.ink, fontFamily: 'var(--font-body)', overflow: 'hidden' }}>
      {/* 배경 — 흐르는 빛 + 종이 그레인 */}
      <Glow color="rgba(230,177,78,0.16)" top="-6%" left="62%" size={680} dur={18} />
      <Glow color="rgba(79,124,82,0.14)" top="38%" left="-10%" size={640} dur={22} delay={2} />
      <Glow color="rgba(224,138,107,0.12)" top="74%" left="58%" size={600} dur={20} delay={1} />
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, backgroundImage: GRAIN, backgroundSize: '160px 160px', opacity: 0.05, mixBlendMode: 'multiply', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* ── 사이트 헤더 ── */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px clamp(20px, 5vw, 64px)', background: 'rgba(247,242,231,0.7)', borderBottom: `1px solid ${C.rule}`, backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 20 }}>
          <BrandLockup />
          <nav style={{ display: 'flex', alignItems: 'center', gap: 'clamp(14px, 2.4vw, 30px)' }}>
            <span className="rootin-site-navlink">기능</span>
            <span className="rootin-site-navlink">정원</span>
            <span className="rootin-site-navlink">통계</span>
            <span className="rootin-site-navlink">AI</span>
          </nav>
        </header>

        {/* ── 히어로 ── */}
        <section id="intro" className="rootin-site-screen rootin-site-screen--center" style={{ textAlign: 'center' }}>
          <motion.span
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 16px', borderRadius: 999, background: C.leaf, color: C.moss2, fontSize: 13, fontWeight: 800, boxShadow: 'inset 0 1px 0 #fff, 0 2px 10px rgba(79,124,82,0.12)' }}
          >
            <Sprout size={15} /> 매일의 TIL을 식물로
          </motion.span>

          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.6rem, 6.2vw, 5.2rem)', fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.04em', margin: '26px 0 0' }}>
            {['오늘 배운 것이', '뿌리 깊은 습관이 됩니다'].map((line, li) => (
              <span key={li} style={{ display: 'block', overflow: 'hidden', paddingBottom: '0.04em' }}>
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

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
            style={{ position: 'absolute', bottom: 'clamp(18px, 4vh, 40px)', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: C.ink3 }}
          >
            <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase' }}>스크롤</span>
            <motion.div animate={reduce ? {} : { y: [0, 7, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}>
              <ChevronDown size={20} />
            </motion.div>
          </motion.div>
        </section>

        {/* ── 기능 (한 화면에 하나씩) ── */}
        <div id="features">
          {FEATURES.map((f, i) => (
            <FeatureScreen key={f.anchor} f={f} reverse={i % 2 === 1} />
          ))}
        </div>

        {/* ── 피날레: 흙에서 자라는 성장 단계 ── */}
        <section className="rootin-site-screen rootin-site-screen--center" style={{ textAlign: 'center' }}>
          <Reveal amount={0.4}>
            <div className="rootin-site-eyebrow rootin-site-eyebrow--muted">하나의 TIL이 자라나는 길</div>
            <h2 className="rootin-site-section-title">씨앗에서 만개까지</h2>
          </Reveal>
          <div className="rootin-site-stages">
            {STAGES.map((s, i) => (
              <div key={s.label} className="rootin-site-stage">
                <motion.div
                  initial={reduce ? false : { scaleY: 0, opacity: 0 }}
                  whileInView={{ scaleY: 1, opacity: 1 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: 0.6, delay: i * 0.14, ease: [0.34, 1.4, 0.64, 1] }}
                  style={{ transformOrigin: 'bottom center', filter: 'drop-shadow(0 6px 7px rgba(46,42,33,0.22))' }}
                >
                  <PixelPlant species="seed" stage={s.stage} size={s.size} />
                </motion.div>
                <span className="rootin-site-stage-label">{s.label}</span>
              </div>
            ))}
            <div className="rootin-site-soil" aria-hidden="true" />
          </div>
        </section>

        {/* ── 피날레: 시작 CTA (풀블리드 다크 모스) ── */}
        <section className="rootin-site-cta-screen">
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, backgroundImage: GRAIN, backgroundSize: '160px 160px', opacity: 0.08, mixBlendMode: 'overlay', pointerEvents: 'none' }} />
          <div aria-hidden="true" style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: 560, height: 560, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,170,128,0.35), transparent 65%)', filter: 'blur(10px)', pointerEvents: 'none' }} />

          <div className="rootin-site-cta-inner">
            {/* 줄기가 자라 만개하는 마지막 한 컷 */}
            <div style={{ position: 'relative', width: 120, height: 132, margin: '0 auto 8px' }}>
              <svg viewBox="0 0 120 132" width="120" height="132" style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
                <motion.path
                  d="M60 130 C60 104 50 92 50 74 C50 60 60 54 60 40"
                  fill="none" stroke={C.sprout} strokeWidth="3.4" strokeLinecap="round"
                  initial={reduce ? false : { pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: 1.1, ease: EASE }}
                />
              </svg>
              <motion.div
                initial={reduce ? false : { scale: 0, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.9 }}
                style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', filter: 'drop-shadow(0 8px 12px rgba(0,0,0,0.3))' }}
              >
                <PixelPlant species="seed" stage="full" size={86} />
              </motion.div>
            </div>

            <Reveal y={28} amount={0.5}>
              <h2 className="rootin-site-cta-title">오늘, 첫 씨앗을 심어보세요</h2>
              <p className="rootin-site-cta-desc">1분이면 충분합니다. 매일의 작은 기록이 모여 당신만의 정원으로 자라납니다.</p>
              <button type="button" onClick={onStart} className="rootin-site-cta">
                무료로 시작하기 <ArrowRight size={19} strokeWidth={2.6} />
              </button>
            </Reveal>
          </div>

          <footer className="rootin-site-footer">
            <BrandLockup markSize={26} fontSize={17} dark />
            <div style={{ fontSize: 13, color: 'rgba(246,242,231,0.6)' }}>© {new Date().getFullYear()} Rootin · 뿌리 깊은 학습 루틴</div>
          </footer>
        </section>
      </div>
    </div>
  );
};
