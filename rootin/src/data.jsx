// Mock data for Rootin prototype
// NOTE: USER 목업 제거됨 — 유저 정보는 context/UserContext.jsx (useUser 훅) 사용

const POTS = [
  {
    id: 'coding',
    name: '코딩',
    emoji: '💻',
    species: 'seed',         // 씨앗몬 계열
    intro: '매일 한 가지씩, 모르던 걸 알게 되는 기록.',
    tilCount: 28,
    level: 7,
    levelProgress: 0.62,
    color: '#ff9eb5',
    createdAt: '2026.02.14',
    waterToday: true,
  },
  {
    id: 'english',
    name: '영어',
    emoji: '🔤',
    species: 'moonlight',    // 달빛씨앗 (희귀)
    intro: '읽고 들은 문장을 내 것으로 만드는 중.',
    tilCount: 12,
    level: 3,
    levelProgress: 0.45,
    color: '#a8d5e5',
    createdAt: '2026.03.02',
    waterToday: true,
  },
  {
    id: 'reading',
    name: '독서',
    emoji: '📚',
    species: 'mushroom',     // 버섯몬 계열
    intro: '책에서 건진 문장과 생각.',
    tilCount: 6,
    level: 2,
    levelProgress: 0.30,
    color: '#ffd89e',
    createdAt: '2026.04.10',
    waterToday: false,
  },
  {
    id: 'workout',
    name: '운동',
    emoji: '🏃',
    species: 'seed',         // 씨앗몬 (아직 씨앗 단계)
    intro: '몸을 위한 작은 기록.',
    tilCount: 1,
    level: 1,
    levelProgress: 0.08,
    color: '#c8b5ff',
    createdAt: '2026.05.18',
    waterToday: false,
  },
];

// Grass graph — 13 weeks × 7 days
function makeGrass() {
  const cells = [];
  let s = 42;
  const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let w = 0; w < 13; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const recent = w >= 9;
      let v = 0;
      const r = rand();
      if (recent) {
        if (r < 0.18) v = 0;
        else if (r < 0.4) v = 1;
        else if (r < 0.7) v = 2;
        else if (r < 0.9) v = 3;
        else v = 4;
      } else {
        if (r < 0.55) v = 0;
        else if (r < 0.78) v = 1;
        else if (r < 0.92) v = 2;
        else if (r < 0.98) v = 3;
        else v = 4;
      }
      if (w === 12 && d >= 4) v = Math.max(v, 3);
      week.push(v);
    }
    cells.push(week);
  }
  return cells;
}
const GRASS = makeGrass();

const TILS = [
  { id: 't1', potId: 'coding',  title: 'CSS Container Queries 처음 써본 날', excerpt: '컴포넌트 단위로 반응형이 가능하다는 게 신선했음. `@container` 선언이 핵심.', tags: ['css', 'frontend', 'container-queries'], date: '2026.05.22', chars: 842 },
  { id: 't2', potId: 'coding',  title: 'React Server Component 멘탈모델', excerpt: '클라이언트와 서버 컴포넌트의 경계를 "use client" 지시어로 가르는 방식.', tags: ['react', 'rsc'], date: '2026.05.21', chars: 1240 },
  { id: 't3', potId: 'english', title: 'phrase verb: bring up / come up', excerpt: '회의에서 안건을 꺼낼 땐 bring up, 이슈가 자연발생적으로 떠오를 땐 come up.', tags: ['vocab', 'phrasal-verb'], date: '2026.05.21', chars: 320 },
  { id: 't4', potId: 'coding',  title: 'PostgreSQL 인덱스 종류 정리', excerpt: 'B-tree, Hash, GIN, GiST — 각각 언제 쓰는지 사례 중심으로.', tags: ['db', 'postgres', 'index'], date: '2026.05.20', chars: 1580 },
  { id: 't5', potId: 'reading', title: '《일의 격》— 비효율을 견디는 힘', excerpt: '깊은 일은 비효율 구간을 견딘 사람만이 닿는다는 문장에 밑줄.', tags: ['책', '일'], date: '2026.05.20', chars: 412 },
  { id: 't6', potId: 'coding',  title: 'Tailwind v4 변경점 훑기', excerpt: 'CSS 변수 기반 토큰, Oxide 엔진, 더 빠른 빌드. 마이그레이션 노트가 깔끔.', tags: ['tailwind', 'css'], date: '2026.05.19', chars: 680 },
  { id: 't7', potId: 'english', title: 'shadowing 5분 챌린지 — TED talk', excerpt: '한 단락만, 입에 익을 때까지. 발음보다 끊어 읽기가 더 어려움.', tags: ['shadowing', 'listening'], date: '2026.05.19', chars: 240 },
  { id: 't8', potId: 'coding',  title: 'Zod로 폼 스키마 통합', excerpt: '클라/서버 양쪽에서 동일한 스키마를 쓰니 타입 분기가 깔끔해짐.', tags: ['zod', 'validation'], date: '2026.05.18', chars: 920 },
];

