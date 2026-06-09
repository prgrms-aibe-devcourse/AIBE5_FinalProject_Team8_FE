// PixelPlant — 16×16 pixel art plants, 3 species × 5 stages + 1 secret
// Adapted from Rootin pixel pokedex reference.

const PIXEL_SPECIES = {
  seed: {  // 씨앗몬 계열 — 일반 · 브라운·그린
    label: '씨앗몬 계열',
    rarity: 'common',
    palette: ['#3D8B5E', '#4A9066'],
    stages: {
      seed:   { name: '씨드몬', stage: '씨앗' },
      sprout: { name: '새싹몬', stage: '새싹' },
      leaf:   { name: '잎몬',   stage: '잎' },
      bloom:  { name: '꽃몬',   stage: '개화' },
      full:   { name: '나무왕', stage: '만개' },
    },
  },
  mushroom: {  // 버섯몬 계열 — 일반 · 브라운·퍼플
    label: '버섯몬 계열',
    rarity: 'common',
    palette: ['#7F77DD', '#534AB7'],
    stages: {
      seed:   { name: '포자씨',   stage: '씨앗' },
      sprout: { name: '애버섯',   stage: '새싹' },
      leaf:   { name: '버섯몬',   stage: '잎' },
      bloom:  { name: '독버섯몬', stage: '개화' },
      full:   { name: '버섯대왕', stage: '만개' },
    },
  },
  moonlight: {  // 달빛씨앗 계열 — 희귀 · 네이비·실버
    label: '달빛씨앗 계열',
    rarity: 'rare',
    palette: ['#378ADD', '#185FA5'],
    stages: {
      seed:   { name: '달빛씨', stage: '씨앗' },
      sprout: { name: '달빛싹', stage: '새싹' },
      leaf:   { name: '달빛잎', stage: '잎' },
      bloom:  { name: '달빛꽃', stage: '개화' },
      full:   { name: '달빛왕', stage: '만개' },
    },
  },
  cactus: {
    label: '선인장몬 계열',
    rarity: 'common',
    palette: ['#3D8B5E', '#FAD05A'],
    stages: {
      seed:   { name: '가시씨',   stage: '씨앗' },
      sprout: { name: '가시싹',   stage: '새싹' },
      leaf:   { name: '선인장몬', stage: '잎' },
      bloom:  { name: '꽃선인장', stage: '개화' },
      full:   { name: '선인장왕', stage: '만개' },
    },
  },
  fire: {
    label: '불꽃몬 계열',
    rarity: 'common',
    palette: ['#FF6B00', '#FFD700'],
    stages: {
      seed:   { name: '불씨몬', stage: '씨앗' },
      sprout: { name: '불싹몬', stage: '새싹' },
      leaf:   { name: '불꽃몬', stage: '잎' },
      bloom:  { name: '화염몬', stage: '개화' },
      full:   { name: '불꽃왕', stage: '만개' },
    },
  },
  ice: {
    label: '얼음몬 계열',
    rarity: 'common',
    palette: ['#88C0E8', '#5090C8'],
    stages: {
      seed:   { name: '얼음씨', stage: '씨앗' },
      sprout: { name: '얼음싹', stage: '새싹' },
      leaf:   { name: '얼음몬', stage: '잎' },
      bloom:  { name: '서리몬', stage: '개화' },
      full:   { name: '빙하왕', stage: '만개' },
    },
  },
  bolt: {
    label: '번개씨앗 계열',
    rarity: 'rare',
    palette: ['#FAD05A', '#1A3A5C'],
    stages: {
      seed:   { name: '번개씨', stage: '씨앗' },
      sprout: { name: '번개싹', stage: '새싹' },
      leaf:   { name: '번개몬', stage: '잎' },
      bloom:  { name: '뇌전몬', stage: '개화' },
      full:   { name: '번개왕', stage: '만개' },
    },
  },
  rose: {
    label: '흑장미 계열',
    rarity: 'rare',
    palette: ['#CC3366', '#2A1A2A'],
    stages: {
      seed:   { name: '흑장미씨',  stage: '씨앗' },
      sprout: { name: '흑장미싹',  stage: '새싹' },
      leaf:   { name: '흑장미몬',  stage: '잎' },
      bloom:  { name: '흑장미꽃',  stage: '개화' },
      full:   { name: '흑장미왕',  stage: '만개' },
    },
  },
  // secret: 뻐끔플라워
  secret: {
    label: '??? 계열',
    rarity: 'secret',
    palette: ['#CC2222', '#DD3333'],
    stages: {
      seed: { name: '???', stage: '???' },
    },
  },
};

// ============================
// 씨앗몬 계열 (5 stages)
// ============================

function PxPotBase({ tone = 'brown' }) {
  // standard pot at y=10-14
  if (tone === 'navy') {
    return (
      <g>
        <rect x="4" y="10" width="8" height="4" fill="#185FA5" />
        <rect x="3" y="11" width="10" height="3" fill="#1A3A5C" />
        <rect x="4" y="14" width="8" height="2" fill="#0C447C" />
        <rect x="5" y="11" width="1" height="1" fill="#E6F1FB" />
        <rect x="10" y="11" width="1" height="1" fill="#E6F1FB" />
        <rect x="7" y="13" width="2" height="1" fill="#B5D4F4" />
      </g>
    );
  }
  return (
    <g>
      <rect x="5" y="10" width="6" height="4" fill="#D4B896" />
      <rect x="4" y="11" width="8" height="3" fill="#C8A882" />
      <rect x="4" y="14" width="8" height="2" fill="#A87C52" />
      <rect x="6" y="11" width="1" height="1" fill="#1A3A5C" />
      <rect x="9" y="11" width="1" height="1" fill="#1A3A5C" />
      <rect x="7" y="13" width="2" height="1" fill="#1A3A5C" />
      <rect x="4" y="12" width="1" height="1" fill="#E8A0A0" opacity="0.8" />
      <rect x="11" y="12" width="1" height="1" fill="#E8A0A0" opacity="0.8" />
    </g>
  );
}

// SEED — 씨드몬 (씨앗몬)
function PxSeed_seedmon() {
  return (
    <g>
      {/* pot moved up since seed is small */}
      <rect x="5" y="8" width="6" height="5" fill="#D4B896" />
      <rect x="4" y="9" width="8" height="4" fill="#C8A882" />
      <rect x="4" y="12" width="8" height="2" fill="#A87C52" />
      <rect x="5" y="14" width="6" height="1" fill="#8B6340" />
      <rect x="6" y="9" width="1" height="1" fill="#1A3A5C" />
      <rect x="9" y="9" width="1" height="1" fill="#1A3A5C" />
      <rect x="7" y="11" width="2" height="1" fill="#1A3A5C" />
      <rect x="4" y="10" width="1" height="1" fill="#E8A0A0" opacity="0.8" />
      <rect x="11" y="10" width="1" height="1" fill="#E8A0A0" opacity="0.8" />
      {/* sprouting bits */}
      <rect x="7" y="6" width="2" height="3" fill="#3D8B5E" />
      <rect x="5" y="5" width="3" height="2" fill="#3D8B5E" />
      <rect x="8" y="4" width="3" height="2" fill="#4A9066" />
    </g>
  );
}

function PxSprout_seedmon() {
  return (
    <g>
      <rect x="5" y="9" width="6" height="4" fill="#D4B896" />
      <rect x="4" y="10" width="8" height="3" fill="#C8A882" />
      <rect x="4" y="13" width="8" height="2" fill="#A87C52" />
      <rect x="5" y="15" width="6" height="1" fill="#8B6340" />
      <rect x="6" y="10" width="1" height="1" fill="#1A3A5C" />
      <rect x="9" y="10" width="1" height="1" fill="#1A3A5C" />
      <rect x="7" y="12" width="2" height="1" fill="#1A3A5C" />
      <rect x="4" y="11" width="1" height="1" fill="#E8A0A0" opacity="0.8" />
      <rect x="11" y="11" width="1" height="1" fill="#E8A0A0" opacity="0.8" />
      {/* stem + leaves */}
      <rect x="7" y="4" width="2" height="6" fill="#3D8B5E" />
      <rect x="3" y="5" width="4" height="3" fill="#4A9066" />
      <rect x="2" y="6" width="2" height="2" fill="#3D8B5E" />
      <rect x="9" y="4" width="4" height="3" fill="#3D8B5E" />
      <rect x="12" y="5" width="2" height="2" fill="#4A9066" />
    </g>
  );
}

