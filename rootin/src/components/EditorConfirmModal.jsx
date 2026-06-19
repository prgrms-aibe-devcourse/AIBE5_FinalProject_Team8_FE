import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { RtIcon } from '../pixel-icons.jsx';
import { playSfx } from '../lib/sfx.js';
import { useDialogFocusTrap } from '../hooks/useDialogFocusTrap.js';

// 에디터에서 저장 안 된 변경을 잃을 수 있는 동작(새 TIL 시작 / 임시저장본 불러오기 / 다른 TIL 수정)을
// 확인받는 공용 모달 (게임보이 테마). 앱 셸 레벨로 포털해 사이드바 스태킹 컨텍스트 밖에서 렌더한다.
// 오버레이에 .rt-app 을 부여해 게임보이 토큰(--leaf 등)·픽셀 폰트를 상속받는다.
export function EditorConfirmModal({
  icon = 'gear',
  tag = '확인',
  title,
  description,
  confirmLabel = '확인',
  hideCancel = false,
  onConfirm,
  onClose,
}) {
  const cardRef = useRef(null);
  useDialogFocusTrap(cardRef);

  useEffect(() => {
    const handleEscape = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleCancel = () => {
    playSfx('cancel');
    onClose();
  };

  return createPortal(
    <div
      className="rt-app"
      role="dialog"
      aria-modal="true"
      aria-labelledby="editor-confirm-title"
      onClick={handleCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 90,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        background: 'rgba(12, 14, 8, .55)', backdropFilter: 'blur(3px)',
      }}
    >
      <div
        ref={cardRef}
        onClick={e => e.stopPropagation()}
        style={{
          width: 400, maxWidth: '100%',
          background: 'var(--paper-card)',
          border: '2px solid var(--leaf)',
          borderRadius: 14,
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.55), 6px 6px 0 0 var(--leaf)',
          padding: '22px 24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ minWidth: 0 }}>
            <span className="rt-tag"><RtIcon name={icon} /> {tag}</span>
            <h2 id="editor-confirm-title" style={{
              margin: '12px 0 0', fontFamily: 'var(--font-pixel)', fontSize: 20, lineHeight: 1.25,
              color: 'var(--leaf)', textShadow: '1px 0 0 currentColor',
            }}>
              {title}
            </h2>
            <p style={{ margin: '8px 0 0', fontSize: 12.5, lineHeight: 1.6, color: 'var(--muted-2)' }}>
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            aria-label="닫기"
            style={{
              width: 32, height: 32, flex: '0 0 auto', borderRadius: 6,
              border: '2px solid var(--line-strong)', background: 'var(--paper-card)', color: 'var(--muted-2)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <RtIcon name="xmark" />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          {!hideCancel && (
            <button type="button" className="rt-btn rt-btn--ghost" style={{ flex: 1 }} onClick={handleCancel}>
              취소
            </button>
          )}
          <button type="button" className="rt-btn rt-btn--primary" style={{ flex: 1 }} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
