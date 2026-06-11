import { useEffect, useState } from 'react';

export function LogoutConfirmModal({ onConfirm, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, loading]);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
    } catch {
      setError('로그아웃에 실패했어요. 다시 시도해 주세요.');
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-modal-title"
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
      onClick={loading ? undefined : onClose}
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
            <h2
              id="logout-modal-title"
              style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginTop: 6 }}
            >
              정말 로그아웃 할까요?
            </h2>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 6, lineHeight: 1.6 }}>
              로그아웃하면 다시 로그인해야 Rootin을 이용할 수 있어요.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
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
              cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.5 : 1,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {error && (
          <div style={{
            marginTop: 14,
            padding: '10px 12px',
            borderRadius: 9,
            background: '#fff3f5',
            border: '0.5px solid #f7c1c1',
            color: '#9f4055',
            fontSize: 12.5,
            lineHeight: 1.6,
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              flex: 1,
              height: 42,
              borderRadius: 10,
              border: '0.5px solid var(--rule)',
              background: '#fff',
              color: 'var(--ink)',
              fontSize: 14,
              fontWeight: 500,
              cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.5 : 1,
            }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            style={{
              flex: 1,
              height: 42,
              borderRadius: 10,
              border: 'none',
              background: 'var(--ink)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? '로그아웃 중...' : '로그아웃'}
          </button>
        </div>
      </div>
    </div>
  );
}
