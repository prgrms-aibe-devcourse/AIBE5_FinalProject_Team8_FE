import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext.jsx';
import { useSidebar } from '@/components/ui/sidebar';

// 좌측 사이드바 — Claude Design "사이드바 컴포넌트 제작"의 Sidebar.dc.html 디자인 적용.
// 디자인 마크업/스타일은 그대로 두되, 색은 프로젝트 토큰(--sidebar/--moss/--ink ...)에
// 매핑해 다크모드까지 적응한다. 기능(네비게이션·로고 이동·연속기록·로그아웃·포커스모드
// 숨김)은 기존 동작을 그대로 연결한다.

const ICONS = {
  home: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" /><path d="M9 21v-6h6v6" /></svg>
  ),
  garden: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21V9" /><path d="M12 9C12 6 9.5 4 6 4c0 3.5 2.5 5 6 5z" /><path d="M12 12c0-2.5 2-4.5 5-4.5 0 3-2 4.5-5 4.5z" /><path d="M7 21h10" /></svg>
  ),
  book: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M9 7h6" /><path d="M9 11h4" /></svg>
  ),
  ai: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /><circle cx="12" cy="12" r="2.2" /></svg>
  ),
  user: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3.4" /><path d="M5 20c0-3.6 3.1-5.5 7-5.5s7 1.9 7 5.5" /></svg>
  ),
};

const MENU = [
  { key: 'dashboard', label: '대시보드', icon: 'home' },
  { key: 'garden', label: '정원', icon: 'garden' },
  { key: 'collection', label: '식물도감', icon: 'book' },
  { key: 'ai', label: 'AI 학습', icon: 'ai' },
  { key: 'profile', label: '프로필', icon: 'user' },
];

const STEP = 52; // 48px 높이 + 4px 간격
const WIDTH_EXPANDED = 278; // 펼친 사이드바 너비(px)
const WIDTH_COLLAPSED = 78; // 접은 사이드바 너비(px)