function PxLeaf_seedmon() {
  return (
    <g>
      <PxPotBase />
      <rect x="7" y="5" width="2" height="6" fill="#3D8B5E" />
      <rect x="1" y="5" width="6" height="4" fill="#4A9066" />
      <rect x="2" y="4" width="4" height="2" fill="#3D8B5E" />
      <rect x="3" y="6" width="1" height="1" fill="#5AA870" />
      <rect x="9" y="4" width="6" height="4" fill="#3D8B5E" />
      <rect x="10" y="3" width="4" height="2" fill="#4A9066" />
      <rect x="12" y="5" width="1" height="1" fill="#5AA870" />
      <rect x="5" y="3" width="3" height="2" fill="#4A9066" />
      <rect x="8" y="2" width="3" height="2" fill="#3D8B5E" />
    </g>
  );
}

function PxBloom_seedmon() {
  return (
    <g>
      <PxPotBase />
      <rect x="7" y="6" width="2" height="5" fill="#3D8B5E" />
      <rect x="6" y="2" width="4" height="3" fill="#F4A8C0" />
      <rect x="5" y="3" width="2" height="3" fill="#F4A8C0" />
      <rect x="9" y="3" width="2" height="3" fill="#F4A8C0" />
      <rect x="4" y="4" width="2" height="2" fill="#F4A8C0" />
      <rect x="10" y="4" width="2" height="2" fill="#F4A8C0" />
      <rect x="6" y="3" width="4" height="3" fill="#FAD05A" />
      <rect x="7" y="2" width="2" height="5" fill="#FAD05A" />
      <rect x="7" y="3" width="2" height="3" fill="#F5B800" />
    </g>
  );
}

function PxFull_seedmon() {
  return (
    <g>
      {/* larger pot */}
      <rect x="4" y="9" width="8" height="5" fill="#D4B896" />
      <rect x="3" y="10" width="10" height="4" fill="#C8A882" />
      <rect x="4" y="14" width="8" height="2" fill="#A87C52" />
      <rect x="5" y="10" width="1" height="1" fill="#1A3A5C" />
      <rect x="10" y="10" width="1" height="1" fill="#1A3A5C" />
      <rect x="7" y="12" width="2" height="1" fill="#1A3A5C" />
      <rect x="3" y="11" width="1" height="1" fill="#E8A0A0" opacity="0.8" />
      <rect x="12" y="11" width="1" height="1" fill="#E8A0A0" opacity="0.8" />
      {/* trunk */}
      <rect x="7" y="5" width="2" height="5" fill="#8B6340" />
      {/* crown */}
      <rect x="3" y="2" width="10" height="5" fill="#3D8B5E" />
      <rect x="2" y="3" width="12" height="4" fill="#4A9066" />
      <rect x="1" y="4" width="14" height="3" fill="#3D8B5E" />
      <rect x="4" y="1" width="8" height="3" fill="#4A9066" />
      <rect x="6" y="0" width="4" height="2" fill="#3D8B5E" />
      <rect x="2" y="3" width="2" height="2" fill="#F4A8C0" />
      <rect x="12" y="3" width="2" height="2" fill="#F4A8C0" />
      <rect x="7" y="1" width="2" height="2" fill="#FAD05A" />
      <rect x="5" y="2" width="2" height="1" fill="#FAD05A" />
      <rect x="9" y="2" width="2" height="1" fill="#FAD05A" />
    </g>
  );
}

// ============================
// 버섯몬 계열
// ============================
function PxSeed_mushroom() {
  return (
    <g>
      <rect x="5" y="9" width="6" height="4" fill="#D4B896" />
      <rect x="4" y="10" width="8" height="3" fill="#C8A882" />
      <rect x="4" y="13" width="8" height="2" fill="#A87C52" />
      <rect x="6" y="10" width="1" height="1" fill="#1A3A5C" />
      <rect x="9" y="10" width="1" height="1" fill="#1A3A5C" />
      <rect x="7" y="12" width="2" height="1" fill="#1A3A5C" />
      <rect x="4" y="11" width="1" height="1" fill="#E8A0A0" opacity="0.8" />
      <rect x="11" y="11" width="1" height="1" fill="#E8A0A0" opacity="0.8" />
      <rect x="6" y="6" width="1" height="1" fill="#7F77DD" />
      <rect x="9" y="5" width="1" height="1" fill="#7F77DD" />
      <rect x="7" y="7" width="1" height="1" fill="#AFA9EC" />
      <rect x="5" y="8" width="1" height="1" fill="#AFA9EC" />
      <rect x="10" y="7" width="1" height="1" fill="#7F77DD" />
    </g>
  );
}

function PxSprout_mushroom() {
  return (
    <g>
      <PxPotBase />
      <rect x="7" y="7" width="2" height="4" fill="#D4B896" />
      <rect x="4" y="4" width="8" height="4" fill="#7F77DD" />
      <rect x="3" y="5" width="10" height="3" fill="#534AB7" />
      <rect x="5" y="3" width="6" height="2" fill="#7F77DD" />
      <rect x="5" y="5" width="1" height="1" fill="#AFA9EC" />
      <rect x="10" y="6" width="1" height="1" fill="#AFA9EC" />
      <rect x="7" y="4" width="1" height="1" fill="#CECBF6" />
    </g>
  );
}

function PxLeaf_mushroom() {
  return (
    <g>
      <PxPotBase />
      <rect x="7" y="7" width="2" height="4" fill="#D4B896" />
      <rect x="2" y="4" width="12" height="4" fill="#7F77DD" />
      <rect x="1" y="5" width="14" height="3" fill="#534AB7" />
      <rect x="3" y="3" width="10" height="2" fill="#7F77DD" />
      <rect x="5" y="2" width="6" height="2" fill="#AFA9EC" />
      <rect x="3" y="5" width="1" height="1" fill="#CECBF6" />
      <rect x="7" y="4" width="2" height="1" fill="#CECBF6" />
      <rect x="12" y="6" width="1" height="1" fill="#CECBF6" />
    </g>
  );
}

function PxBloom_mushroom() {
  return (
    <g>
      {/* larger pot */}
      <rect x="4" y="10" width="8" height="4" fill="#D4B896" />
      <rect x="3" y="11" width="10" height="3" fill="#C8A882" />
      <rect x="4" y="14" width="8" height="2" fill="#A87C52" />
      <rect x="5" y="11" width="1" height="1" fill="#1A3A5C" />
      <rect x="10" y="11" width="1" height="1" fill="#1A3A5C" />
      <rect x="7" y="13" width="2" height="1" fill="#1A3A5C" />
      <rect x="3" y="12" width="1" height="1" fill="#E8A0A0" opacity="0.8" />
      <rect x="12" y="12" width="1" height="1" fill="#E8A0A0" opacity="0.8" />
      <rect x="7" y="7" width="2" height="4" fill="#B8946A" />
      <rect x="1" y="4" width="14" height="4" fill="#534AB7" />
      <rect x="0" y="5" width="16" height="3" fill="#3C3489" />
      <rect x="2" y="3" width="12" height="2" fill="#534AB7" />
      <rect x="5" y="1" width="6" height="3" fill="#7F77DD" />
      <rect x="7" y="0" width="2" height="2" fill="#AFA9EC" />
      <rect x="1" y="7" width="1" height="2" fill="#7F77DD" />
      <rect x="14" y="7" width="1" height="2" fill="#7F77DD" />
      <rect x="5" y="8" width="1" height="1" fill="#AFA9EC" />
      <rect x="10" y="8" width="1" height="1" fill="#AFA9EC" />
      <rect x="4" y="4" width="2" height="2" fill="#CECBF6" />
      <rect x="10" y="5" width="2" height="1" fill="#CECBF6" />
    </g>
  );
}

function PxFull_mushroom() {
  return (
    <g>
      <rect x="4" y="10" width="8" height="4" fill="#D4B896" />
      <rect x="3" y="11" width="10" height="3" fill="#C8A882" />
      <rect x="4" y="14" width="8" height="2" fill="#A87C52" />
      <rect x="5" y="11" width="1" height="1" fill="#1A3A5C" />
      <rect x="10" y="11" width="1" height="1" fill="#1A3A5C" />
      <rect x="7" y="13" width="2" height="1" fill="#1A3A5C" />
      <rect x="3" y="12" width="1" height="1" fill="#E8A0A0" opacity="0.8" />
      <rect x="12" y="12" width="1" height="1" fill="#E8A0A0" opacity="0.8" />
      <rect x="7" y="7" width="2" height="4" fill="#8B6340" />
      <rect x="0" y="4" width="16" height="4" fill="#3C3489" />
      <rect x="1" y="3" width="14" height="2" fill="#534AB7" />
      <rect x="3" y="2" width="10" height="2" fill="#7F77DD" />
      <rect x="5" y="1" width="6" height="2" fill="#AFA9EC" />
      <rect x="7" y="0" width="2" height="2" fill="#CECBF6" />
      <rect x="2" y="2" width="1" height="2" fill="#FAD05A" />
      <rect x="13" y="2" width="1" height="2" fill="#FAD05A" />
      <rect x="0" y="7" width="1" height="3" fill="#7F77DD" />
      <rect x="15" y="7" width="1" height="3" fill="#7F77DD" />
      <rect x="4" y="4" width="1" height="1" fill="#EEEDFE" />
      <rect x="8" y="3" width="2" height="1" fill="#EEEDFE" />
      <rect x="11" y="5" width="1" height="1" fill="#EEEDFE" />
    </g>
  );
}

