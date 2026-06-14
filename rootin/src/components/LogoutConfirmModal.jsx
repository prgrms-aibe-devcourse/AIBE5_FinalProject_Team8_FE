import { useEffect, useState } from 'react';
import { RtIcon } from '../pixel-icons.jsx';
import { playSfx } from '../lib/sfx.js';
import './logout-modal.css';

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
      setError('로그아웃에 실패했어요. 다시 시도해 주세요.');
      setLoading(false);
    }
  };

  return (
    <div
      className="rt-app gb-logout-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-modal-title"
      onClick={loading ? undefined : handleClose}
    >
      <div className="gb-logout-modal" onClick={e => e.stopPropagation()}>
        {/* 카트리지 상단 바 */}
        <div className="gb-logout-bar">
          <span className="gb-garden-led" aria-hidden="true" />
          <span className="gb-logout-cap">SYSTEM&nbsp;·&nbsp;POWER</span>
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

        {/* LCD 본문 */}
        <div className="gb-logout-body">
          <div className="gb-logout-icon" aria-hidden="true"><RtIcon name="power" /></div>
          <div className="gb-logout-eyebrow">로그아웃</div>
          <h2 id="logout-modal-title" className="gb-logout-title">
            정말 로그아웃 할까요?
          </h2>
          <p className="gb-logout-desc">
            로그아웃하면 다시 로그인해야<br />Rootin을 이용할 수 있어요.
          </p>

          {error && <div className="gb-logout-error">{error}</div>}

          <div className="gb-logout-actions">
            <button type="button" className="rt-btn rt-btn--ghost" onClick={handleClose} disabled={loading}>
              취소
            </button>
            <button type="button" className="rt-btn rt-btn--primary" onClick={handleConfirm} disabled={loading}>
              {loading ? '로그아웃 중...' : '로그아웃'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
