import { useRef, useEffect } from 'react';
import { HeroZoom } from './landing/HeroZoom.jsx';
import { MonitorSection } from './landing/MonitorSection.jsx';

// ──────────────────────────────────────────────────────────────
// Rootin 랜딩 — 시네마틱 줌 히어로(절벽 위 정원)에서
// 스크롤을 내리면 모니터가 깨어나 서비스 소개 화면이 켜집니다.
// onStart: 로그인/시작 진입 (app.jsx에서 /login으로 연결)
// ──────────────────────────────────────────────────────────────

export function LandingScreen({ onStart }) {
  const start = onStart ?? (() => {});
  // 모니터 섹션이 등록하는 "소개 섹션으로 스크롤" 함수를 히어로 메뉴에서 호출
  const scrollToRef = useRef(null);

  // 스크롤잭(스크롤=모니터 깨어남) 구조라, 새로고침 시 브라우저가 직전 스크롤
  // 위치를 복원하면 인트로가 중간부터 보인다. 랜딩에선 항상 맨 위에서 시작.
  useEffect(() => {
    const prev = 'scrollRestoration' in history ? history.scrollRestoration : null;
    if (prev !== null) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    return () => { if (prev !== null) history.scrollRestoration = prev; };
  }, []);

  return (
    <div className="bg-[#0A0A0A] font-sans text-[#E1E0CC] selection:bg-[#E1E0CC]/30">
      <HeroZoom onStart={start} onNavigate={(id) => scrollToRef.current?.(id)} />
      <MonitorSection onStart={start} scrollToRef={scrollToRef} />
    </div>
  );
}