// ============================
// 달빛씨앗 계열 (희귀)
// ============================
function PxSeed_moonlight() {
  return (
    <g>
      <rect x="5" y="8" width="6" height="5" fill="#185FA5" />
      <rect x="4" y="9" width="8" height="4" fill="#1A3A5C" />
      <rect x="4" y="12" width="8" height="2" fill="#0C447C" />
      <rect x="5" y="14" width="6" height="1" fill="#042C53" />
      <rect x="7" y="9" width="2" height="1" fill="#B5D4F4" />
      <rect x="8" y="8" width="1" height="3" fill="#B5D4F4" />
      <rect x="6" y="10" width="1" height="1" fill="#85B7EB" />
      <rect x="10" y="10" width="1" height="1" fill="#85B7EB" />
      <rect x="6" y="9" width="1" height="1" fill="#E6F1FB" />
      <rect x="9" y="9" width="1" height="1" fill="#E6F1FB" />
      <rect x="7" y="11" width="2" height="1" fill="#B5D4F4" />
      <rect x="4" y="10" width="1" height="1" fill="#85B7EB" opacity="0.6" />
      <rect x="11" y="10" width="1" height="1" fill="#85B7EB" opacity="0.6" />
      <rect x="7" y="5" width="2" height="4" fill="#378ADD" />
      <rect x="5" y="4" width="3" height="2" fill="#185FA5" />
      <rect x="8" y="3" width="3" height="2" fill="#378ADD" />
      <rect x="4" y="3" width="1" height="1" fill="#FAD05A" />
      <rect x="11" y="4" width="1" height="1" fill="#FAD05A" />
      <rect x="8" y="1" width="1" height="1" fill="#fff" />
    </g>
  );
}

function PxSprout_moonlight() {
  return (
    <g>
      <rect x="5" y="9" width="6" height="5" fill="#185FA5" />
      <rect x="4" y="10" width="8" height="4" fill="#1A3A5C" />
      <rect x="4" y="13" width="8" height="2" fill="#0C447C" />
      <rect x="5" y="15" width="6" height="1" fill="#042C53" />
      <rect x="6" y="10" width="1" height="1" fill="#E6F1FB" />
      <rect x="9" y="10" width="1" height="1" fill="#E6F1FB" />
      <rect x="7" y="12" width="2" height="1" fill="#B5D4F4" />
      <rect x="4" y="11" width="1" height="1" fill="#85B7EB" opacity="0.6" />
      <rect x="11" y="11" width="1" height="1" fill="#85B7EB" opacity="0.6" />
      <rect x="7" y="4" width="2" height="6" fill="#378ADD" />
      <rect x="2" y="5" width="5" height="3" fill="#185FA5" />
      <rect x="1" y="6" width="3" height="2" fill="#0C447C" />
      <rect x="9" y="4" width="5" height="3" fill="#378ADD" />
      <rect x="12" y="5" width="3" height="2" fill="#185FA5" />
      <rect x="2" y="4" width="1" height="1" fill="#FAD05A" />
      <rect x="13" y="5" width="1" height="1" fill="#FAD05A" />
      <rect x="7" y="2" width="2" height="1" fill="#fff" />
    </g>
  );
}

function PxLeaf_moonlight() {
  return (
    <g>
      <PxPotBase tone="navy" />
      <rect x="7" y="5" width="2" height="6" fill="#378ADD" />
      <rect x="0" y="5" width="7" height="4" fill="#185FA5" />
      <rect x="1" y="4" width="5" height="2" fill="#0C447C" />
      <rect x="9" y="4" width="7" height="4" fill="#378ADD" />
      <rect x="10" y="3" width="5" height="2" fill="#185FA5" />
      <rect x="0" y="6" width="1" height="2" fill="#0C447C" />
      <rect x="15" y="5" width="1" height="2" fill="#185FA5" />
      <rect x="1" y="4" width="1" height="1" fill="#FAD05A" />
      <rect x="14" y="4" width="1" height="1" fill="#FAD05A" />
      <rect x="6" y="2" width="1" height="1" fill="#fff" />
      <rect x="9" y="1" width="1" height="1" fill="#B5D4F4" />
    </g>
  );
}

function PxBloom_moonlight() {
  return (
    <g>
      {/* larger pot */}
      <rect x="4" y="10" width="8" height="4" fill="#185FA5" />
      <rect x="3" y="11" width="10" height="3" fill="#1A3A5C" />
      <rect x="4" y="14" width="8" height="2" fill="#0C447C" />
      <rect x="5" y="11" width="1" height="1" fill="#E6F1FB" />
      <rect x="10" y="11" width="1" height="1" fill="#E6F1FB" />
      <rect x="7" y="13" width="2" height="1" fill="#B5D4F4" />
      <rect x="3" y="12" width="1" height="1" fill="#85B7EB" opacity="0.6" />
      <rect x="12" y="12" width="1" height="1" fill="#85B7EB" opacity="0.6" />
      <rect x="7" y="6" width="2" height="5" fill="#378ADD" />
      <rect x="6" y="2" width="4" height="3" fill="#B5D4F4" />
      <rect x="4" y="3" width="3" height="3" fill="#85B7EB" />
      <rect x="9" y="3" width="3" height="3" fill="#85B7EB" />
      <rect x="3" y="4" width="2" height="2" fill="#B5D4F4" />
      <rect x="11" y="4" width="2" height="2" fill="#B5D4F4" />
      <rect x="6" y="3" width="4" height="3" fill="#1A3A5C" />
      <rect x="7" y="2" width="2" height="5" fill="#1A3A5C" />
      <rect x="8" y="3" width="2" height="3" fill="#FAD05A" />
      <rect x="3" y="2" width="1" height="1" fill="#FAD05A" />
      <rect x="12" y="2" width="1" height="1" fill="#FAD05A" />
      <rect x="7" y="1" width="1" height="1" fill="#fff" />
    </g>
  );
}

function PxFull_moonlight() {
  return (
    <g>
      <rect x="4" y="10" width="8" height="4" fill="#185FA5" />
      <rect x="3" y="11" width="10" height="3" fill="#1A3A5C" />
      <rect x="4" y="14" width="8" height="2" fill="#0C447C" />
      <rect x="5" y="11" width="1" height="1" fill="#E6F1FB" />
      <rect x="10" y="11" width="1" height="1" fill="#E6F1FB" />
      <rect x="7" y="13" width="2" height="1" fill="#B5D4F4" />
      <rect x="3" y="12" width="1" height="1" fill="#85B7EB" opacity="0.6" />
      <rect x="12" y="12" width="1" height="1" fill="#85B7EB" opacity="0.6" />
      <rect x="7" y="6" width="2" height="5" fill="#0C447C" />
      <rect x="2" y="3" width="12" height="4" fill="#0C447C" />
      <rect x="1" y="4" width="14" height="3" fill="#185FA5" />
      <rect x="0" y="5" width="16" height="2" fill="#0C447C" />
      <rect x="3" y="2" width="10" height="2" fill="#185FA5" />
      <rect x="5" y="1" width="6" height="2" fill="#378ADD" />
      <rect x="7" y="0" width="2" height="2" fill="#B5D4F4" />
      <rect x="1" y="4" width="2" height="2" fill="#FAD05A" />
      <rect x="13" y="4" width="2" height="2" fill="#FAD05A" />
      <rect x="3" y="3" width="1" height="1" fill="#fff" />
      <rect x="12" y="2" width="1" height="1" fill="#fff" />
      <rect x="6" y="1" width="1" height="1" fill="#FAD05A" />
      <rect x="10" y="1" width="1" height="1" fill="#FAD05A" />
    </g>
  );
}

