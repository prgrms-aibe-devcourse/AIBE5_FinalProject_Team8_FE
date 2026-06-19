import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditorConfirmModal } from '../components/EditorConfirmModal.jsx';

// 미저장 경고 모달의 포커스 트랩(접근성) 검증.
// 키보드 사용자가 모달 밖으로 포커스를 잃지 않도록 Tab이 모달 안에서 순환해야 한다.
describe('EditorConfirmModal — 포커스 트랩', () => {
  function renderModal() {
    return render(
      <EditorConfirmModal
        title="새 TIL 작성"
        description="작성 중인 내용이 사라질 수 있어요."
        confirmLabel="새로 작성"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );
  }

  it('열리면 모달 내부 요소로 포커스가 이동한다', () => {
    renderModal();
    const dialog = screen.getByRole('dialog');
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('마지막 요소에서 Tab하면 첫 요소로 순환한다', async () => {
    const user = userEvent.setup();
    renderModal();
    const dialog = screen.getByRole('dialog');
    const focusables = dialog.querySelectorAll('button');
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    last.focus();
    await user.tab();
    expect(document.activeElement).toBe(first);
  });

  it('첫 요소에서 Shift+Tab하면 마지막 요소로 순환한다', async () => {
    const user = userEvent.setup();
    renderModal();
    const dialog = screen.getByRole('dialog');
    const focusables = dialog.querySelectorAll('button');
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    first.focus();
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(last);
  });

  it('닫히면 직전 포커스 요소로 복원된다', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    const { unmount } = renderModal();
    expect(document.activeElement).not.toBe(trigger);

    unmount();
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });
});
