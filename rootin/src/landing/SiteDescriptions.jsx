import { motion, AnimatePresence, useInView, useReducedMotion, useMotionValue, useMotionValueEvent, useAnimationControls } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { PenLine, Sprout, LineChart, Sparkles, ArrowRight, Check, Trophy, Folder, Trash2, Wifi, BatteryFull } from 'lucide-react';
import { PixelPlant } from '../pixel-plants.jsx';
import { RootinWordmark } from './RootinWordmark.jsx';

// ──────────────────────────────────────────────────────────────
// 모니터가 켜지면 나타나는 warm-sage 맥OS 데스크톱.
// 스크롤(=launchProgress)을 내리면 Dock의 앱이 하나씩 바운스하며 실행되고,
// 창이 Dock에서 지니(scale)로 열리며 그 앱의 설명이 함께 등장한다.
// 창은 닫히지 않고 카스케이드로 쌓여, 끝엔 4개 앱이 모두 떠 있는 데스크톱이 된다.
// 마지막엔 스포트라이트 CTA(첫 씨앗 심기)로 마무리.
//
// 기능 콘텐츠(EditorMock·GardenMock·DashboardMock·AiMock)와 토큰·PixelPlant는 그대로 재사용.
// onStart(시작 CTA)와 메뉴 앵커(intro/features/feature-garden/feature-ai)는
// MonitorSection이 launchProgress 스텝으로 매핑하므로 그대로 보존된다.
// ──────────────────────────────────────────────────────────────

// warm sage 디자인 토큰의 라이트 값(데스크톱 안 제품 화면은 항상 정규 라이트)
const C = {
  paper: '#F7F2E7', paper2: '#F1EAD9', card: '#FFFDF7',
  ink: '#2E2A21', ink2: '#6C6353', ink3: '#9A9082',
  moss: '#4F7C52', moss2: '#38593B', sprout: '#6CA15C', leaf: '#E4EEDD',
  coral: '#E08A6B', honey: '#E6B14E',
  rule: '#E8DFCC', rule2: '#DBCFB6',
};

const EASE = [0.22, 1, 0.36, 1];
const SPRING = { type: 'spring', stiffness: 210, damping: 24 };

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

// ── 애니메이션 지표 링 — 인뷰에서 호가 채워지고 숫자가 오른다 ──
function RingMetric({ value, max, label, suffix = '', accent = C.moss, size = 92 }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const radius = size / 2 - 9;
  const circ = 2 * Math.PI * radius;
  const pct = Math.min(1, value / max);
  return (
    <div ref={ref} style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={C.paper2} strokeWidth="9" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={accent} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={circ}
          initial={reduce ? { strokeDashoffset: circ * (1 - pct) } : { strokeDashoffset: circ }}
          animate={{ strokeDashoffset: inView ? circ * (1 - pct) : circ }}
          transition={{ duration: 1.2, ease: EASE }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 23, fontWeight: 700, color: C.ink, lineHeight: 1, letterSpacing: '-0.02em' }}><CountUp to={value} suffix={suffix} /></span>
        <span style={{ fontSize: 10, fontWeight: 700, color: C.ink3, marginTop: 3 }}>{label}</span>
      </div>
    </div>
  );
}

