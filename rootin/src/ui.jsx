// Shared UI atoms

function Pill({ children, tone = 'default' }) {
  const tones = {
    default: { bg: 'var(--paper-3)', color: 'var(--ink-2)', border: 'var(--rule)' },
    green:   { bg: 'var(--primary-weak)', color: 'var(--moss-2)', border: 'var(--leaf)' },
    navy:    { bg: 'var(--paper-3)', color: 'var(--ink-2)', border: 'var(--rule)' },
    warn:    { bg: 'var(--honey-weak)', color: '#8a6310', border: 'var(--honey-weak)' },
    pink:    { bg: 'var(--coral-weak)', color: '#a04b2c', border: 'var(--coral-weak)' },
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

// 버튼 위계 — primary(주 CTA, moss 채움) / secondary(보조, 테두리)
// ghost(부가) / danger(위험, 빨강 채움) / accent(특수 강조, coral 포인트)
function Btn({ children, variant = 'primary', size = 'md', icon, onClick, style, ...rest }) {
  const variants = {
    primary:   { bg: 'var(--moss)', color: 'var(--on-primary)', border: 'var(--moss)', hover: 'var(--moss-2)', lift: true },
    secondary: { bg: 'var(--card)', color: 'var(--moss-2)', border: 'var(--rule-2)', hover: 'var(--primary-weak2)', hoverBorder: 'var(--moss)' },
    ghost:     { bg: 'transparent', color: 'var(--ink-2)', border: 'transparent', hover: 'var(--paper-3)' },
    danger:    { bg: 'var(--danger)', color: '#fff', border: 'var(--danger)', hover: '#bb583f', lift: true },
    accent:    { bg: 'var(--coral)', color: '#fff', border: 'var(--coral)', hover: '#d2774f', lift: true },
  };
  variants.green = variants.primary; // 레거시 alias
  const sizes = {
    sm: { padding: '7px 13px', fontSize: 12.5, radius: 'var(--r-sm)' },
    md: { padding: '9px 16px', fontSize: 13.5, radius: 'var(--r-md)' },
    lg: { padding: '12px 22px', fontSize: 14.5, radius: 'var(--r-md)' },
  };
  const v = variants[variant] ?? variants.primary; const s = sizes[size];
  const baseShadow = v.lift ? 'var(--shadow-sm)' : 'none';
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
      padding: s.padding, fontSize: s.fontSize, borderRadius: s.radius,
      background: v.bg, color: v.color, border: `1px solid ${v.border}`,
      boxShadow: baseShadow,
      fontWeight: 600, fontFamily: 'var(--font-body)',
      whiteSpace: 'nowrap',
      transition: 'background 150ms ease, border-color 150ms ease, box-shadow 180ms ease, transform 90ms ease',
      ...style,
    }}
       onMouseEnter={e => {
         if (style?.background) return;
         e.currentTarget.style.background = v.hover;
         if (v.hoverBorder) e.currentTarget.style.borderColor = v.hoverBorder;
         if (v.lift) { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-1px)'; }
       }}
       onMouseLeave={e => {
         if (style?.background) return;
         e.currentTarget.style.background = v.bg;
         e.currentTarget.style.borderColor = v.border;
         e.currentTarget.style.boxShadow = baseShadow;
         e.currentTarget.style.transform = 'translateY(0)';
       }}
       onMouseDown={e => e.currentTarget.style.transform = 'translateY(0) scale(0.97)'}
       onMouseUp={e => e.currentTarget.style.transform = v.lift ? 'translateY(-1px)' : 'translateY(0)'}
       {...rest}>
      {icon}{children}
    </button>
  );
}

<<<<<<< HEAD
function Card({ children, style, padding = 20, hoverable = false, onClick }) {
  const baseShadow = 'var(--shadow-sm)';
=======
function Card({ children, style, padding = 20, hoverable = false, onClick, className }) {
>>>>>>> 4e83bce0bcd0ab046ac5bad6f1d5be97947317b7
  return (
    <div className={className} onClick={onClick} style={{
      background: 'var(--card)',
      border: '1px solid var(--rule)',
      borderRadius: 'var(--r-xl)',
      padding,
      boxShadow: baseShadow,
      animation: 'rootin-rise 360ms cubic-bezier(.2,.7,.3,1) both',
      transition: 'transform 180ms cubic-bezier(.2,.7,.3,1), box-shadow 220ms ease, border-color 180ms ease',
      cursor: hoverable ? 'pointer' : 'default',
      ...style,
    }}
    onMouseEnter={hoverable ? e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; e.currentTarget.style.borderColor = 'var(--rule-2)'; } : undefined}
    onMouseLeave={hoverable ? e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = baseShadow; e.currentTarget.style.borderColor = 'var(--rule)'; } : undefined}>
      {children}
    </div>
  );
}

function SectionHeader({ eyebrow, title, action, accent }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
      <div>
        {eyebrow && (accent ? (
          <div className="eyebrow" style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 6, height: 6, borderRadius: 2, background: accent, display: 'inline-block', flexShrink: 0 }} />
            {eyebrow}
          </div>
        ) : (
          <div className="eyebrow" style={{ marginBottom: 4 }}>{eyebrow}</div>
        ))}
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 21, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' }}>{title}</h2>
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

// 액센트 컬러 시맨틱 — moss(성장·기록) / coral(연속 스트릭) / amber(포인트·보상) / ink(중립)
function StatTile({ label, value, suffix, sub, icon, accent = 'ink', highlight = false }) {
  const accents = {
    ink:   { c: 'var(--ink-2)', tint: 'var(--paper-3)' },
    moss:  { c: 'var(--moss)',  tint: 'color-mix(in oklch, var(--moss) 13%, var(--card))' },
    coral: { c: 'var(--coral)', tint: 'color-mix(in oklch, var(--coral) 15%, var(--card))' },
    amber: { c: 'var(--amber)', tint: 'color-mix(in oklch, var(--amber) 18%, var(--card))' },
  };
  const a = accents[accent] ?? accents.ink;
  return (
    <Card padding={18} style={highlight ? {
      background: 'linear-gradient(155deg, color-mix(in oklch, var(--amber) 10%, var(--card)) 0%, var(--card) 62%)',
      borderColor: 'color-mix(in oklch, var(--amber) 30%, var(--rule))',
    } : undefined}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)', fontFamily: 'var(--font-display)' }}>{label}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 8 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: highlight ? a.c : 'var(--ink)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>{value}</div>
            {suffix && <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{suffix}</div>}
          </div>
          {sub && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>{sub}</div>}
        </div>
        {icon && (
          <div style={{
            flexShrink: 0, width: 34, height: 34, borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: a.tint, color: a.c,
          }}>{icon}</div>
        )}
      </div>
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
  flame: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 17a2.5 2.5 0 0 0 2.5-2.5c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>,
  coin: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.4"/></svg>,
  close: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>,
};

/**
 * Spinner — 빙글빙글 로딩 인디케이터
 * size: px 숫자 (기본 32)
 * color: CSS 색상 문자열 (기본 var(--moss))
 */
function Spinner({ size = 32, color = 'var(--moss)', style = {}, ariaHidden = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role={ariaHidden ? undefined : 'status'}
      aria-hidden={ariaHidden ? true : undefined}
      aria-label={ariaHidden ? undefined : 'Loading'}
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
    </svg>
  );
}

export { Pill, Btn, Card, SectionHeader, ProgressBar, StatTile, Icon, Spinner };