// ============================
// 선인장몬 계열 (cactus)
// ============================
function PxSeed_cactus() {
  return (
    <g>
      <rect x="5" y="8" width="6" height="6" fill="#D4B896" />
      <rect x="4" y="9" width="8" height="5" fill="#C8A882" />
      <rect x="6" y="10" width="1" height="1" fill="#1A3A5C" />
      <rect x="9" y="10" width="1" height="1" fill="#1A3A5C" />
      <rect x="7" y="12" width="2" height="1" fill="#1A3A5C" />
      <rect x="4" y="11" width="1" height="1" fill="#E8A0A0" opacity="0.8" />
      <rect x="11" y="11" width="1" height="1" fill="#E8A0A0" opacity="0.8" />
      <rect x="7" y="6" width="2" height="3" fill="#3D8B5E" />
      <rect x="6" y="5" width="1" height="2" fill="#5AA870" />
      <rect x="9" y="5" width="1" height="2" fill="#5AA870" />
      <rect x="7" y="4" width="2" height="2" fill="#FAD05A" />
      <rect x="4" y="13" width="8" height="2" fill="#A87C52" />
      <rect x="5" y="15" width="6" height="1" fill="#8B6340" />
    </g>
  );
}
function PxSprout_cactus() {
  return (
    <g>
      <rect x="5" y="9" width="6" height="5" fill="#D4B896" />
      <rect x="4" y="10" width="8" height="4" fill="#C8A882" />
      <rect x="6" y="10" width="1" height="1" fill="#1A3A5C" />
      <rect x="9" y="10" width="1" height="1" fill="#1A3A5C" />
      <rect x="7" y="12" width="2" height="1" fill="#1A3A5C" />
      <rect x="4" y="11" width="1" height="1" fill="#E8A0A0" opacity="0.8" />
      <rect x="11" y="11" width="1" height="1" fill="#E8A0A0" opacity="0.8" />
      <rect x="6" y="5" width="4" height="5" fill="#3D8B5E" />
      <rect x="5" y="6" width="6" height="4" fill="#4A9A6A" />
      <rect x="4" y="6" width="2" height="1" fill="#5AA870" />
      <rect x="10" y="7" width="2" height="1" fill="#5AA870" />
      <rect x="7" y="4" width="2" height="2" fill="#FAD05A" />
      <rect x="6" y="5" width="1" height="1" fill="#FAD05A" />
      <rect x="9" y="5" width="1" height="1" fill="#FAD05A" />
      <rect x="4" y="13" width="8" height="2" fill="#A87C52" />
      <rect x="5" y="15" width="6" height="1" fill="#8B6340" />
    </g>
  );
}
function PxLeaf_cactus() {
  return (
    <g>
      <rect x="5" y="10" width="6" height="4" fill="#D4B896" />
      <rect x="4" y="11" width="8" height="3" fill="#C8A882" />
      <rect x="6" y="11" width="1" height="1" fill="#1A3A5C" />
      <rect x="9" y="11" width="1" height="1" fill="#1A3A5C" />
      <rect x="7" y="13" width="2" height="1" fill="#1A3A5C" />
      <rect x="4" y="12" width="1" height="1" fill="#E8A0A0" opacity="0.8" />
      <rect x="11" y="12" width="1" height="1" fill="#E8A0A0" opacity="0.8" />
      <rect x="6" y="5" width="4" height="6" fill="#3D8B5E" />
      <rect x="5" y="6" width="6" height="5" fill="#4A9A6A" />
      <rect x="2" y="6" width="3" height="3" fill="#3D8B5E" />
      <rect x="3" y="5" width="2" height="2" fill="#4A9A6A" />
      <rect x="11" y="7" width="3" height="3" fill="#3D8B5E" />
      <rect x="11" y="6" width="2" height="2" fill="#4A9A6A" />
      <rect x="7" y="3" width="2" height="3" fill="#FAD05A" />
      <rect x="6" y="4" width="1" height="2" fill="#F5B800" />
      <rect x="9" y="4" width="1" height="2" fill="#F5B800" />
      <rect x="4" y="14" width="8" height="2" fill="#A87C52" />
    </g>
  );
}
function PxBloom_cactus() {
  return (
    <g>
      <rect x="5" y="10" width="6" height="4" fill="#D4B896" />
      <rect x="4" y="11" width="8" height="3" fill="#C8A882" />
      <rect x="6" y="11" width="1" height="1" fill="#1A3A5C" />
      <rect x="9" y="11" width="1" height="1" fill="#1A3A5C" />
      <rect x="7" y="13" width="2" height="1" fill="#1A3A5C" />
      <rect x="4" y="12" width="1" height="1" fill="#E8A0A0" opacity="0.8" />
      <rect x="11" y="12" width="1" height="1" fill="#E8A0A0" opacity="0.8" />
      <rect x="6" y="5" width="4" height="6" fill="#3D8B5E" />
      <rect x="5" y="6" width="6" height="5" fill="#4A9A6A" />
      <rect x="2" y="6" width="3" height="3" fill="#3D8B5E" />
      <rect x="11" y="7" width="3" height="3" fill="#3D8B5E" />
      <rect x="7" y="1" width="2" height="5" fill="#FAD05A" />
      <rect x="6" y="2" width="4" height="4" fill="#FAD05A" />
      <rect x="5" y="3" width="2" height="2" fill="#FAD05A" />
      <rect x="9" y="3" width="2" height="2" fill="#FAD05A" />
      <rect x="7" y="2" width="2" height="3" fill="#FF9900" />
      <rect x="2" y="6" width="1" height="1" fill="#5AA870" />
      <rect x="13" y="7" width="1" height="1" fill="#5AA870" />
      <rect x="4" y="14" width="8" height="2" fill="#A87C52" />
    </g>
  );
}
function PxFull_cactus() {
  return (
    <g>
      <rect x="4" y="9" width="8" height="5" fill="#D4B896" />
      <rect x="3" y="10" width="10" height="4" fill="#C8A882" />
      <rect x="5" y="10" width="1" height="1" fill="#1A3A5C" />
      <rect x="10" y="10" width="1" height="1" fill="#1A3A5C" />
      <rect x="7" y="12" width="2" height="1" fill="#1A3A5C" />
      <rect x="3" y="11" width="1" height="1" fill="#E8A0A0" opacity="0.8" />
      <rect x="12" y="11" width="1" height="1" fill="#E8A0A0" opacity="0.8" />
      <rect x="6" y="4" width="4" height="6" fill="#2D7A40" />
      <rect x="5" y="5" width="6" height="5" fill="#3D8B5E" />
      <rect x="1" y="5" width="4" height="3" fill="#2D7A40" />
      <rect x="2" y="4" width="3" height="2" fill="#3D8B5E" />
      <rect x="1" y="7" width="3" height="3" fill="#3D8B5E" />
      <rect x="11" y="5" width="4" height="3" fill="#2D7A40" />
      <rect x="11" y="4" width="3" height="2" fill="#3D8B5E" />
      <rect x="12" y="7" width="3" height="3" fill="#3D8B5E" />
      <rect x="5" y="1" width="2" height="4" fill="#FAD05A" />
      <rect x="7" y="0" width="2" height="4" fill="#FF9900" />
      <rect x="9" y="1" width="2" height="4" fill="#FAD05A" />
      <rect x="4" y="2" width="2" height="2" fill="#FAD05A" />
      <rect x="10" y="2" width="2" height="2" fill="#FAD05A" />
      <rect x="1" y="5" width="1" height="1" fill="#5AA870" />
      <rect x="14" y="5" width="1" height="1" fill="#5AA870" />
      <rect x="4" y="14" width="8" height="2" fill="#A87C52" />
    </g>
  );
}