// ── 제품 화면 목업: 따뜻한 카드 패널 ──
const Panel = ({ label, accent = C.moss, children }) => (
  <div
    style={{
      background: C.card,
      border: `1px solid ${C.rule}`,
      borderRadius: 16,
      boxShadow: '0 18px 40px -24px rgba(46,42,33,0.32), inset 0 1px 0 #fff',
      overflow: 'hidden',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 15px', borderBottom: `1px solid ${C.paper2}`, background: `linear-gradient(${C.card}, #FBF6EA)` }}>
      <span style={{ width: 7, height: 7, borderRadius: 2, background: accent, transform: 'rotate(45deg)' }} />
      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.02em', color: C.ink2 }}>{label}</span>
      <span style={{ marginLeft: 'auto', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.16em', color: C.ink3 }}>ROOTIN</span>
    </div>
    <div style={{ padding: 18 }}>{children}</div>
  </div>
);

const MiniStat = ({ icon, label, value, suffix, accent }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: `linear-gradient(160deg,#fff,#FBF6EA)`, border: `1px solid ${C.rule}`, borderRadius: 12, padding: '9px 12px', boxShadow: '0 2px 8px rgba(46,42,33,0.04)' }}>
    <span style={{ width: 28, height: 28, borderRadius: 8, background: `${accent}22`, color: accent, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</span>
    <div style={{ lineHeight: 1.15 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: C.ink, letterSpacing: '-0.01em' }}><CountUp to={value} suffix={suffix} /></div>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: C.ink3 }}>{label}</div>
    </div>
  </div>
);

// 잔디(컨트리뷰션) — 인뷰에서 좌→우 웨이브로 채워진다
const GRASS_COLS = 20;
const GRASS_ROWS = 7;
const GRASS = Array.from({ length: GRASS_COLS * GRASS_ROWS }, (_, i) => Math.abs(Math.sin(i * 78.233 + 12.9898)));
const grassColor = (v) => (v < 0.2 ? '#EFE7D4' : v < 0.42 ? '#CDE3BD' : v < 0.62 ? '#9CCB86' : v < 0.82 ? C.sprout : C.moss);

const GrassGrid = () => {
  const reduce = useReducedMotion();
  // 칸마다 모션을 걸면 140개가 동시에 애니메이션돼 무겁다 → 컨테이너 하나만 부드럽게 등장
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.55, ease: EASE }}
      style={{ display: 'grid', gridTemplateColumns: `repeat(${GRASS_COLS}, 1fr)`, gridAutoRows: '1fr', gap: 4 }}
    >
      {GRASS.map((v, i) => (
        <span key={i} style={{ aspectRatio: '1 / 1', borderRadius: 3, background: grassColor(v) }} />
      ))}
    </motion.div>
  );
};

const DashboardMock = () => (
  <Panel label="대시보드 · 이번 주" accent={C.moss}>
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
      <RingMetric value={14} max={21} label="연속" suffix="일" accent={C.coral} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <MiniStat icon={<PenLine size={14} />} label="이번 달 TIL" value={23} suffix="개" accent={C.moss} />
        <MiniStat icon={<Trophy size={14} />} label="수확한 식물" value={6} suffix="종" accent={C.honey} />
      </div>
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
              <PixelPlant species={p.species} stage={p.stage} size={54} />
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

// rootin의 하루 루프 — 각 동사가 Dock의 한 앱이 된다.
// id는 히어로 메뉴 앵커와 일치(MonitorSection이 launchProgress 스텝으로 매핑).
const APPS = [
  {
    id: 'feature-til', dockLabel: '에디터', verb: '쓰다', title: 'TIL 기록',
    desc: '노션 스타일 에디터로 오늘 배운 것을 가볍게. 템플릿·태그·임시저장으로 기록의 문턱을 낮췄어요.',
    accent: C.honey, Icon: PenLine, Mock: EditorMock,
  },
  {
    id: 'feature-garden', dockLabel: '정원', verb: '기르다', title: '식물 정원',
    desc: 'TIL을 쓰면 화분에 물이 차고 식물이 자랍니다. 씨앗부터 만개까지 키워 도감을 채우세요.',
    accent: C.coral, Icon: Sprout, Mock: GardenMock,
  },
  {
    id: 'feature-dashboard', dockLabel: '통계', verb: '확인하다', title: '성장 대시보드',
    desc: '잔디 그래프와 연속 기록(스트릭)으로 나의 꾸준함이 눈에 보이는 결과로 쌓입니다.',
    accent: C.moss, Icon: LineChart, Mock: DashboardMock,
  },
  {
    id: 'feature-ai', dockLabel: 'AI 복습', verb: '복습하다', title: 'AI 학습 도구',
    desc: '작성한 TIL을 AI가 요약하고 복습 문제를 만들어 줍니다. 흩어진 기록이 진짜 지식이 되도록.',
    accent: C.moss2, Icon: Sparkles, Mock: AiMock,
  },
];

// launchProgress(0→1) 위의 각 앱이 열리는 지점 / 피날레 진입 지점
const APP_OPEN_AT = [0.10, 0.30, 0.50, 0.70];
const FINALE_AT = 0.90;
// 메뉴 앵커 → launchProgress 타깃(해당 앱이 막 또렷해지는 지점)
export const ANCHOR_LP = {
  intro: 0.02,
  features: 0.20,
  'feature-til': 0.20,
  'feature-garden': 0.40,
  'feature-dashboard': 0.60,
  'feature-ai': 0.80,
};

// 은은히 흐르는 빛 — 밋밋함 대신 깊이감. reduce면 정지.
const Glow = ({ color, top, left, size = 620, dur = 16, delay = 0 }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      aria-hidden="true"
      style={{ position: 'absolute', top, left, width: size, height: size, borderRadius: '50%', background: `radial-gradient(circle, ${color} 0%, transparent 68%)`, pointerEvents: 'none', willChange: 'transform' }}
      animate={reduce ? {} : { x: [0, 40, -20, 0], y: [0, -30, 24, 0], scale: [1, 1.08, 0.96, 1] }}
      transition={{ duration: dur, repeat: Infinity, ease: 'easeInOut', delay }}
    />
  );
};