// 식물도감 — 종 계열별 진화 컬렉션
// 각 종은 5단계 진화. 사용자가 도달한 단계까지가 'reached'.
// 한 종은 화분 별로 '회차'를 가질 수 있음. (씨앗몬 코딩 2회차 = 코딩 화분에서 두번째로 키운 씨앗몬)
const DEX = [
  {
    no: '001',
    species: 'seed',
    label: '씨앗몬 계열',
    rarity: 'common',
    paletteHint: '브라운 · 그린',
    reach: 'bloom', // 도달한 최고 진화 단계
    state: 'growing', // growing | harvested | locked
    pot: { emoji: '💻', name: '코딩', round: 2 },
    levels: { '씨앗': '02.14', '새싹': '02.26', '잎': '03.04', '개화': '04.11', '만개': null },
    currentStage: 'bloom',
    potLevel: 7,
    startedAt: '2026.02.14',
    harvestedAt: null,
  },
  {
    no: '002',
    species: 'mushroom',
    label: '버섯몬 계열',
    rarity: 'common',
    paletteHint: '브라운 · 퍼플',
    reach: 'sprout',
    state: 'growing',
    pot: { emoji: '📚', name: '독서', round: 1 },
    levels: { '씨앗': '04.10', '새싹': '05.03', '잎': null, '개화': null, '만개': null },
    currentStage: 'sprout',
    potLevel: 2,
    startedAt: '2026.04.10',
    harvestedAt: null,
  },
  {
    no: '003',
    species: 'moonlight',
    label: '달빛씨앗 계열',
    rarity: 'rare',
    paletteHint: '딥 네이비 · 실버',
    reach: 'full',
    state: 'harvested',
    pot: { emoji: '🔤', name: '영어', round: 1 },
    levels: { '씨앗': '02.01', '새싹': '02.20', '잎': '03.12', '개화': '04.10', '만개': '04.27' },
    currentStage: 'full',
    potLevel: 7,
    startedAt: '2026.02.01',
    harvestedAt: '2026.05.01',
  },
  {
    no: '???',
    species: 'secret',
    label: '??? 계열',
    rarity: 'secret',
    paletteHint: '???',
    reach: 'none',
    state: 'locked',
    pot: null,
    levels: {},
    currentStage: null,
    unlockHint: '특수 조건 달성 시 해금',
  },
  // ===== Extra harvested entries (past collected plants) =====
  {
    no: '004', species: 'seed', label: '씨앗몬 계열', rarity: 'common',
    reach: 'full', state: 'harvested',
    pot: { emoji: '💻', name: '코딩', round: 1 },
    currentStage: 'full', potLevel: 12,
    startedAt: '2025.11.04', harvestedAt: '2026.02.10',
    levels: { '씨앗': '11.04', '새싹': '11.18', '잎': '12.02', '개화': '01.15', '만개': '02.10' },
  },
  {
    no: '005', species: 'mushroom', label: '버섯몬 계열', rarity: 'common',
    reach: 'full', state: 'harvested',
    pot: { emoji: '📚', name: '독서', round: 1 },
    currentStage: 'full', potLevel: 5,
    startedAt: '2025.12.21', harvestedAt: '2026.03.28',
    levels: { '씨앗': '12.21', '새싹': '01.07', '잎': '01.30', '개화': '02.18', '만개': '03.28' },
  },
];

const WEEKLY = [
  { day: '일', count: 0 },
  { day: '월', count: 2 },
  { day: '화', count: 3 },
  { day: '수', count: 1 },
  { day: '목', count: 2 },
  { day: '금', count: 4 },
  { day: '토', count: 1 },
];

const TODAY_GOALS = [
  { id: 'g1', label: 'TIL 1개 작성하기', done: true, point: 50 },
  { id: 'g2', label: '연속 기록 이어가기', done: true, point: 30 },
  { id: 'g3', label: '500자 이상 작성', done: false, point: 20 },
  { id: 'g4', label: '주말에도 한 줄 기록', done: false, point: 10 },
];

const TEMPLATES = [
  { id: 'tpl1', name: '기본 TIL', desc: '오늘 배운 것 / 왜 중요한지 / 다음 액션' },
  { id: 'tpl2', name: '코드 스니펫', desc: '문제 / 해결 코드 / 회고' },
  { id: 'tpl3', name: '독서 노트', desc: '인용 / 생각 / 내 삶에 적용' },
];

// Garden 꾸미기 — 4 themes
const GARDEN_THEMES = [
  { id: 'meadow',  name: '풀밭',     sky: 'linear-gradient(180deg, #cfe6f0 0%, #e8f4ec 50%, #d4ebdc 100%)',  ground: '#a8d5b5', accent: '#3d8b5e', sunColor: '#ffd84d', emoji: '🌿' },
  { id: 'sunset',  name: '노을',     sky: 'linear-gradient(180deg, #ffd0a8 0%, #ffb3a8 40%, #c89a8a 100%)', ground: '#b8946a', accent: '#8b6340', sunColor: '#ff7a45', emoji: '🌅' },
  { id: 'night',   name: '달밤',     sky: 'linear-gradient(180deg, #0f2a47 0%, #1a3a5c 60%, #2a4a6c 100%)', ground: '#3a5070', accent: '#a8d5e5', sunColor: '#e8f4ec', emoji: '🌙' },
  { id: 'paper',   name: '미니멀',   sky: 'linear-gradient(180deg, #faf9f5 0%, #f5f7f5 100%)',              ground: '#e6ebe6', accent: '#1a3a5c', sunColor: '#1a3a5c', emoji: '🧱' },
];

// Garden layout — pot positions (x %, y % from top of scene area)
// User can rearrange freely in 꾸미기 mode.
const DEFAULT_GARDEN_LAYOUT = {
  coding:  { x: 18, y: 78 },
  english: { x: 40, y: 72 },
  reading: { x: 62, y: 80 },
  workout: { x: 82, y: 74 },
};

export { POTS, GRASS, TILS, DEX, WEEKLY, TODAY_GOALS, TEMPLATES, GARDEN_THEMES, DEFAULT_GARDEN_LAYOUT };
