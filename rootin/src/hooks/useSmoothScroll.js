import { useEffect } from 'react';
import Lenis from 'lenis';
import { frame, cancelFrame } from 'framer-motion';

// 가볍고 부드러운 스크롤 공통 설정.
// - lerp 0.12: 휠을 굴릴 땐 부드럽게 따라오되, 멈추면 빠르게 정착해 "둥둥 뜨는" 관성은 최소화.
// - allowNestedScroll: 에디터 본문/AI 결과·모달/도감 리스트 등 자체 스크롤 영역은 네이티브로 두어
//   window 스무스 스크롤과 충돌하지 않게 자동 처리.
// - autoRaf:false: framer-motion 프레임 루프로 구동해 useScroll(랜딩 스크롤잭 등)과 같은 프레임에서 동기화.
const OPTIONS = {
  lerp: 0.12,
  smoothWheel: true,
  wheelMultiplier: 1,
  allowNestedScroll: true,
  autoRaf: false,
};

let activeLenis = null;

// 랜딩의 programmatic 스크롤(window.scrollTo)을 Lenis 경유로 부드럽게 호출하기 위한 접근자.
export function getLenis() {
  return activeLenis;
}

// window 를 부드럽게 스크롤한다(인증 앱·랜딩·로그인 모두 실제 스크롤 주체는 window).
// resetKey 가 바뀌면 인스턴스를 재생성해 Lenis 내부 타깃을 현재 스크롤 위치로 다시 맞춘다.
export function useSmoothScroll({ enabled = true, resetKey } = {}) {
  useEffect(() => {
    if (!enabled) return undefined;

    const lenis = new Lenis(OPTIONS);
    activeLenis = lenis;

    const update = (data) => lenis.raf(data.timestamp);
    frame.update(update, true);

    return () => {
      cancelFrame(update);
      lenis.destroy();
      if (activeLenis === lenis) activeLenis = null;
    };
  }, [enabled, resetKey]);
}