// ── 바탕화면 — warm-sage 오로라(흐르는 색 블룸) + 시트닝 + 비네트 + 그레인 ──
// macOS Sonoma풍의 매끈한 그라데이션을 brand 팔레트로. 비네트로 깊이를 줘 창이 떠 보인다.
const Wallpaper = () => (
  <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
    {/* 베이스 — 대각 그라데이션(세이지 → 크림 → 따뜻한 모래) */}
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(148deg, #D6E8C2 0%, #E7E0CC 36%, #F1E5CE 60%, #ECD3BA 100%)' }} />
    {/* 흐르는 색 블룸 — 깊이와 생기 */}
    <Glow color="rgba(95,124,82,0.40)" top="-20%" left="-12%" size={680} dur={24} />
    <Glow color="rgba(230,177,78,0.34)" top="30%" left="58%" size={720} dur={28} delay={2} />
    <Glow color="rgba(224,138,107,0.28)" top="66%" left="4%" size={600} dur={26} delay={1} />
    <Glow color="rgba(124,170,128,0.26)" top="56%" left="74%" size={520} dur={22} delay={3} />
    {/* 상단 시트닝 — 빛이 위에서 떨어지는 느낌 */}
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '46%', background: 'linear-gradient(180deg, rgba(255,255,255,0.4), transparent)', pointerEvents: 'none' }} />
    {/* 비네트 — 가장자리를 살짝 눌러 창이 떠오르게 */}
    <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 240px 50px rgba(58,48,28,0.30)', pointerEvents: 'none' }} />
    {/* 그레인 */}
    <div style={{ position: 'absolute', inset: 0, backgroundImage: GRAIN, backgroundSize: '160px 160px', opacity: 0.06, mixBlendMode: 'multiply', pointerEvents: 'none' }} />
  </div>
);

// ── 상단 메뉴바 — 노치 좌우로 항목 분리 ──
const MenuBar = ({ activeApp }) => (
  <div className="rootin-os-menubar">
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <RootinMascot size={17} />
      <span style={{ fontWeight: 800, color: C.ink }}>Rootin</span>
      <span className="rootin-os-menu" style={{ fontWeight: 700, color: C.ink }}>{activeApp ? activeApp.dockLabel : '파일'}</span>
      <span className="rootin-os-menu">편집</span>
      <span className="rootin-os-menu">보기</span>
      <span className="rootin-os-menu">정원</span>
    </div>
    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 13, color: C.ink2 }}>
      <Wifi size={15} strokeWidth={2.2} />
      <BatteryFull size={17} strokeWidth={2} />
      <span style={{ fontWeight: 700, fontSize: 12 }}>오후 2:14</span>
    </div>
  </div>
);