export function RootinSidebarLeft({ current, onNav, onLogout, onCollapseChange }) {
  const { user } = useUser();
  const navigate = useNavigate();
  const { open: providerOpen, toggleSidebar } = useSidebar();
  const [collapsed, setCollapsed] = useState(false);
  const [hovered, setHovered] = useState(-1);
  const logoRef = useRef(null);

  // 접힘 상태가 바뀌면 줄어든 너비(px)를 부모에 알린다.
  // 에디터 본문이 이 값만큼 padding-left로 보정돼 좌우로 밀리지 않는다.
  // paint 전에 동기 적용해 사이드바 width 애니메이션과 시작 프레임을 맞춘다.
  useLayoutEffect(() => {
    onCollapseChange?.(collapsed ? WIDTH_EXPANDED - WIDTH_COLLAPSED : 0);
  }, [collapsed, onCollapseChange]);

  // Cmd+B / Ctrl+B 단축키를 가로채 Shadcn의 providerOpen 토글 대신 collapsed 토글로 연결한다.
  // capture phase로 등록해 Shadcn의 window bubble 핸들러보다 먼저 실행되도록 한다.
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        e.stopImmediatePropagation();
        setCollapsed((c) => !c);
      }
    };
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, []);

  const activeIndex = MENU.findIndex((m) => m.key === current);
  const labelOpacity = collapsed ? 0 : 1;
  const streak = user?.streak ?? 0;
  const best = user?.bestStreak ?? 0;
  const streakAccent = 'color-mix(in oklch, var(--amber) 78%, var(--ink))';

  const wiggleLogo = () => {
    const el = logoRef.current;
    if (!el) return;
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = 'rootinSprout 0.6s ease';
  };

  const handleLogoClick = () => {
    wiggleLogo();
    navigate(user ? '/dashboard' : '/');
  };

  return (
    <>
    {!providerOpen && (
      <button
        type="button"
        onClick={toggleSidebar}
        className="rl-reopen"
        title="사이드바 열기"
        aria-label="사이드바 열기"
        style={{ position: 'fixed', top: 23, left: 0, width: 28, height: 34, display: 'grid', placeItems: 'center', border: 'none', background: 'var(--moss)', borderRadius: '0 11px 11px 0', cursor: 'pointer', color: 'var(--on-primary)', boxShadow: '3px 3px 12px -4px color-mix(in oklch, var(--moss) 75%, transparent)', transition: 'background 0.2s ease', zIndex: 50 }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
      </button>
    )}
    <aside
      className="rootin-sidebar-left"
      style={{
        width: !providerOpen ? '0px' : collapsed ? `${WIDTH_COLLAPSED}px` : `${WIDTH_EXPANDED}px`,
        flex: '0 0 auto',
        height: '100vh',
        position: 'sticky',
        top: 0,
        background: 'var(--sidebar)',
        borderRight: providerOpen ? '1px solid var(--sidebar-border)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        opacity: providerOpen ? 1 : 0,
        pointerEvents: providerOpen ? 'auto' : 'none',
        fontFamily: 'var(--font-body)',
        transition: 'width 0.42s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
      }}
    >
      {/* Brand — Rootin-logo-source.html 마스코트 락업 (웃는 화분 + 새싹 / Fredoka 워드마크) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '20px 18px 16px', whiteSpace: 'nowrap' }}>
        <div
          ref={logoRef}
          onClick={handleLogoClick}
          style={{ flex: '0 0 auto', width: 38, height: 38, display: 'grid', placeItems: 'center', cursor: 'pointer' }}
        >
          <svg width="36" height="36" viewBox="0 0 80 80" aria-label="Rootin">
            <path d="M40 34 C50 34 58 28 60 17 C49 16 41 22 40 34 Z" fill="#74C98C" />
            <path d="M40 36 C30 36 22 30 20 19 C31 18 39 24 40 36 Z" fill="#2F8F54" />
            <path d="M40 47 L40 30" fill="none" stroke="#226E40" strokeWidth="4" strokeLinecap="round" />
            <rect x="18" y="44" width="44" height="9" rx="4.5" fill="#E6996B" />
            <path d="M21 53 L59 53 L54.5 70 C54 72 52.4 73 50.4 73 L29.6 73 C27.6 73 26 72 25.5 70 Z" fill="#DD8A5B" />
            <circle cx="34" cy="61" r="2" fill="#5A3A28" />
            <circle cx="46" cy="61" r="2" fill="#5A3A28" />
            <path d="M36 65.5 Q40 68.5 44 65.5" fill="none" stroke="#5A3A28" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, opacity: labelOpacity, transition: 'opacity 0.25s ease' }}>
          <span style={{ fontFamily: "'Fredoka', var(--font-body)", fontSize: 22, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.05, letterSpacing: '-0.015em' }}>Root<span style={{ position: 'relative' }}>ı<svg viewBox="0 0 30 20" style={{ width: '0.42em', height: '0.29em', position: 'absolute', left: '50%', bottom: '0.71em', transform: 'translateX(-50%)' }}><path d="M15 18 C9 18 5 15 4 8 C12 8 16 12 15 18 Z" fill="#2F8F54" /><path d="M15 16 C21 16 25 13 26 6 C18 6 14 10 15 16 Z" fill="#74C98C" /></svg></span>n</span>
          <span style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 3 }}>매일의 학습이 자라는 곳</span>
        </div>
      </div>

      {/* Menu label */}
      <div style={{ padding: '8px 24px', opacity: labelOpacity, transition: 'opacity 0.25s ease' }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '2px', color: 'var(--ink-3)' }}>MENU</span>
      </div>

      {/* Nav */}
      <nav style={{ position: 'relative', padding: '4px 12px', flex: '1 1 auto' }}>
        {/* sliding highlight */}
        <div
          style={{
            position: 'absolute', left: 12, right: 12, top: 4, height: 48, borderRadius: 14,
            background: 'linear-gradient(105deg, color-mix(in oklch, var(--moss) 26%, var(--leaf)) 0%, var(--leaf) 100%)',
            boxShadow: '0 4px 14px -6px color-mix(in oklch, var(--moss) 50%, transparent)',
            transform: `translateY(${(activeIndex < 0 ? 0 : activeIndex) * STEP}px)`,
            transition: 'transform 0.4s cubic-bezier(0.34, 1.4, 0.5, 1), opacity 0.3s ease',
            opacity: activeIndex < 0 ? 0 : 1,
            zIndex: 0,
          }}
        />

        {MENU.map((m, i) => {
          const isActive = i === activeIndex;
          const isHover = i === hovered;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => onNav(m.key)}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(-1)}
              title={m.label}
              style={{
                position: 'relative', zIndex: 1, width: '100%', height: 48, marginBottom: 4,
                display: 'flex', alignItems: 'center', gap: 13, padding: '0 14px', border: 'none',
                background: !isActive && isHover ? 'color-mix(in oklch, var(--moss) 13%, transparent)' : 'transparent',
                borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14.5,
                color: isActive ? 'var(--moss-2)' : isHover ? 'var(--moss)' : 'var(--ink-2)',
                fontWeight: isActive ? 700 : 500, whiteSpace: 'nowrap',
                transition: 'background 0.25s ease, color 0.25s ease',
              }}
            >
              <span style={{ flex: '0 0 auto', width: 22, height: 22, display: 'grid', placeItems: 'center', transform: `scale(${isActive || isHover ? 1.12 : 1})`, transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                {ICONS[m.icon]}
              </span>
              <span style={{ opacity: labelOpacity, transition: 'opacity 0.25s ease' }}>{m.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Streak card — 아이콘 없이 숫자 강조 / 접힘 시 컴팩트 칩 */}
      <div style={{ padding: '12px 14px 6px', borderTop: '1px solid var(--sidebar-border)' }}>
        {collapsed ? (
          <div
            title={`연속 ${streak}일 · 최고 ${best}일`}
            style={{ margin: '0 auto', width: 46, height: 46, borderRadius: 13, background: 'color-mix(in oklch, var(--amber) 14%, var(--sidebar))', border: '1px solid color-mix(in oklch, var(--amber) 32%, transparent)', display: 'grid', placeItems: 'center' }}
          >
            <span style={{ fontFamily: "'Fredoka', var(--font-body)", fontSize: 18, fontWeight: 600, lineHeight: 1, color: streakAccent }}>{streak}</span>
          </div>
        ) : (
          <div style={{ padding: '12px 14px', borderRadius: 16, background: 'color-mix(in oklch, var(--sidebar) 92%, var(--ink))', whiteSpace: 'nowrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.4px', color: 'var(--ink-3)' }}>연속 학습</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)' }}>최고 {best}일</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: "'Fredoka', var(--font-body)", fontSize: 28, fontWeight: 600, lineHeight: 1, color: streakAccent }}>{streak}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)' }}>일째 달성 중</span>
            </div>
          </div>
        )}
      </div>

      {/* Logout */}
      <div style={{ padding: '6px 14px 16px' }}>
        <button
          type="button"
          className="rl-logout"
          onClick={onLogout}
          style={{ width: '100%', height: 44, display: 'flex', alignItems: 'center', gap: 13, padding: '0 18px', border: 'none', background: 'transparent', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, color: 'var(--ink-2)', whiteSpace: 'nowrap', transition: 'background 0.2s ease, color 0.2s ease' }}
        >
          <span style={{ flex: '0 0 auto', width: 22, height: 22, display: 'grid', placeItems: 'center' }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
          </span>
          <span style={{ opacity: labelOpacity, transition: 'opacity 0.25s ease' }}>로그아웃</span>
        </button>
      </div>

      {/* Collapse toggle — moss 채움 탭으로 또렷하게 */}
      <button
        type="button"
        className="rl-toggle"
        onClick={() => setCollapsed((c) => !c)}
        title={collapsed ? '사이드바 펴기' : '사이드바 접기'}
        style={{ position: 'absolute', top: 23, right: -2, width: 28, height: 34, display: 'grid', placeItems: 'center', border: 'none', background: 'var(--moss)', borderRadius: '11px 0 0 11px', cursor: 'pointer', color: 'var(--on-primary)', boxShadow: '-3px 3px 12px -4px color-mix(in oklch, var(--moss) 75%, transparent)', transition: 'background 0.2s ease' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transform: `rotate(${collapsed ? '180deg' : '0deg'})`, transition: 'transform 0.42s cubic-bezier(0.4,0,0.2,1)' }}><polyline points="15 18 9 12 15 6" /></svg>
      </button>
    </aside>
    </>
  );
}
