import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDialogFocusTrap } from '../hooks/useDialogFocusTrap.js';

// 에디터에서 저장 안 된 변경을 잃을 수 있는 동작(새 TIL 시작 / 임시저장본 불러오기 / 다른 TIL 수정)을
// 확인받는 공용 모달 (클래식 테마). LogoutConfirmModal.classic 과 동일한 카드 톤.
export function EditorConfirmModal({ tag = '확인', title, description, confirmLabel = '확인', hideCancel = false, onConfirm, onClose }) {
  const cardRef = useRef(null);
  useDialogFocusTrap(cardRef);

  useEffect(() => {
    const handleEscape = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="editor-confirm-title"
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
        ref={cardRef}
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
            <div className="eyebrow" style={{ color: 'var(--moss-2)' }}>{tag}</div>
            <h2
              id="editor-confirm-title"
              style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginTop: 6 }}
            >
              {title}
            </h2>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 6, lineHeight: 1.6, textAlign: 'left' }}>
              {description}
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
            aria-label="닫기"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          {!hideCancel && (
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
          )}
          <button
            type="button"
            onClick={onConfirm}
            style={{
              flex: 1,
              height: 42,
              borderRadius: 10,
              border: 'none',
              background: 'var(--coral)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
