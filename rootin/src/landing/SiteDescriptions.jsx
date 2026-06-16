import { motion } from 'framer-motion';
import { PenLine, Sprout, LineChart, Sparkles, ArrowRight, Flame, Check, ChevronDown } from 'lucide-react';
import { PixelPlant } from '../pixel-plants.jsx';
import { RootinWordmark } from './RootinWordmark.jsx';

// ──────────────────────────────────────────────────────────────
// 모니터(사파리)로 접속한 rootin.app — 실제 제품 사이트.
// Rootin 디자인(크림 paper + sage green) · 도트 식물 · 입체 카드 ·
// 스크롤 시 한 섹션씩 몰입감 있게 등장. 시작 버튼은 맨 아래 한 곳.
// ──────────────────────────────────────────────────────────────

const G = { sprout: '#2F8F54', deep: '#226E40', leaf: '#74C98C', mint: '#A6E0B6', terra: '#DD8A5B', amber: '#E6B14E' };
const PAPER = '#FBF7EE';
const PAPER2 = '#F3EEE0';
const INK = '#25342A';
const INK2 = '#5C6B60';
const INK3 = '#9AA69A';

// 메인 로고 — 화분 마스코트 (Rootin-logo-source.html 01)
const RootinMascot = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" aria-hidden="true" style={{ display: 'block' }}>
    <path d="M40 34 C50 34 58 28 60 17 C49 16 41 22 40 34 Z" fill={G.leaf} />
    <path d="M40 36 C30 36 22 30 20 19 C31 18 39 24 40 36 Z" fill={G.sprout} />
    <path d="M40 47 L40 30" fill="none" stroke={G.deep} strokeWidth="4" strokeLinecap="round" />
    <rect x="18" y="44" width="44" height="9" rx="4.5" fill="#E6996B" />
    <path d="M21 53 L59 53 L54.5 70 C54 72 52.4 73 50.4 73 L29.6 73 C27.6 73 26 72 25.5 70 Z" fill={G.terra} />
    <circle cx="34" cy="61" r="2" fill="#5A3A28" />
    <circle cx="46" cy="61" r="2" fill="#5A3A28" />
    <path d="M36 65.5 Q40 68.5 44 65.5" fill="none" stroke="#5A3A28" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const BrandLockup = ({ markSize = 30, fontSize = 21 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
    <RootinMascot size={markSize} />
    <span style={{ fontFamily: 'var(--font-display)', fontSize, fontWeight: 700, letterSpacing: '-0.02em', color: INK }}>
      <RootinWordmark leaf1={G.sprout} leaf2={G.leaf} animate={false} />
    </span>
  </div>
);

// ── 앱 화면 목업 ──
const GRASS_COLS = 20;
const GRASS_ROWS = 7;
const GRASS = Array.from({ length: GRASS_COLS * GRASS_ROWS }, (_, i) => Math.abs(Math.sin(i * 78.233 + 12.9898)));
const grassColor = (v) => (v < 0.2 ? '#EAF3EC' : v < 0.42 ? '#C3E6CD' : v < 0.62 ? '#8AD2A0' : v < 0.82 ? '#4FAE6E' : G.sprout);

const ScreenCard = ({ title, children, accent = G.sprout }) => (
  <div
    style={{
      background: '#FCFBF6',
      border: '1px solid #ECE6D6',
      borderRadius: 20,
      boxShadow: '0 30px 60px -24px rgba(34,52,38,0.35), 0 2px 6px rgba(34,52,38,0.05), inset 0 1px 0 #fff',
      overflow: 'hidden',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 15px', borderBottom: '1px solid #F0EBDC', background: 'linear-gradient(#fff,#FBF8F0)' }}>
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#E6C7BB' }} />
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#EFE0BD' }} />
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#CFE3D2' }} />
      <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 700, color: INK3 }}>{title}</span>
      <span style={{ marginLeft: 'auto', width: 26, height: 5, borderRadius: 3, background: accent, opacity: 0.5 }} />
    </div>
    <div style={{ padding: 18 }}>{children}</div>
  </div>
);

const StatTile = ({ icon, label, value, accent }) => (
  <div style={{ flex: 1, background: 'linear-gradient(160deg,#fff,#FBF7EC)', border: '1px solid #EFEADC', borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, boxShadow: '0 2px 8px rgba(34,52,38,0.04)' }}>
    <span style={{ width: 30, height: 30, borderRadius: 9, background: `${accent}1f`, color: accent, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
    <div style={{ fontFamily: 'var(--font-display)', fontSize: 25, fontWeight: 700, color: INK, lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 12.5, fontWeight: 600, color: INK3 }}>{label}</div>
  </div>
);

const DashboardMock = () => (
  <ScreenCard title="대시보드 · 이번 주" accent={G.sprout}>
    <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
      <StatTile icon={<Flame size={16} />} label="연속 기록" value="14일" accent={G.terra} />
      <StatTile icon={<PenLine size={16} />} label="이번 달 TIL" value="23개" accent={G.sprout} />
    </div>
    <div style={{ fontSize: 11.5, fontWeight: 700, color: INK3, marginBottom: 9 }}>지난 20주의 기록</div>
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${GRASS_COLS}, 1fr)`, gridAutoRows: '1fr', gap: 4 }}>
      {GRASS.map((v, i) => (
        <span key={i} style={{ aspectRatio: '1 / 1', borderRadius: 3, background: grassColor(v) }} />
      ))}
    </div>
  </ScreenCard>
);

const GARDEN = [
  { species: 'seed', stage: 'full', name: '알고리즘', pct: 100 },
  { species: 'rose', stage: 'bloom', name: 'CS 기초', pct: 72 },
  { species: 'cactus', stage: 'leaf', name: '리액트', pct: 45 },
];
const GardenMock = () => (
  <ScreenCard title="내 정원" accent={G.terra}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
      {GARDEN.map((p) => (
        <div key={p.name} style={{ background: 'linear-gradient(180deg,#fff,#F6FBF6)', border: '1px solid #EAE4D5', borderRadius: 14, padding: '14px 8px 12px', textAlign: 'center', boxShadow: '0 2px 8px rgba(34,52,38,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', filter: 'drop-shadow(0 4px 5px rgba(34,52,38,0.18))' }}>
            <PixelPlant species={p.species} stage={p.stage} size={58} />
          </div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: INK, margin: '8px 0 6px' }}>{p.name}</div>
          <div style={{ height: 5, borderRadius: 3, background: '#EDE7D8', overflow: 'hidden' }}>
            <div style={{ width: `${p.pct}%`, height: '100%', background: `linear-gradient(90deg,${G.leaf},${G.sprout})` }} />
          </div>
        </div>
      ))}
    </div>
  </ScreenCard>
);

const EditorMock = () => (
  <ScreenCard title="새 TIL" accent={G.amber}>
    <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: INK, marginBottom: 10 }}>오늘 배운 React useMemo</div>
    <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
      {['B', 'i', 'H1', '“ ”', '</>'].map((t) => (
        <span key={t} style={{ fontSize: 11, fontWeight: 700, color: INK2, background: '#F1ECDD', borderRadius: 7, padding: '4px 8px' }}>{t}</span>
      ))}
    </div>
    <div style={{ height: 8, borderRadius: 4, background: '#ECE6D6', marginBottom: 7, width: '92%' }} />
    <div style={{ height: 8, borderRadius: 4, background: '#ECE6D6', marginBottom: 14, width: '74%' }} />
    <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', background: '#EAF3EC', border: `1px solid ${G.mint}`, borderLeft: `3px solid ${G.sprout}`, borderRadius: 10, padding: '10px 12px' }}>
      <Sprout size={15} color={G.sprout} style={{ marginTop: 1, flexShrink: 0 }} />
      <span style={{ fontSize: 12.5, color: INK2, lineHeight: 1.5 }}>의존성이 같으면 계산을 건너뛴다 — 콜아웃으로 핵심만 정리.</span>
    </div>
  </ScreenCard>
);

const AiMock = () => (
  <ScreenCard title="AI 복습" accent={G.deep}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
      <Sparkles size={15} color={G.sprout} />
      <span style={{ fontSize: 12.5, fontWeight: 700, color: INK2 }}>오늘의 복습 퀴즈</span>
    </div>
    <div style={{ fontSize: 13.5, fontWeight: 700, color: INK, marginBottom: 12, lineHeight: 1.5 }}>Q. useMemo가 값을 다시 계산하는 조건은?</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {[{ t: '의존성 배열의 값이 바뀔 때', ok: true }, { t: '컴포넌트가 리렌더될 때마다', ok: false }].map((o) => (
        <div key={o.t} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, color: o.ok ? G.deep : INK2, background: o.ok ? '#EAF3EC' : '#fff', border: `1px solid ${o.ok ? G.mint : '#EFEADC'}`, borderRadius: 10, padding: '9px 11px' }}>
          <span style={{ width: 17, height: 17, borderRadius: '50%', flexShrink: 0, background: o.ok ? G.sprout : 'transparent', border: o.ok ? 'none' : '1.5px solid #DAD5C8', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            {o.ok && <Check size={11} color="#fff" strokeWidth={3} />}
          </span>
          {o.t}
        </div>
      ))}
    </div>
  </ScreenCard>
);

const FEATURES = [
  { n: '01', icon: PenLine, title: 'TIL 기록', desc: '노션 스타일 에디터로 오늘 배운 것을 가볍게 적습니다. 템플릿·태그·임시저장으로 기록의 문턱을 낮췄어요.', Mock: EditorMock },
  { n: '02', icon: Sprout, title: '식물 정원', desc: 'TIL을 쓰면 화분에 물이 차고 식물이 자랍니다. 씨앗부터 만개까지 키워 수확하고 도감을 채우세요.', Mock: GardenMock },
  { n: '03', icon: LineChart, title: '성장 대시보드', desc: '잔디 그래프와 연속 기록(스트릭), 관심사 분포로 나의 꾸준함이 눈에 보이는 결과로 쌓입니다.', Mock: DashboardMock },
  { n: '04', icon: Sparkles, title: 'AI 학습 도구', desc: '작성한 TIL을 AI가 요약하고 복습 문제를 만들어 줍니다. 흩어진 기록이 진짜 내 지식이 되도록.', Mock: AiMock },
];

const STAGES = [
  { stage: 'seed', label: '씨앗' },
  { stage: 'sprout', label: '새싹' },
  { stage: 'leaf', label: '잎' },
  { stage: 'bloom', label: '개화' },
  { stage: 'full', label: '만개' },
];

const Reveal = ({ children, x = 0, y = 56, delay = 0, amount = 0.4, className, style }) => (
  <motion.div
    initial={{ opacity: 0, x, y, scale: 0.96 }}
    whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
    viewport={{ once: true, amount }}
    transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    className={className}
    style={style}
  >
    {children}
  </motion.div>
);

export const SiteDescriptions = ({ onStart }) => {
  return (
    <div style={{ background: `radial-gradient(120% 60% at 80% 0%, #FFFDF7 0%, ${PAPER} 45%)`, color: INK, fontFamily: 'var(--font-body)' }}>

      {/* ── 사이트 헤더 ── */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px clamp(20px, 5vw, 64px)', background: 'rgba(251,247,238,0.7)', borderBottom: '1px solid #ECE6D6' }}>
        <BrandLockup />
        <nav style={{ display: 'flex', alignItems: 'center', gap: 'clamp(14px, 2.4vw, 30px)' }}>
          <span className="rootin-site-navlink">기능</span>
          <span className="rootin-site-navlink">정원</span>
          <span className="rootin-site-navlink">통계</span>
          <span className="rootin-site-navlink">AI</span>
        </nav>
      </header>

      {/* ── 히어로 ── */}
      <section style={{ minHeight: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 'clamp(40px, 8vh, 90px) clamp(20px, 5vw, 64px)', position: 'relative' }}>
        <Reveal y={30} amount={0.2}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 16px', borderRadius: 999, background: '#DCEFE2', color: G.deep, fontSize: 13, fontWeight: 800, boxShadow: 'inset 0 1px 0 #fff, 0 2px 8px rgba(34,110,64,0.1)' }}>
            <Sprout size={15} /> 매일의 TIL을 식물로
          </span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.4rem, 6vw, 5rem)', fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.035em', margin: '24px 0 0' }}>
            오늘 배운 것이<br />내일의 <span style={{ color: G.sprout }}>숲</span>이 됩니다
          </h1>
          <p style={{ margin: '24px auto 0', maxWidth: 560, fontSize: 'clamp(1.05rem, 1.6vw, 1.3rem)', lineHeight: 1.65, color: INK2 }}>
            Rootin은 매일의 학습 기록을 식물로 키우는 게임형 학습 습관 서비스입니다.
            꾸준함이 정원이 되어 눈에 보이는 성장으로 남습니다.
          </p>
        </Reveal>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.8 }}
          style={{ position: 'absolute', bottom: 'clamp(20px, 4vh, 44px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: INK3 }}
        >
          <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase' }}>스크롤</span>
          <motion.div animate={{ y: [0, 7, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}>
            <ChevronDown size={20} />
          </motion.div>
        </motion.div>
      </section>

      {/* ── 기능 (한 섹션씩 몰입) ── */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '0 clamp(20px, 5vw, 64px)' }}>
        <Reveal style={{ textAlign: 'center', padding: 'clamp(20px,4vh,40px) 0 clamp(28px,5vh,56px)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 12.5, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: G.sprout, marginBottom: 12 }}>왜 Rootin인가</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 3.6vw, 2.8rem)', fontWeight: 700, letterSpacing: '-0.025em', margin: 0 }}>기록이 성장이 되는 네 가지 방법</h2>
        </Reveal>

        {FEATURES.map((f, i) => {
          const mockLeft = i % 2 === 1;
          return (
            <article
              key={f.title}
              style={{ minHeight: '62vh', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(28px, 5vw, 72px)', alignItems: 'center', direction: mockLeft ? 'rtl' : 'ltr' }}
              className="rootin-site-feature"
            >
              <Reveal y={40} amount={0.4} style={{ direction: 'ltr' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 54, height: 54, borderRadius: 16, background: `linear-gradient(150deg, ${G.leaf}, ${G.sprout})`, color: '#fff', boxShadow: `0 10px 22px -6px ${G.sprout}99, inset 0 1px 0 rgba(255,255,255,0.4)` }}>
                    <f.icon size={25} strokeWidth={2} />
                  </span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 700, color: '#E7E0CF', lineHeight: 1 }}>{f.n}</span>
                </div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 2.6vw, 2.1rem)', fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 14px' }}>{f.title}</h3>
                <p style={{ fontSize: 'clamp(1rem, 1.4vw, 1.12rem)', lineHeight: 1.75, color: INK2, margin: 0, maxWidth: 430 }}>{f.desc}</p>
              </Reveal>
              <Reveal x={mockLeft ? -50 : 50} y={20} amount={0.4} style={{ direction: 'ltr' }}>
                <f.Mock />
              </Reveal>
            </article>
          );
        })}
      </section>

      {/* ── 성장 단계 (도트 식물) ── */}
      <section style={{ background: `linear-gradient(180deg, ${PAPER} 0%, ${PAPER2} 100%)`, padding: 'clamp(56px, 9vh, 110px) clamp(20px, 5vw, 64px)', marginTop: 'clamp(30px,6vh,70px)' }}>
        <Reveal style={{ maxWidth: 1180, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 12.5, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: INK3, marginBottom: 10 }}>하나의 TIL이 자라나는 길</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 3vw, 2.3rem)', fontWeight: 700, letterSpacing: '-0.025em', margin: '0 0 clamp(32px,5vh,56px)' }}>씨앗에서 만개까지</h2>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 'clamp(4px, 1.2vw, 16px)', flexWrap: 'wrap' }}>
            {STAGES.map((s, i) => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'flex-end', gap: 'clamp(4px, 1.2vw, 16px)' }}>
                <motion.div
                  initial={{ opacity: 0, y: 24, scale: 0.8 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: 0.5, delay: i * 0.12, ease: [0.34, 1.56, 0.64, 1] }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '18px 16px 14px', borderRadius: 18, background: 'linear-gradient(180deg,#fff,#FBF7EC)', border: '1px solid #EAE4D5', minWidth: 92, boxShadow: '0 14px 30px -14px rgba(34,52,38,0.3), inset 0 1px 0 #fff' }}
                >
                  <div style={{ filter: 'drop-shadow(0 5px 6px rgba(34,52,38,0.2))' }}>
                    <PixelPlant species="seed" stage={s.stage} size={54} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: INK2 }}>{s.label}</span>
                </motion.div>
                {i < STAGES.length - 1 && <ArrowRight size={18} color={G.leaf} strokeWidth={2.6} style={{ marginBottom: 28 }} />}
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ── 최종 CTA (시작 버튼은 여기 한 곳) ── */}
      <section style={{ padding: 'clamp(64px, 11vh, 150px) clamp(20px, 5vw, 64px)' }}>
        <Reveal style={{ maxWidth: 920, margin: '0 auto' }}>
          <div
            style={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 32,
              background: `linear-gradient(150deg, ${G.sprout} 0%, ${G.deep} 100%)`,
              color: '#F4FBF5',
              padding: 'clamp(44px, 7vw, 84px) clamp(28px, 5vw, 72px)',
              textAlign: 'center',
              boxShadow: `0 40px 80px -28px ${G.deep}, inset 0 1px 0 rgba(255,255,255,0.18)`,
            }}
          >
            <div style={{ position: 'absolute', top: -40, right: -10, opacity: 0.18 }}>
              <PixelPlant species="seed" stage="full" size={150} />
            </div>
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18, filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.25))' }}>
                <RootinMascot size={56} />
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.9rem, 3.6vw, 3rem)', fontWeight: 700, letterSpacing: '-0.025em', margin: 0, lineHeight: 1.16 }}>
                오늘, 첫 씨앗을 심어보세요
              </h2>
              <p style={{ margin: '16px auto 0', maxWidth: 480, fontSize: 'clamp(1rem,1.5vw,1.15rem)', lineHeight: 1.6, opacity: 0.9 }}>
                1분이면 충분합니다. 매일의 작은 기록이 모여 당신만의 정원으로 자라납니다.
              </p>
              <button
                type="button"
                onClick={onStart}
                className="rootin-site-cta"
                style={{ marginTop: 36, display: 'inline-flex', alignItems: 'center', gap: 10, padding: '17px 40px', borderRadius: 999, background: '#FBF7EE', color: G.deep, fontSize: 17, fontWeight: 800, border: 'none', cursor: 'pointer' }}
              >
                무료로 시작하기 <ArrowRight size={19} strokeWidth={2.6} />
              </button>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── 푸터 ── */}
      <footer style={{ borderTop: '1px solid #ECE6D6', padding: '32px clamp(20px, 5vw, 64px)', background: PAPER2 }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <BrandLockup markSize={26} fontSize={17} />
          <div style={{ fontSize: 13, color: INK3 }}>© {new Date().getFullYear()} Rootin · 뿌리 깊은 학습 루틴</div>
        </div>
      </footer>
    </div>
  );
};