// ============================
// 불꽃몬 계열 (fire)
// ============================
function PxSeed_fire() {
  return (
    <g>
      <rect x="5" y="8" width="6" height="6" fill="#D4B896" />
      <rect x="4" y="9" width="8" height="5" fill="#C8A882" />
      <rect x="6" y="9" width="1" height="1" fill="#1A3A5C" />
      <rect x="9" y="9" width="1" height="1" fill="#1A3A5C" />
      <rect x="7" y="11" width="2" height="1" fill="#1A3A5C" />
      <rect x="4" y="10" width="1" height="1" fill="#E8A0A0" opacity="0.8" />
      <rect x="11" y="10" width="1" height="1" fill="#E8A0A0" opacity="0.8" />
      <rect x="7" y="6" width="2" height="3" fill="#FF6B00" />
      <rect x="6" y="7" width="1" height="2" fill="#FF9900" />
      <rect x="9" y="7" width="1" height="2" fill="#FF9900" />
      <rect x="7" y="5" width="2" height="2" fill="#FFD700" />
      <rect x="8" y="4" width="1" height="2" fill="#fff" opacity="0.7" />
      <rect x="4" y="13" width="8" height="2" fill="#A87C52" />
      <rect x="5" y="15" width="6" height="1" fill="#8B6340" />
    </g>
  );
}
function PxSprout_fire() {
  return (
    <g>
      <rect x="5" y="9" width="6" height="5" fill="#D4B896" />
      <rect x="4" y="10" width="8" height="4" fill="#C8A882" />
      <rect x="6" y="10" width="1" height="1" fill="#1A3A5C" />
      <rect x="9" y="10" width="1" height="1" fill="#1A3A5C" />
      <rect x="7" y="12" width="2" height="1" fill="#1A3A5C" />
      <rect x="4" y="11" width="1" height="1" fill="#E8A0A0" opacity="0.8" />
      <rect x="11" y="11" width="1" height="1" fill="#E8A0A0" opacity="0.8" />
      <rect x="7" y="5" width="2" height="5" fill="#FF6B00" />
      <rect x="6" y="6" width="4" height="4" fill="#FF8C00" />
      <rect x="5" y="5" width="3" height="3" fill="#FF6B00" />
      <rect x="8" y="4" width="3" height="3" fill="#FF6B00" />
      <rect x="6" y="4" width="2" height="2" fill="#FF9900" />
      <rect x="9" y="3" width="2" height="2" fill="#FF9900" />
      <rect x="7" y="3" width="2" height="2" fill="#FFD700" />
      <rect x="8" y="2" width="1" height="2" fill="#fff" opacity="0.6" />
      <rect x="4" y="13" width="8" height="2" fill="#A87C52" />
      <rect x="5" y="15" width="6" height="1" fill="#8B6340" />
    </g>
  );
}
function PxLeaf_fire() {
  return (
    <g>
      <rect x="5" y="10" width="6" height="4" fill="#D4B896" />
      <rect x="4" y="11" width="8" height="3" fill="#C8A882" />
      <rect x="6" y="11" width="1" height="1" fill="#1A3A5C" />
      <rect x="9" y="11" width="1" height="1" fill="#1A3A5C" />
      <rect x="7" y="13" width="2" height="1" fill="#1A3A5C" />
      <rect x="4" y="12" width="1" height="1" fill="#E8A0A0" opacity="0.8" />
      <rect x="11" y="12" width="1" height="1" fill="#E8A0A0" opacity="0.8" />
      <rect x="6" y="6" width="4" height="5" fill="#FF6B00" />
      <rect x="5" y="7" width="6" height="4" fill="#FF8C00" />
      <rect x="2" y="6" width="4" height="3" fill="#FF6B00" />
      <rect x="1" y="5" width="3" height="2" fill="#FF9900" />
      <rect x="10" y="6" width="4" height="3" fill="#FF6B00" />
      <rect x="12" y="5" width="3" height="2" fill="#FF9900" />
      <rect x="5" y="4" width="2" height="3" fill="#FF9900" />
      <rect x="9" y="3" width="2" height="3" fill="#FF9900" />
      <rect x="7" y="2" width="2" height="4" fill="#FFD700" />
      <rect x="7" y="1" width="2" height="2" fill="#fff" opacity="0.5" />
      <rect x="4" y="14" width="8" height="2" fill="#A87C52" />
    </g>
  );
}
function PxBloom_fire() {
  return (
    <g>
      <rect x="5" y="10" width="6" height="4" fill="#D4B896" />
      <rect x="4" y="11" width="8" height="3" fill="#C8A882" />
      <rect x="6" y="11" width="1" height="1" fill="#1A3A5C" />
      <rect x="9" y="11" width="1" height="1" fill="#1A3A5C" />
      <rect x="7" y="13" width="2" height="1" fill="#1A3A5C" />
      <rect x="4" y="12" width="1" height="1" fill="#E8A0A0" opacity="0.8" />
      <rect x="11" y="12" width="1" height="1" fill="#E8A0A0" opacity="0.8" />
      <rect x="6" y="6" width="4" height="5" fill="#CC3300" />
      <rect x="5" y="7" width="6" height="4" fill="#FF4500" />
      <rect x="2" y="6" width="4" height="3" fill="#CC3300" />
      <rect x="10" y="6" width="4" height="3" fill="#CC3300" />
      <rect x="3" y="3" width="2" height="4" fill="#FF6B00" />
      <rect x="5" y="2" width="2" height="5" fill="#FF9900" />
      <rect x="7" y="1" width="2" height="5" fill="#FFD700" />
      <rect x="9" y="2" width="2" height="4" fill="#FF9900" />
      <rect x="11" y="3" width="2" height="4" fill="#FF6B00" />
      <rect x="6" y="1" width="2" height="2" fill="#fff" opacity="0.5" />
      <rect x="4" y="14" width="8" height="2" fill="#A87C52" />
    </g>
  );
}
function PxFull_fire() {
  return (
    <g>
      <rect x="4" y="9" width="8" height="5" fill="#D4B896" />
      <rect x="3" y="10" width="10" height="4" fill="#C8A882" />
      <rect x="5" y="10" width="1" height="1" fill="#1A3A5C" />
      <rect x="10" y="10" width="1" height="1" fill="#1A3A5C" />
      <rect x="7" y="12" width="2" height="1" fill="#1A3A5C" />
      <rect x="3" y="11" width="1" height="1" fill="#E8A0A0" opacity="0.8" />
      <rect x="12" y="11" width="1" height="1" fill="#E8A0A0" opacity="0.8" />
      <rect x="5" y="5" width="6" height="5" fill="#CC3300" />
      <rect x="4" y="6" width="8" height="4" fill="#FF4500" />
      <rect x="2" y="2" width="3" height="5" fill="#FF6B00" />
      <rect x="4" y="1" width="2" height="5" fill="#FF9900" />
      <rect x="6" y="0" width="2" height="5" fill="#FFD700" />
      <rect x="8" y="0" width="2" height="5" fill="#FFD700" />
      <rect x="10" y="1" width="2" height="5" fill="#FF9900" />
      <rect x="12" y="2" width="2" height="5" fill="#FF6B00" />
      <rect x="7" y="1" width="2" height="3" fill="#fff" opacity="0.6" />
      <rect x="0" y="5" width="3" height="4" fill="#FF6B00" />
      <rect x="13" y="5" width="3" height="4" fill="#FF6B00" />
      <rect x="4" y="13" width="8" height="2" fill="#A87C52" />
    </g>
  );
}

