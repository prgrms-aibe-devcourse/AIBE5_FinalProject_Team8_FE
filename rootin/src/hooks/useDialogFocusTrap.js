import { useEffect } from 'react';

// 모달이 열려 있는 동안 키보드 포커스를 모달 안에 가두는 공용 훅(접근성).
// - 열릴 때: 모달 내부 첫 포커스 요소로 이동
// - Tab / Shift+Tab: 모달 밖으로 나가지 않도록 양 끝에서 순환
// - 닫힐 때: 모달을 열기 직전 포커스를 가졌던 요소로 복원
export function useDialogFocusTrap(ref) {
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const previouslyFocused = document.activeElement;

    // 모달은 숨김 포커스 요소를 DOM에 남기지 않고 조건부 렌더로 제거하므로
    // disabled 여부만 거른다(레이아웃 기반 가시성 검사는 불필요).
    const getFocusable = () =>
      Array.from(
        node.querySelectorAll(
          'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.disabled);

    getFocusable()[0]?.focus();

    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') return;
      const items = getFocusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !node.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !node.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [ref]);
}