// ── Dock 아이콘 타일 ──
const AppTile = ({ Icon, accent, size = 46 }) => (
  <span className="rootin-os-app-tile" style={{ width: size, height: size, background: `linear-gradient(155deg, ${accent}, ${accent})` }}>
    <span style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', background: 'linear-gradient(180deg, rgba(255,255,255,0.35), transparent 55%)' }} />
    <Icon size={size * 0.5} color="#fff" strokeWidth={2.2} style={{ position: 'relative' }} />
  </span>
);

// ── Dock의 한 앱 — 열릴 때 한 번 바운스 + 실행 점 ──
const DockApp = ({ app, open, reduce }) => {
  const controls = useAnimationControls();
  const prev = useRef(open);
  useEffect(() => {
    if (open && !prev.current && !reduce) {
      controls.start({ y: [0, -16, 0], transition: { duration: 0.55, times: [0, 0.4, 1], ease: 'easeOut' } });
    }
    prev.current = open;
  }, [open, reduce, controls]);
  return (
    <div className="rootin-os-app">
      <motion.div animate={controls} whileHover={reduce ? {} : { y: -6 }} style={{ position: 'relative', display: 'inline-flex' }}>
        <AppTile Icon={app.Icon} accent={app.accent} />
      </motion.div>
      <motion.span
        className="rootin-os-app-dot"
        initial={false}
        animate={{ opacity: open ? 1 : 0 }}
        transition={{ duration: 0.25 }}
      />
    </div>
  );
};

const DecoTile = ({ children, bg }) => (
  <div className="rootin-os-app">
    <span className="rootin-os-app-tile" style={{ width: 46, height: 46, background: bg }}>
      <span style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', background: 'linear-gradient(180deg, rgba(255,255,255,0.35), transparent 55%)' }} />
      <span style={{ position: 'relative', display: 'inline-flex' }}>{children}</span>
    </span>
    <span className="rootin-os-app-dot" style={{ opacity: 0 }} />
  </div>
);

const Dock = ({ openCount, reduce }) => (
  <div className="rootin-os-dock">
    <DecoTile bg="linear-gradient(155deg,#7FB1E6,#4F86C9)"><Folder size={24} color="#fff" strokeWidth={2.1} /></DecoTile>
    <span className="rootin-os-dock-sep" />
    {APPS.map((app, i) => (
      <DockApp key={app.id} app={app} open={i < openCount} reduce={reduce} />
    ))}
    <span className="rootin-os-dock-sep" />
    <DecoTile bg="linear-gradient(155deg,#C9C2B4,#9C9486)"><Trash2 size={22} color="#fff" strokeWidth={2.1} /></DecoTile>
  </div>
);

// ── 앱 윈도우 — Dock에서 지니로 열려 카스케이드 슬롯으로. 좌측에 설명, 우측에 제품샷 ──
const BASE_SHADOW = '0 54px 96px -34px rgba(28,24,16,0.6), 0 16px 40px -18px rgba(28,24,16,0.42), inset 0 1px 0 rgba(255,255,255,0.9)';