// ============================
// 얼음몬 계열 (ice)
// ============================
function PxSeed_ice() {
  return (
    <g>
      <rect x="5" y="8" width="6" height="6" fill="#D4E8F4" />
      <rect x="4" y="9" width="8" height="5" fill="#C4DCF0" />
      <rect x="6" y="9" width="1" height="1" fill="#1A3A5C" />
      <rect x="9" y="9" width="1" height="1" fill="#1A3A5C" />
      <rect x="7" y="11" width="2" height="1" fill="#1A3A5C" />
      <rect x="4" y="10" width="1" height="1" fill="#A8D0F0" opacity="0.8" />
      <rect x="11" y="10" width="1" height="1" fill="#A8D0F0" opacity="0.8" />
      <rect x="7" y="5" width="2" height="4" fill="#88C0E8" />
      <rect x="5" y="6" width="6" height="2" fill="#88C0E8" />
      <rect x="6" y="5" width="1" height="1" fill="#fff" />
      <rect x="9" y="5" width="1" height="1" fill="#fff" />
      <rect x="6" y="7" width="1" height="1" fill="#fff" />
      <rect x="9" y="7" width="1" height="1" fill="#fff" />
      <rect x="7" y="4" width="2" height="2" fill="#B8E0F8" />
      <rect x="4" y="13" width="8" height="2" fill="#A87C52" />
      <rect x="5" y="15" width="6" height="1" fill="#8B6340" />
    </g>
  );
}
function PxSprout_ice() {
  return (
    <g>
      <rect x="5" y="9" width="6" height="5" fill="#D4E8F4" />
      <rect x="4" y="10" width="8" height="4" fill="#C4DCF0" />
      <rect x="6" y="10" width="1" height="1" fill="#1A3A5C" />
      <rect x="9" y="10" width="1" height="1" fill="#1A3A5C" />
      <rect x="7" y="12" width="2" height="1" fill="#1A3A5C" />
      <rect x="4" y="11" width="1" height="1" fill="#A8D0F0" opacity="0.8" />
      <rect x="11" y="11" width="1" height="1" fill="#A8D0F0" opacity="0.8" />
      <rect x="7" y="4" width="2" height="6" fill="#88C0E8" />
      <rect x="6" y="5" width="4" height="5" fill="#A8D8F8" />
      <rect x="3" y="5" width="3" height="4" fill="#88C0E8" />
      <rect x="2" y="6" width="2" height="3" fill="#A8D8F8" />
      <rect x="10" y="5" width="3" height="4" fill="#88C0E8" />
      <rect x="12" y="6" width="2" height="3" fill="#A8D8F8" />
      <rect x="5" y="4" width="1" height="1" fill="#fff" />
      <rect x="10" y="4" width="1" height="1" fill="#fff" />
      <rect x="7" y="3" width="2" height="2" fill="#B8E0F8" />
      <rect x="4" y="13" width="8" height="2" fill="#A87C52" />
    </g>
  );
}
function PxLeaf_ice() {
  return (
    <g>
      <rect x="5" y="10" width="6" height="4" fill="#D4E8F4" />
      <rect x="4" y="11" width="8" height="3" fill="#C4DCF0" />
      <rect x="6" y="11" width="1" height="1" fill="#1A3A5C" />
      <rect x="9" y="11" width="1" height="1" fill="#1A3A5C" />
      <rect x="7" y="13" width="2" height="1" fill="#1A3A5C" />
      <rect x="4" y="12" width="1" height="1" fill="#A8D0F0" opacity="0.8" />
      <rect x="11" y="12" width="1" height="1" fill="#A8D0F0" opacity="0.8" />
      <rect x="6" y="5" width="4" height="6" fill="#70B0E0" />
      <rect x="5" y="6" width="6" height="5" fill="#88C0E8" />
      <rect x="5" y="3" width="2" height="4" fill="#88C0E8" />
      <rect x="7" y="2" width="2" height="4" fill="#A8D8F8" />
      <rect x="9" y="3" width="2" height="4" fill="#88C0E8" />
      <rect x="1" y="6" width="4" height="4" fill="#70B0E0" />
      <rect x="2" y="5" width="3" height="2" fill="#88C0E8" />
      <rect x="11" y="6" width="4" height="4" fill="#70B0E0" />
      <rect x="11" y="5" width="3" height="2" fill="#88C0E8" />
      <rect x="6" y="3" width="1" height="1" fill="#fff" />
      <rect x="8" y="2" width="1" height="1" fill="#fff" />
      <rect x="10" y="3" width="1" height="1" fill="#fff" />
      <rect x="4" y="14" width="8" height="2" fill="#A87C52" />
    </g>
  );
}
function PxBloom_ice() {
  return (
    <g>
      <rect x="5" y="10" width="6" height="4" fill="#D4E8F4" />
      <rect x="4" y="11" width="8" height="3" fill="#C4DCF0" />
      <rect x="6" y="11" width="1" height="1" fill="#1A3A5C" />
      <rect x="9" y="11" width="1" height="1" fill="#1A3A5C" />
      <rect x="7" y="13" width="2" height="1" fill="#1A3A5C" />
      <rect x="4" y="12" width="1" height="1" fill="#A8D0F0" opacity="0.8" />
      <rect x="11" y="12" width="1" height="1" fill="#A8D0F0" opacity="0.8" />
      <rect x="6" y="6" width="4" height="5" fill="#5090C8" />
      <rect x="5" y="7" width="6" height="4" fill="#70B0E0" />
      <rect x="7" y="1" width="2" height="6" fill="#88C0E8" />
      <rect x="5" y="3" width="6" height="2" fill="#88C0E8" />
      <rect x="4" y="2" width="2" height="2" fill="#A8D8F8" />
      <rect x="10" y="2" width="2" height="2" fill="#A8D8F8" />
      <rect x="6" y="1" width="1" height="1" fill="#fff" />
      <rect x="9" y="1" width="1" height="1" fill="#fff" />
      <rect x="7" y="0" width="2" height="1" fill="#fff" />
      <rect x="1" y="6" width="4" height="4" fill="#5090C8" />
      <rect x="11" y="6" width="4" height="4" fill="#5090C8" />
      <rect x="4" y="14" width="8" height="2" fill="#A87C52" />
    </g>
  );
}
function PxFull_ice() {
  return (
    <g>
      <rect x="4" y="9" width="8" height="5" fill="#D4E8F4" />
      <rect x="3" y="10" width="10" height="4" fill="#C4DCF0" />
      <rect x="5" y="10" width="1" height="1" fill="#1A3A5C" />
      <rect x="10" y="10" width="1" height="1" fill="#1A3A5C" />
      <rect x="7" y="12" width="2" height="1" fill="#1A3A5C" />
      <rect x="3" y="11" width="1" height="1" fill="#A8D0F0" opacity="0.8" />
      <rect x="12" y="11" width="1" height="1" fill="#A8D0F0" opacity="0.8" />
      <rect x="5" y="5" width="6" height="5" fill="#3870A8" />
      <rect x="4" y="6" width="8" height="4" fill="#5090C8" />
      <rect x="7" y="0" width="2" height="6" fill="#70B0E0" />
      <rect x="4" y="3" width="8" height="2" fill="#70B0E0" />
      <rect x="2" y="1" width="2" height="3" fill="#88C0E8" />
      <rect x="12" y="1" width="2" height="3" fill="#88C0E8" />
      <rect x="4" y="1" width="2" height="2" fill="#88C0E8" />
      <rect x="10" y="1" width="2" height="2" fill="#88C0E8" />
      <rect x="7" y="0" width="1" height="1" fill="#fff" />
      <rect x="5" y="3" width="1" height="1" fill="#fff" />
      <rect x="10" y="3" width="1" height="1" fill="#fff" />
      <rect x="0" y="5" width="3" height="5" fill="#5090C8" />
      <rect x="13" y="5" width="3" height="5" fill="#5090C8" />
      <rect x="4" y="13" width="8" height="2" fill="#A87C52" />
    </g>
  );
}

