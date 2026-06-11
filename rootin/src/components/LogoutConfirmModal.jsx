export function LogoutConfirmModal({ onConfirm, onClose }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 42, 71, 0.42)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 55,
        backdropFilter: 'blur(4px)',
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 400,
          background: '#fff',
          borderRadius: 18,
          padding: '28px 28px 24px',
          boxShadow: 'var(--shadow-lg)',
          border: '0.5px solid var(--rule)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div className="eyebrow" style={{ color: 'var(--ink-3)' }}>로그아웃</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginTop: 6 }}>
              정말 로그아웃 할까요?
            </h2>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 6, lineHeight: 1.6 }}>
              로그아웃하면 다시 로그인해야 Rootin을 이용할 수 있어요.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: '0.5px solid var(--rule)',
              color: 'var(--ink-3)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              height: 42,
              borderRadius: 10,
              border: '0.5px solid var(--rule)',
              background: '#fff',
              color: 'var(--ink)',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              flex: 1,
              height: 42,
              borderRadius: 10,
              border: 'none',
              background: 'var(--ink)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}