const AppWindow = ({ app, geo, rel, z, isActive, compact, reduce }) => {
  const targetLeft = geo.groupLeft + geo.index * geo.stepX;
  const targetTop = geo.groupTop + geo.index * geo.stepY;
  const scale = Math.max(0.84, 1 + rel * 0.03);
  const Mock = app.Mock;
  const Icon = app.Icon;

  const initial = reduce
    ? { opacity: 0 }
    : { opacity: 0, left: geo.dockLeft, top: geo.dockTop, scale: 0.2 };
  const animate = reduce
    ? { opacity: 1, left: targetLeft, top: targetTop, scale: 1 }
    : { opacity: 1, left: targetLeft, top: targetTop, scale };
  const exit = reduce
    ? { opacity: 0 }
    : { opacity: 0, left: geo.dockLeft, top: geo.dockTop, scale: 0.2 };

  // 활성 창은 자기 앱 색으로 은은한 글로우를 입어 또렷하게 떠오른다
  const shadow = isActive ? `${BASE_SHADOW}, 0 0 0 1px ${app.accent}33, 0 36px 70px -28px ${app.accent}66` : BASE_SHADOW;

  return (
    <motion.div
      className={`rootin-os-window${compact ? ' is-compact' : ''}`}
      style={{ width: geo.windowW, height: geo.windowH, zIndex: z, transformOrigin: 'center bottom', boxShadow: shadow }}
      initial={initial}
      animate={animate}
      exit={exit}
      transition={reduce ? { duration: 0.3 } : { ...SPRING, opacity: { duration: 0.3 } }}
    >
      <div className="rootin-os-window-bar">
        <span className="rootin-os-traffic" style={{ background: '#ED6A5E' }} />
        <span className="rootin-os-traffic" style={{ background: '#F4BF4F' }} />
        <span className="rootin-os-traffic" style={{ background: '#61C554' }} />
        <span className="rootin-os-window-title">
          <span style={{ width: 12, height: 12, borderRadius: 4, background: app.accent, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)' }} />
          {app.dockLabel} — Rootin
        </span>
        <span style={{ width: 54 }} />
      </div>

      <div className="rootin-os-window-body">
        {/* 좌: 설명 패널 */}
        <div className="rootin-os-win-explain">
          <span style={{ width: 44, height: 44, borderRadius: 13, background: `linear-gradient(155deg, ${app.accent}, ${app.accent})`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative', boxShadow: `inset 0 1px 0 rgba(255,255,255,0.45), 0 6px 16px -6px ${app.accent}99` }}>
            <span style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', background: 'linear-gradient(180deg, rgba(255,255,255,0.35), transparent 55%)' }} />
            <Icon size={22} color="#fff" strokeWidth={2.3} style={{ position: 'relative' }} />
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 15.5, fontWeight: 800, color: app.accent, letterSpacing: '-0.01em', marginTop: compact ? 12 : 18 }}>{app.verb}</span>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: compact ? 21 : 25, fontWeight: 700, color: C.ink, letterSpacing: '-0.025em', lineHeight: 1.1, margin: '6px 0 0' }}>{app.title}</h3>
          <p style={{ margin: '12px 0 0', fontSize: 13.5, lineHeight: 1.66, color: C.ink2, flex: 1 }}>{app.desc}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 14, fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', color: C.ink3 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: app.accent }} />
            ROOTIN 앱
          </div>
        </div>

        {/* 우: 제품샷 */}
        <div className="rootin-os-win-mock">
          <Mock />
        </div>
      </div>

      {/* 비활성 창은 살짝 디밍 — 최신 창이 또렷하게 읽힌다 */}
      <motion.div
        aria-hidden="true"
        initial={false}
        animate={{ opacity: isActive ? 0 : 0.2 }}
        transition={{ duration: 0.4 }}
        style={{ position: 'absolute', inset: 0, background: '#1C1810', pointerEvents: 'none', borderRadius: 'inherit' }}
      />
    </motion.div>
  );
};

// ── 피날레 — 데스크톱 위 스포트라이트 CTA(첫 씨앗 심기) ──
const SpotlightCTA = ({ onStart, reduce }) => (
  <motion.div
    className="rootin-os-spotlight"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.5 }}
  >
    <div style={{ position: 'relative', textAlign: 'center', maxWidth: 520, padding: '0 20px' }}>
      <motion.div
        initial={reduce ? false : { scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.1 }}
        style={{ display: 'flex', justifyContent: 'center', filter: 'drop-shadow(0 10px 16px rgba(0,0,0,0.4))', marginBottom: 14 }}
      >
        <PixelPlant species="seed" stage="full" size={88} />
      </motion.div>
      <motion.h2
        initial={reduce ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2, ease: EASE }}
        style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 700, letterSpacing: '-0.035em', lineHeight: 1.14, color: '#F6F2E7', margin: 0 }}
      >
        오늘, 첫 씨앗을 심어보세요
      </motion.h2>
      <motion.p
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.32, ease: EASE }}
        style={{ margin: '16px auto 0', maxWidth: 440, fontSize: 'clamp(1rem, 1.5vw, 1.12rem)', lineHeight: 1.65, color: 'rgba(246,242,231,0.86)' }}
      >
        1분이면 충분합니다. 매일의 작은 기록이 모여 당신만의 정원으로 자라납니다.
      </motion.p>
      <motion.button
        type="button"
        onClick={onStart}
        className="rootin-os-cta"
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.44, ease: EASE }}
      >
        무료로 시작하기 <ArrowRight size={19} strokeWidth={2.6} />
      </motion.button>
      <div style={{ marginTop: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'rgba(246,242,231,0.6)' }}>
        <BrandLockup markSize={22} fontSize={15} dark />
        <span style={{ fontSize: 12.5 }}>© {new Date().getFullYear()} Rootin · 뿌리 깊은 학습 루틴</span>
      </div>
    </div>
  </motion.div>
);