// ============================
// 번개씨앗 계열 (bolt) — 희귀
// ============================
function PxSeed_bolt() {
  return (
    <g>
      <rect x="5" y="8" width="6" height="6" fill="#1A3A5C" />
      <rect x="4" y="9" width="8" height="5" fill="#0C2A4A" />
      <rect x="6" y="9" width="1" height="1" fill="#FAD05A" />
      <rect x="9" y="9" width="1" height="1" fill="#FAD05A" />
      <rect x="7" y="11" width="2" height="1" fill="#FAD05A" />
      <rect x="4" y="10" width="1" height="1" fill="#FFE080" opacity="0.8" />
      <rect x="11" y="10" width="1" height="1" fill="#FFE080" opacity="0.8" />
      <rect x="8" y="5" width="2" height="4" fill="#FAD05A" />
      <rect x="7" y="6" width="3" height="1" fill="#FAD05A" />
      <rect x="6" y="7" width="3" height="1" fill="#FFE080" />
      <rect x="8" y="4" width="2" height="2" fill="#FFE080" />
      <rect x="9" y="3" width="1" height="2" fill="#fff" opacity="0.7" />
      <rect x="4" y="13" width="8" height="2" fill="#1A3A5C" />
      <rect x="5" y="15" width="6" height="1" fill="#0C2A4A" />
    </g>
  );
}
function PxSprout_bolt() {
  return (
    <g>
      <rect x="5" y="9" width="6" height="5" fill="#1A3A5C" />
      <rect x="4" y="10" width="8" height="4" fill="#0C2A4A" />
      <rect x="6" y="10" width="1" height="1" fill="#FAD05A" />
      <rect x="9" y="10" width="1" height="1" fill="#FAD05A" />
      <rect x="7" y="12" width="2" height="1" fill="#FAD05A" />
      <rect x="4" y="11" width="1" height="1" fill="#FFE080" opacity="0.8" />
      <rect x="11" y="11" width="1" height="1" fill="#FFE080" opacity="0.8" />
      <rect x="8" y="4" width="2" height="2" fill="#FAD05A" />
      <rect x="7" y="5" width="2" height="2" fill="#FAD05A" />
      <rect x="8" y="6" width="2" height="2" fill="#FAD05A" />
      <rect x="7" y="7" width="3" height="2" fill="#FFE080" />
      <rect x="5" y="5" width="2" height="1" fill="#FAD05A" />
      <rect x="10" y="6" width="2" height="1" fill="#FAD05A" />
      <rect x="4" y="7" width="2" height="1" fill="#FFE080" />
      <rect x="11" y="8" width="2" height="1" fill="#FFE080" />
      <rect x="9" y="3" width="1" height="2" fill="#fff" opacity="0.6" />
      <rect x="4" y="13" width="8" height="2" fill="#1A3A5C" />
      <rect x="5" y="15" width="6" height="1" fill="#0C2A4A" />
    </g>
  );
}
function PxLeaf_bolt() {
  return (
    <g>
      <rect x="5" y="10" width="6" height="4" fill="#1A3A5C" />
      <rect x="4" y="11" width="8" height="3" fill="#0C2A4A" />
      <rect x="6" y="11" width="1" height="1" fill="#FAD05A" />
      <rect x="9" y="11" width="1" height="1" fill="#FAD05A" />
      <rect x="7" y="13" width="2" height="1" fill="#FAD05A" />
      <rect x="4" y="12" width="1" height="1" fill="#FFE080" opacity="0.8" />
      <rect x="11" y="12" width="1" height="1" fill="#FFE080" opacity="0.8" />
      <rect x="8" y="5" width="3" height="2" fill="#FAD05A" />
      <rect x="6" y="6" width="4" height="2" fill="#FAD05A" />
      <rect x="7" y="7" width="3" height="2" fill="#FAD05A" />
      <rect x="5" y="8" width="5" height="2" fill="#FFE080" />
      <rect x="2" y="6" width="4" height="2" fill="#FAD05A" />
      <rect x="1" y="5" width="3" height="2" fill="#FFE080" />
      <rect x="10" y="7" width="4" height="2" fill="#FAD05A" />
      <rect x="12" y="6" width="3" height="2" fill="#FFE080" />
      <rect x="7" y="3" width="2" height="3" fill="#FAD05A" />
      <rect x="4" y="14" width="8" height="2" fill="#1A3A5C" />
    </g>
  );
}
function PxBloom_bolt() {
  return (
    <g>
      <rect x="5" y="10" width="6" height="4" fill="#1A3A5C" />
      <rect x="4" y="11" width="8" height="3" fill="#0C2A4A" />
      <rect x="6" y="11" width="1" height="1" fill="#FAD05A" />
      <rect x="9" y="11" width="1" height="1" fill="#FAD05A" />
      <rect x="7" y="13" width="2" height="1" fill="#FAD05A" />
      <rect x="4" y="12" width="1" height="1" fill="#FFE080" opacity="0.8" />
      <rect x="11" y="12" width="1" height="1" fill="#FFE080" opacity="0.8" />
      <rect x="6" y="6" width="4" height="5" fill="#0C2A4A" />
      <rect x="5" y="7" width="6" height="4" fill="#1A3A5C" />
      <rect x="9" y="2" width="3" height="5" fill="#FAD05A" />
      <rect x="7" y="1" width="3" height="5" fill="#FFE080" />
      <rect x="5" y="2" width="3" height="4" fill="#FAD05A" />
      <rect x="3" y="3" width="3" height="4" fill="#FFD700" />
      <rect x="11" y="3" width="3" height="4" fill="#FFD700" />
      <rect x="1" y="6" width="4" height="3" fill="#FAD05A" />
      <rect x="11" y="6" width="4" height="3" fill="#FAD05A" />
      <rect x="8" y="0" width="1" height="2" fill="#fff" opacity="0.7" />
      <rect x="4" y="14" width="8" height="2" fill="#1A3A5C" />
    </g>
  );
}
function PxFull_bolt() {
  return (
    <g>
      <rect x="4" y="9" width="8" height="5" fill="#1A3A5C" />
      <rect x="3" y="10" width="10" height="4" fill="#0C2A4A" />
      <rect x="5" y="10" width="1" height="1" fill="#FAD05A" />
      <rect x="10" y="10" width="1" height="1" fill="#FAD05A" />
      <rect x="7" y="12" width="2" height="1" fill="#FAD05A" />
      <rect x="3" y="11" width="1" height="1" fill="#FFE080" opacity="0.8" />
      <rect x="12" y="11" width="1" height="1" fill="#FFE080" opacity="0.8" />
      <rect x="5" y="5" width="6" height="5" fill="#0C2A4A" />
      <rect x="4" y="6" width="8" height="4" fill="#1A3A5C" />
      <rect x="10" y="0" width="3" height="6" fill="#FAD05A" />
      <rect x="8" y="0" width="3" height="5" fill="#FFE080" />
      <rect x="6" y="1" width="3" height="5" fill="#FAD05A" />
      <rect x="3" y="1" width="3" height="5" fill="#FFD700" />
      <rect x="11" y="1" width="3" height="4" fill="#FFD700" />
      <rect x="0" y="5" width="4" height="4" fill="#FAD05A" />
      <rect x="12" y="5" width="4" height="4" fill="#FAD05A" />
      <rect x="0" y="4" width="3" height="2" fill="#FFE080" />
      <rect x="13" y="4" width="3" height="2" fill="#FFE080" />
      <rect x="9" y="0" width="1" height="1" fill="#fff" opacity="0.8" />
      <rect x="4" y="13" width="8" height="2" fill="#1A3A5C" />
      <rect x="5" y="15" width="6" height="1" fill="#0C2A4A" />
    </g>
  );
}

