import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GuideOverlay } from '../components/GuideOverlay.jsx';

let cleanupGuideListener = () => {};

function renderGuideOverlay({ steps, onClose = vi.fn() }) {
  const guideEvents = [];
  const handleGuideStep = (event) => guideEvents.push(event.detail);
  window.addEventListener('rootin-guide-step', handleGuideStep);
  cleanupGuideListener = () => window.removeEventListener('rootin-guide-step', handleGuideStep);

  const view = render(
    <>
      <button className="guide-target">가이드 타겟</button>
      <GuideOverlay isOpen={true} onClose={onClose} steps={steps} />
    </>
  );

  return {
    ...view,
    onClose,
    guideEvents,
  };
}

afterEach(() => {
  cleanupGuideListener();
  cleanupGuideListener = () => {};
});

describe('GuideOverlay action 이벤트', () => {
  it('현재 단계의 action을 rootin-guide-step 이벤트로 전달한다', async () => {
    const { guideEvents } = renderGuideOverlay({
      steps: [
        {
          selector: '.guide-target',
          text: '첫 번째 안내',
          placement: 'bottom',
          action: 'firstAction',
        },
        {
          selector: '.guide-target',
          text: '두 번째 안내',
          placement: 'bottom',
          action: 'secondAction',
        },
      ],
    });

    await waitFor(() =>
      expect(guideEvents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            stepIndex: 0,
            selector: '.guide-target',
            action: 'firstAction',
            isEnd: false,
          }),
        ])
      )
    );

    fireEvent.click(screen.getByRole('button', { name: '다음' }));

    await waitFor(() =>
      expect(guideEvents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            stepIndex: 1,
            selector: '.guide-target',
            action: 'secondAction',
            isEnd: false,
          }),
        ])
      )
    );

  });

  it('마지막 단계에서는 종료 안내 토스트를 숨기고 완료 시 종료 이벤트를 전달한다', async () => {
    const { guideEvents, onClose } = renderGuideOverlay({
      steps: [
        {
          selector: '.guide-target',
          text: '마지막 안내',
          placement: 'bottom',
        },
      ],
    });

    await waitFor(() => expect(screen.getByText('마지막 안내')).toBeInTheDocument());
    expect(screen.queryByText('💡 화면의 빈 공간을 클릭하면 가이드가 바로 종료됩니다.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '완료' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(guideEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ isEnd: true }),
      ])
    );

  });
});
