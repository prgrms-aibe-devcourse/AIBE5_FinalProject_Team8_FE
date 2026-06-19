import { useState, useEffect } from 'react';

/**
 * 로딩 표시 깜빡임 방지용 훅.
 * `loading` 이 `delay`(기본 200ms) 이상 지속될 때만 true 를 돌려준다.
 * 응답이 빠른 환경에서 "불러오는 중" 안내가 한 프레임 떴다 사라지는 현상을 막는다.
 */
export function useDeferredLoading(loading, delay = 200) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!loading) {
      setShown(false);
      return undefined;
    }
    const timer = setTimeout(() => setShown(true), delay);
    return () => clearTimeout(timer);
  }, [loading, delay]);

  return shown;
}
