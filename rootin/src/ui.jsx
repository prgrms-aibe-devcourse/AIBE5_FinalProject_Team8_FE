// Shared UI atoms

function Pill({ children, tone = 'default' }) {
  const tones = {
    default: { bg: '#f0f4f0', color: '#4a6a8c', border: '#e6ebe6' },
    green:   { bg: '#ebf5ef', color: '#2e6b48', border: '#d4ebdc' },
    navy:    { bg: '#eef2f8', color: '#1a3a5c', border: '#d8e2ee' },
    warn:    { bg: '#fff4e0', color: '#8b6340', border: '#f0dcb5' },
    pink:    { bg: '#ffeef2', color: '#b8536a', border: '#ffd4dc' },
  };
  const t = tones[tone] || tones.default;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 9px', borderRadius: 999,
      fontSize: 11, fontWeight: 500,
      background: t.bg, color: t.color,
      border: `0.5px solid ${t.border}`,
      lineHeight: 1.4,
      fontFamily: 'var(--font-display)',
      whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

function Btn({ children, variant = 'primary', size = 'md', icon, onClick, style, ...rest }) {
  const variants = {
    primary: { bg: 'var(--ink)', color: '#fff', border: 'var(--ink)' },
    secondary: { bg: '#fff', color: 'var(--ink)', border: 'var(--rule-2)' },
    green: { bg: 'var(--moss)', color: '#fff', border: 'var(--moss)' },
    ghost: { bg: 'transparent', color: 'var(--ink-2)', border: 'transparent' },
    danger: { bg: '#fff', color: '#b8536a', border: '#f0c4cc' },
  };
  const sizes = {
    sm: { padding: '6px 12px', fontSize: 12, radius: 8 },
    md: { padding: '9px 16px', fontSize: 13, radius: 10 },
    lg: { padding: '12px 22px', fontSize: 14, radius: 12 },
  };
  const v = variants[variant]; const s = sizes[size];
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      padding: s.padding, fontSize: s.fontSize, borderRadius: s.radius,
      background: v.bg, color: v.color, border: `0.5px solid ${v.border}`,
      fontWeight: 500, fontFamily: 'var(--font-body)',
      whiteSpace: 'nowrap',
      transition: 'transform 80ms ease, opacity 120ms ease',
      ...style,
    }} onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
       onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
       onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
       {...rest}>
      {icon}{children}
    </button>
  );
}

function Card({ children, style, padding = 20, hoverable = false, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: 'var(--card)',
      border: '0.5px solid var(--rule)',
      borderRadius: 'var(--r-lg)',
      padding,
      transition: 'transform 120ms ease, box-shadow 120ms ease',
      cursor: hoverable ? 'pointer' : 'default',
      ...style,
    }}
    onMouseEnter={hoverable ? e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; } : undefined}
    onMouseLeave={hoverable ? e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; } : undefined}>
      {children}
    </div>
  );
}

function SectionHeader({ eyebrow, title, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
      <div>
        {eyebrow && <div className="eyebrow" style={{ marginBottom: 4 }}>{eyebrow}</div>}
        <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>{title}</h2>
      </div>
      {action}
    </div>
  );
}

function ProgressBar({ value, color = 'var(--moss)', height = 6, bg = '#eef2ee' }) {
  return (
    <div style={{ height, background: bg, borderRadius: 999, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${Math.min(100, Math.max(0, value * 100))}%`,
        background: color, borderRadius: 999,
        transition: 'width 400ms ease',
      }} />
    </div>
  );
}

function StatTile({ label, value, suffix, sub, tone = 'navy' }) {
  const toneColor = { navy: 'var(--ink)', green: 'var(--moss)', brown: 'var(--amber)' }[tone];
  return (
    <Card padding={18}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)', fontFamily: 'var(--font-display)' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 8 }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: toneColor, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>{value}</div>
        {suffix && <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{suffix}</div>}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>{sub}</div>}
    </Card>
  );
}

// Tiny icons (no external lib)
const Icon = {
  home: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9h14v-9"/></svg>,
  edit: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4l11-11-4-4L4 16v4z"/></svg>,
  garden: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22V8"/><path d="M12 8C8 8 6 5 6 3c3 0 6 2 6 5z"/><path d="M12 10c4 0 6-3 6-5-3 0-6 2-6 5z"/><path d="M4 22h16"/></svg>,
  book: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4V4z"/><path d="M4 4v12a4 4 0 0 1 4 4"/></svg>,
  sparkles: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.5 5.5l2 2M16.5 16.5l2 2M5.5 18.5l2-2M16.5 7.5l2-2"/></svg>,
  user: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>,
  plus: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>,
  search: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>,
  bell: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9a6 6 0 0 1 12 0c0 5 2 7 2 7H4s2-2 2-7z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>,
  arrow: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>,
  check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m4 12 5 5L20 6"/></svg>,
  drop: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/></svg>,
  close: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>,
};

/**
 * Spinner — 빙글빙글 로딩 인디케이터
 * size: px 숫자 (기본 32)
 * color: CSS 색상 문자열 (기본 var(--brand))
 */
function Spinner({ size = 32, color = 'var(--moss)', style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label="Loading"
      style={{
        animation: 'rootin-spin 0.8s linear infinite',
        display: 'block',
        stroke: color,
        strokeWidth: 2.2,
        strokeLinecap: 'round',
        ...style,
      }}
    >
      <circle cx="12" cy="12" r="10" fill="none" opacity="0.15" />
      <path d="M12 2a10 10 0 0 1 10 10" />
      <style>{`@keyframes rootin-spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}

export { Pill, Btn, Card, SectionHeader, ProgressBar, StatTile, Icon, Spinner };
