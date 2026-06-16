import { HeroZoom } from './landing/HeroZoom.jsx';
import { MonitorSection } from './landing/MonitorSection.jsx';

// ──────────────────────────────────────────────────────────────
// Rootin 랜딩 — 시네마틱 줌 히어로(절벽 위 정원)에서
// 스크롤을 내리면 모니터가 깨어나 서비스 소개 화면이 켜집니다.
// onStart: 로그인/시작 진입 (app.jsx에서 /login으로 연결)
// ──────────────────────────────────────────────────────────────

export function LandingScreen({ onStart }) {
  const start = onStart ?? (() => {});

  return (
    <div className="bg-[#0A0A0A] font-sans text-[#E1E0CC] selection:bg-[#E1E0CC]/30">
      <HeroZoom onStart={start} />
      <MonitorSection onStart={start} />
    </div>
  );
}