// ============================
// 흑장미 계열 (rose) — 희귀
// ============================
function PxSeed_rose() {
  return (
    <g>
      <rect x="5" y="8" width="6" height="6" fill="#2A1A2A" />
      <rect x="4" y="9" width="8" height="5" fill="#1A0A1A" />
      <rect x="6" y="9" width="1" height="1" fill="#CC3366" />
      <rect x="9" y="9" width="1" height="1" fill="#CC3366" />
      <rect x="7" y="11" width="2" height="1" fill="#CC3366" />
      <rect x="4" y="10" width="1" height="1" fill="#FF6699" opacity="0.8" />
      <rect x="11" y="10" width="1" height="1" fill="#FF6699" opacity="0.8" />
      <rect x="7" y="5" width="2" height="4" fill="#3D1A2A" />
      <rect x="6" y="6" width="4" height="3" fill="#8B0000" />
      <rect x="7" y="4" width="2" height="3" fill="#AA0022" />
      <rect x="6" y="4" width="1" height="2" fill="#CC3366" />
      <rect x="9" y="4" width="1" height="2" fill="#CC3366" />
      <rect x="7" y="3" width="2" height="2" fill="#FF4488" />
      <rect x="5" y="7" width="1" height="1" fill="#3D1A2A" />
      <rect x="10" y="8" width="1" height="1" fill="#3D1A2A" />
      <rect x="4" y="13" width="8" height="2" fill="#2A1A2A" />
      <rect x="5" y="15" width="6" height="1" fill="#1A0A1A" />
    </g>
  );
}
function PxSprout_rose() {
  return (
    <g>
      <rect x="5" y="9" width="6" height="5" fill="#2A1A2A" />
      <rect x="4" y="10" width="8" height="4" fill="#1A0A1A" />
      <rect x="6" y="10" width="1" height="1" fill="#CC3366" />
      <rect x="9" y="10" width="1" height="1" fill="#CC3366" />
      <rect x="7" y="12" width="2" height="1" fill="#CC3366" />
      <rect x="4" y="11" width="1" height="1" fill="#FF6699" opacity="0.8" />
      <rect x="11" y="11" width="1" height="1" fill="#FF6699" opacity="0.8" />
      <rect x="7" y="4" width="2" height="6" fill="#3D1A2A" />
      <rect x="8" y="5" width="1" height="5" fill="#5A2A3A" />
      <rect x="3" y="5" width="4" height="3" fill="#3D1A2A" />
      <rect x="2" y="6" width="2" height="2" fill="#5A2A3A" />
      <rect x="3" y="4" width="1" height="1" fill="#8B0000" />
      <rect x="9" y="4" width="4" height="3" fill="#3D1A2A" />
      <rect x="12" y="5" width="2" height="2" fill="#5A2A3A" />
      <rect x="12" y="4" width="1" height="1" fill="#8B0000" />
      <rect x="7" y="2" width="2" height="3" fill="#8B0000" />
      <rect x="6" y="3" width="1" height="2" fill="#AA0022" />
      <rect x="9" y="3" width="1" height="2" fill="#AA0022" />
      <rect x="7" y="1" width="2" height="2" fill="#CC3366" />
      <rect x="4" y="13" width="8" height="2" fill="#2A1A2A" />
      <rect x="5" y="15" width="6" height="1" fill="#1A0A1A" />
    </g>
  );
}
function PxLeaf_rose() {
  return (
    <g>
      <rect x="5" y="10" width="6" height="4" fill="#2A1A2A" />
      <rect x="4" y="11" width="8" height="3" fill="#1A0A1A" />
      <rect x="6" y="11" width="1" height="1" fill="#CC3366" />
      <rect x="9" y="11" width="1" height="1" fill="#CC3366" />
      <rect x="7" y="13" width="2" height="1" fill="#CC3366" />
      <rect x="4" y="12" width="1" height="1" fill="#FF6699" opacity="0.8" />
      <rect x="11" y="12" width="1" height="1" fill="#FF6699" opacity="0.8" />
      <rect x="7" y="5" width="2" height="6" fill="#3D1A2A" />
      <rect x="1" y="5" width="6" height="4" fill="#3D1A2A" />
      <rect x="2" y="4" width="4" height="2" fill="#5A2A3A" />
      <rect x="1" y="7" width="2" height="3" fill="#2A1A2A" />
      <rect x="3" y="4" width="1" height="1" fill="#8B0000" />
      <rect x="9" y="4" width="6" height="4" fill="#3D1A2A" />
      <rect x="10" y="3" width="4" height="2" fill="#5A2A3A" />
      <rect x="13" y="7" width="2" height="3" fill="#2A1A2A" />
      <rect x="12" y="4" width="1" height="1" fill="#8B0000" />
      <rect x="6" y="2" width="4" height="4" fill="#8B0000" />
      <rect x="5" y="3" width="2" height="3" fill="#AA0022" />
      <rect x="9" y="3" width="2" height="3" fill="#AA0022" />
      <rect x="7" y="2" width="2" height="3" fill="#CC3366" />
      <rect x="7" y="1" width="2" height="2" fill="#FF4488" />
      <rect x="6" y="2" width="1" height="1" fill="#FF99CC" opacity="0.6" />
      <rect x="4" y="14" width="8" height="2" fill="#2A1A2A" />
    </g>
  );
}
function PxBloom_rose() {
  return (
    <g>
      <rect x="5" y="10" width="6" height="4" fill="#2A1A2A" />
      <rect x="4" y="11" width="8" height="3" fill="#1A0A1A" />
      <rect x="6" y="11" width="1" height="1" fill="#CC3366" />
      <rect x="9" y="11" width="1" height="1" fill="#CC3366" />
      <rect x="7" y="13" width="2" height="1" fill="#CC3366" />
      <rect x="4" y="12" width="1" height="1" fill="#FF6699" opacity="0.8" />
      <rect x="11" y="12" width="1" height="1" fill="#FF6699" opacity="0.8" />
      <rect x="7" y="6" width="2" height="5" fill="#3D1A2A" />
      <rect x="2" y="6" width="4" height="3" fill="#3D1A2A" />
      <rect x="10" y="6" width="4" height="3" fill="#3D1A2A" />
      <rect x="5" y="2" width="6" height="5" fill="#8B0000" />
      <rect x="4" y="3" width="8" height="4" fill="#AA0022" />
      <rect x="3" y="4" width="3" height="3" fill="#8B0000" />
      <rect x="10" y="4" width="3" height="3" fill="#8B0000" />
      <rect x="6" y="3" width="4" height="3" fill="#CC3366" />
      <rect x="7" y="2" width="2" height="4" fill="#CC3366" />
      <rect x="7" y="2" width="2" height="2" fill="#FF4488" />
      <rect x="5" y="3" width="1" height="1" fill="#FF99CC" opacity="0.7" />
      <rect x="10" y="5" width="1" height="1" fill="#FF99CC" opacity="0.7" />
      <rect x="4" y="14" width="8" height="2" fill="#2A1A2A" />
    </g>
  );
}
function PxFull_rose() {
  return (
    <g>
      <rect x="4" y="9" width="8" height="5" fill="#2A1A2A" />
      <rect x="3" y="10" width="10" height="4" fill="#1A0A1A" />
      <rect x="5" y="10" width="1" height="1" fill="#CC3366" />
      <rect x="10" y="10" width="1" height="1" fill="#CC3366" />
      <rect x="7" y="12" width="2" height="1" fill="#CC3366" />
      <rect x="3" y="11" width="1" height="1" fill="#FF6699" opacity="0.8" />
      <rect x="12" y="11" width="1" height="1" fill="#FF6699" opacity="0.8" />
      <rect x="7" y="5" width="2" height="5" fill="#2A1A2A" />
      <rect x="5" y="8" width="1" height="1" fill="#5A2A3A" />
      <rect x="9" y="7" width="1" height="1" fill="#5A2A3A" />
      <rect x="3" y="1" width="10" height="5" fill="#8B0000" />
      <rect x="2" y="2" width="12" height="4" fill="#AA0022" />
      <rect x="1" y="3" width="14" height="3" fill="#8B0000" />
      <rect x="5" y="2" width="6" height="4" fill="#CC3366" />
      <rect x="6" y="1" width="4" height="4" fill="#CC3366" />
      <rect x="7" y="0" width="2" height="4" fill="#FF4488" />
      <rect x="7" y="0" width="2" height="2" fill="#FF99CC" />
      <rect x="0" y="4" width="2" height="4" fill="#3D1A2A" />
      <rect x="0" y="3" width="2" height="2" fill="#5A2A3A" />
      <rect x="14" y="4" width="2" height="4" fill="#3D1A2A" />
      <rect x="14" y="3" width="2" height="2" fill="#5A2A3A" />
      <rect x="4" y="2" width="1" height="1" fill="#FF99CC" opacity="0.6" />
      <rect x="11" y="3" width="1" height="1" fill="#FF99CC" opacity="0.6" />
      <rect x="7" y="0" width="1" height="1" fill="#fff" opacity="0.5" />
      <rect x="4" y="13" width="8" height="2" fill="#2A1A2A" />
      <rect x="5" y="15" width="6" height="1" fill="#1A0A1A" />
    </g>
  );
}

// ============================
// secret — 뻐끔플라워 (잠금)
// ============================
function PxSecret() {
  return (
    <g>
      <rect x="5" y="11" width="6" height="3" fill="#A0522D" />
      <rect x="4" y="12" width="8" height="2" fill="#8B4513" />
      <rect x="6" y="10" width="4" height="1" fill="#6B4226" />
      <rect x="7" y="6" width="2" height="5" fill="#2D7A2D" />
      <rect x="5" y="3" width="6" height="4" fill="#CC2222" />
      <rect x="4" y="4" width="8" height="3" fill="#DD3333" />
      <rect x="6" y="2" width="4" height="2" fill="#CC2222" />
      <rect x="6" y="4" width="1" height="1" fill="#FFF" />
      <rect x="9" y="4" width="1" height="1" fill="#FFF" />
      <rect x="7" y="5" width="2" height="1" fill="#FFF" />
      <rect x="4" y="14" width="8" height="2" fill="#5C3010" />
    </g>
  );
}

const PIXEL_RENDERERS = {
  seed:      { seed: PxSeed_seedmon,  sprout: PxSprout_seedmon,  leaf: PxLeaf_seedmon,  bloom: PxBloom_seedmon,  full: PxFull_seedmon  },
  mushroom:  { seed: PxSeed_mushroom, sprout: PxSprout_mushroom, leaf: PxLeaf_mushroom, bloom: PxBloom_mushroom, full: PxFull_mushroom },
  moonlight: { seed: PxSeed_moonlight,sprout: PxSprout_moonlight,leaf: PxLeaf_moonlight,bloom: PxBloom_moonlight,full: PxFull_moonlight },
  cactus:    { seed: PxSeed_cactus,   sprout: PxSprout_cactus,   leaf: PxLeaf_cactus,   bloom: PxBloom_cactus,   full: PxFull_cactus   },
  fire:      { seed: PxSeed_fire,     sprout: PxSprout_fire,     leaf: PxLeaf_fire,     bloom: PxBloom_fire,     full: PxFull_fire     },
  ice:       { seed: PxSeed_ice,      sprout: PxSprout_ice,      leaf: PxLeaf_ice,      bloom: PxBloom_ice,      full: PxFull_ice      },
  bolt:      { seed: PxSeed_bolt,     sprout: PxSprout_bolt,     leaf: PxLeaf_bolt,     bloom: PxBloom_bolt,     full: PxFull_bolt     },
  rose:      { seed: PxSeed_rose,     sprout: PxSprout_rose,     leaf: PxLeaf_rose,     bloom: PxBloom_rose,     full: PxFull_rose     },
  secret:    { seed: PxSecret, sprout: PxSecret, leaf: PxSecret, bloom: PxSecret, full: PxSecret },
};

function PixelPlant({ species = 'seed', stage = 'seed', size = 64, locked = false, glow = false }) {
  const Renderer = PIXEL_RENDERERS[species]?.[stage] || PxSeed_seedmon;
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      style={{
        imageRendering: 'pixelated',
        filter: locked ? 'grayscale(1) brightness(0.4)' : (glow ? 'drop-shadow(0 0 6px rgba(168, 213, 181, 0.5))' : 'none'),
        opacity: locked ? 0.6 : 1,
        display: 'block',
      }}
    >
      <Renderer />
    </svg>
  );
}

export { PixelPlant, PIXEL_SPECIES, PIXEL_RENDERERS };
