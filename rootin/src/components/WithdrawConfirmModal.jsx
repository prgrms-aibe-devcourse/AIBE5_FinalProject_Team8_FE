import { useEffect, useState } from 'react';
import { RtIcon } from '../pixel-icons.jsx';
import { playSfx } from '../lib/sfx.js';
import './logout-modal.css';

export function WithdrawConfirmModal({ onConfirm, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, loading]);

  const handleClose = () => {
    if (loading) return;
    playSfx('cancel');
    onClose();
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    playSfx('confirm');
    try {
      await onConfirm();
    } catch {
      setError('회원 탈퇴에 실패했어요. 다시 시도해 주세요.');
      setLoading(false);
    }
  };

  return (
    <div
      className="rt-app gb-logout-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="withdraw-modal-title"
      onClick={loading ? undefined : handleClose}
    >
      <div className="gb-logout-modal" onClick={e => e.stopPropagation()}>
        <div className="gb-logout-bar">
          <span className="gb-garden-led" aria-hidden="true" />
          <span className="gb-logout-cap">ACCOUNT&nbsp;·&nbsp;DANGER</span>
          <button
            type="button"
            className="gb-logout-x"
            onClick={handleClose}
            disabled={loading}
            aria-label="닫기"
          >
            <RtIcon name="xmark" />
          </button>
        </div>

        <div className="gb-logout-body">
          <div
            className="gb-logout-icon"
            aria-hidden="true"
            style={{ color: 'var(--berry)', borderColor: 'var(--berry)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.55), 3px 3px 0 0 var(--berry)' }}
          >
            <RtIcon name="xmark" />
          </div>
          <div className="gb-logout-eyebrow" style={{ color: 'var(--berry)' }}>회원 탈퇴</div>
          <h2 id="withdraw-modal-title" className="gb-logout-title" style={{ color: 'var(--berry)' }}>
            정말 탈퇴할까요?
          </h2>
          <p className="gb-logout-desc">
            탈퇴하면 모든 TIL과 정원 데이터가<br />영구적으로 삭제되며 복구할 수 없어요.
          </p>

          {error && <div className="gb-logout-error">{error}</div>}

          <div className="gb-logout-actions">
            <button type="button" className="rt-btn rt-btn--ghost" onClick={handleClose} disabled={loading}>
              취소
            </button>
            <button
              type="button"
              className="rt-btn rt-btn--primary"
              style={{ background: 'var(--berry)', borderColor: 'var(--berry)' }}
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? '처리 중...' : '탈퇴하기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
