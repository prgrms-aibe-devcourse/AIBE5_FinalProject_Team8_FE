import { PixelPlant } from './pixel-plants.jsx';

// Plant SVG components — extracted from moodboard / growth metaphor
// Stages: seed (씨앗) → sprout (새싹) → leaf (잎) → bloom (개화) → full (만개)

function PotBase({ scale = 1 }) {
  return (
    <g>
      <path d="M12 46 L8 64 L48 64 L44 46 Z" fill="#c8a882" />
      <rect x="10" y="42" width="36" height="6" rx="3" fill="#b8946a" />
      <ellipse cx="28" cy="45" rx="16" ry="4" fill="#8b6340" opacity="0.4" />
    </g>
  );
}

function Roots() {
  return (
    <g opacity="0.55">
      <path d="M28 46 Q22 52 18 60" stroke="#8b6340" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <path d="M28 46 Q34 52 38 60" stroke="#8b6340" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <path d="M28 46 Q28 54 28 62" stroke="#8b6340" strokeWidth="1" strokeLinecap="round" fill="none" />
    </g>
  );
}

function PlantSeed() {
  return (
    <g>
      <ellipse cx="28" cy="38" rx="6" ry="8" fill="#8b6340" opacity="0.6" />
      <ellipse cx="28" cy="36" rx="4" ry="5" fill="#a87c52" opacity="0.7" />
      <circle cx="26" cy="34" r="1.5" fill="#c8a882" opacity="0.6" />
    </g>
  );
}

function PlantSprout() {
  return (
    <g>
      <rect x="26" y="26" width="4" height="20" rx="2" fill="#3d8b5e" />
      <ellipse cx="20" cy="32" rx="8" ry="6" fill="#3d8b5e" transform="rotate(-15 20 32)" />
      <ellipse cx="36" cy="28" rx="8" ry="6" fill="#4a9066" transform="rotate(10 36 28)" />
      <circle cx="28" cy="20" r="5" fill="#a8d5b5" opacity="0.75" />
    </g>
  );
}

function PlantLeaf() {
  return (
    <g>
      <rect x="26" y="20" width="4" height="26" rx="2" fill="#3d8b5e" />
      <ellipse cx="18" cy="28" rx="11" ry="7.5" fill="#3d8b5e" transform="rotate(-20 18 28)" />
      <ellipse cx="38" cy="22" rx="10" ry="7" fill="#4a9066" transform="rotate(15 38 22)" />
      <ellipse cx="14" cy="20" rx="7" ry="4.5" fill="#a8d5b5" opacity="0.85" transform="rotate(-30 14 20)" />
    </g>
  );
}

function PlantBloom({ color = '#ff9eb5', center = '#ffeb3b' }) {
  return (
    <g>
      <rect x="26" y="20" width="4" height="26" rx="2" fill="#3d8b5e" />
      <ellipse cx="18" cy="28" rx="10" ry="7" fill="#3d8b5e" transform="rotate(-20 18 28)" />
      <ellipse cx="38" cy="22" rx="10" ry="7" fill="#4a9066" transform="rotate(15 38 22)" />
      <circle cx="28" cy="14" r="7" fill={color} opacity="0.9" />
      <circle cx="22" cy="10" r="5" fill={color} opacity="0.7" />
      <circle cx="34" cy="10" r="5" fill={color} opacity="0.7" />
      <circle cx="28" cy="7" r="5" fill={color} opacity="0.7" />
      <circle cx="28" cy="14" r="2" fill={center} />
    </g>
  );
}

function PlantFull({ color = '#ff9eb5' }) {
  return (
    <g>
      <rect x="26" y="18" width="4" height="28" rx="2" fill="#2e6b48" />
      <ellipse cx="14" cy="30" rx="10" ry="6.5" fill="#3d8b5e" transform="rotate(-25 14 30)" />
      <ellipse cx="42" cy="26" rx="10" ry="6.5" fill="#4a9066" transform="rotate(20 42 26)" />
      <ellipse cx="12" cy="20" rx="7" ry="4.5" fill="#a8d5b5" transform="rotate(-30 12 20)" />
      <ellipse cx="44" cy="18" rx="7" ry="4.5" fill="#a8d5b5" transform="rotate(25 44 18)" />
      <circle cx="28" cy="10" r="8" fill={color} opacity="0.95" />
      <circle cx="20" cy="6" r="6" fill={color} opacity="0.75" />
      <circle cx="36" cy="6" r="6" fill={color} opacity="0.75" />
      <circle cx="28" cy="2" r="5" fill={color} opacity="0.7" />
      <circle cx="28" cy="10" r="2.5" fill="#ffeb3b" />
    </g>
  );
}

const STAGE_META = {
  seed:   { label: '씨앗',   range: '0~20%',   min: 0,  next: 5 },
  sprout: { label: '새싹',   range: '20~50%',  min: 5,  next: 15 },
  leaf:   { label: '잎',     range: '50~80%',  min: 15, next: 25 },
  bloom:  { label: '개화',   range: '80~100%', min: 25, next: 40 },
  full:   { label: '만개',   range: '100%',    min: 40, next: 60 },
};

function tilCountToStage(n) {
  if (n >= 40) return 'full';
  if (n >= 25) return 'bloom';
  if (n >= 15) return 'leaf';
  if (n >= 5)  return 'sprout';
  return 'seed';
}

function Plant({ stage, size = 72, color = '#ff9eb5', showRoots = false, species = 'seed', locked = false, glow = false }) {
  // Now delegates to PixelPlant for consistent pixel-art look.
  return <PixelPlant species={species} stage={stage} size={size} locked={locked} glow={glow} />;
}

// Compact pot icon (for sidebar etc)
function PotIcon({ size = 24, stage = 'leaf' }) {
  return <Plant stage={stage} size={size} />;
}

// Logo mark
// 브랜드 마크 — 게임보이 부팅 픽셀 새싹과 한 가족인 "뿌리새싹".
// 위로 떡잎 2장(게임보이 DNA) + 아래로 뿌리 → 브랜드명 Root-in·슬로건 "뿌리처럼"을 형상화.
// 모노(currentColor 기본)라 배경/테마에 따라 색이 자동으로 맞춰지고 박스가 필요 없다.
function RootinLogo({ size = 36, color = 'currentColor' }) {
  return (
    <svg width={size * 0.8} height={size} viewBox="0 0 80 100" fill="none" aria-hidden="true">
      {/* 새순 + 떡잎 2장 + 줄기 */}
      <g fill={color}>
        <path d="M40 20 C42.5 23 42.5 27 40 30 C37.5 27 37.5 23 40 20 Z" />
        <path d="M40 41 C34 25 23 19 15 18 C17 29 25 37 38 40 Z" />
        <path d="M40 41 C46 25 57 19 65 18 C63 29 55 37 42 40 Z" />
        <rect x="37.8" y="28" width="4.4" height="36" rx="2.2" />
      </g>
      {/* 뿌리 */}
      <g fill="none" stroke={color} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M40 62 C40 73 40 80 40 88" />
        <path d="M40 64 C33 70 27 74 22 85" />
        <path d="M40 64 C47 70 53 74 58 85" />
        <path d="M31 71 C29 75 28 78 27 83" />
        <path d="M49 71 C51 75 52 78 53 83" />
      </g>
    </svg>
  );
}

export { Plant, PotIcon, RootinLogo, STAGE_META, tilCountToStage };