// ──────────────────────────────────────────────────────────────
// 데스크톱 씬 — launchProgress로 앱 실행 수(openCount)와 피날레를 구동.
// (export 이름은 MonitorSection 호환을 위해 SiteDescriptions 유지)
// ──────────────────────────────────────────────────────────────
export const SiteDescriptions = ({ onStart, launchProgress }) => {
  const reduce = useReducedMotion();
  const fallback = useMotionValue(1); // launchProgress 미전달 시 정적으로 전부 열림
  const lp = launchProgress ?? fallback;

  const sceneRef = useRef(null);
  const [size, setSize] = useState({ w: 1200, h: 700 });
  const [openCount, setOpenCount] = useState(0);
  const [finale, setFinale] = useState(false);

  useEffect(() => {
    const el = sceneRef.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const apply = (v) => {
    let n = 0;
    for (const t of APP_OPEN_AT) if (v >= t) n++;
    setOpenCount(n);
    setFinale(v >= FINALE_AT);
  };
  useEffect(() => {
    const v = lp.get();
    let n = 0;
    for (const t of APP_OPEN_AT) if (v >= t) n++;
    setOpenCount(n);
    setFinale(v >= FINALE_AT);
  }, [lp]);
  useMotionValueEvent(lp, 'change', apply);

  const activeIndex = openCount - 1;
  const activeApp = activeIndex >= 0 ? APPS[activeIndex] : null;

  // 카스케이드 기하 — 열린 창들을 한 그룹으로 중앙 정렬(새 창이 열리면 자리를 내준다)
  const compact = size.w < 820;
  const windowW = Math.round(compact ? Math.min(size.w * 0.94, 640) : Math.min(size.w * 0.74, 920));
  const windowH = Math.round(compact ? Math.min(size.h * 0.66, 580) : Math.min(size.h * 0.72, 600));
  const stepX = compact ? Math.round(size.w * 0.035) : 56;
  const stepY = compact ? Math.round(size.h * 0.038) : 38;
  const span = Math.max(0, openCount - 1);
  const groupLeft = (size.w - windowW - span * stepX) / 2;
  const topInset = 30; // 메뉴바
  const groupTop = topInset + Math.max(8, (size.h - topInset - 100 - windowH - span * stepY) / 2);
  const dockLeft = size.w / 2 - windowW / 2;
  const dockTop = size.h - 64 - windowH / 2;

  return (
    <div ref={sceneRef} className="rootin-os">
      <Wallpaper />
      <MenuBar activeApp={activeApp} />

      {/* 카스케이드로 쌓이는 앱 창들 (각 창이 자기 설명을 품는다) */}
      <AnimatePresence>
        {APPS.slice(0, openCount).map((app, i) => (
          <AppWindow
            key={app.id}
            app={app}
            rel={i - activeIndex}
            z={10 + i}
            isActive={i === activeIndex}
            compact={compact}
            reduce={reduce}
            geo={{ index: i, groupLeft, groupTop, stepX, stepY, windowW, windowH, dockLeft, dockTop }}
          />
        ))}
      </AnimatePresence>

      <Dock openCount={openCount} reduce={reduce} />

      {/* 피날레 CTA */}
      <AnimatePresence>
        {finale && <SpotlightCTA key="cta" onStart={onStart} reduce={reduce} />}
      </AnimatePresence>
    </div>
  );
};
