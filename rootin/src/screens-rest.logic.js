// 도감·AI 화면 공유 로직 — 게임보이/클래식 양 테마가 공유하는 BE 매핑·정책 상수.
// screens-rest.jsx 와 screens-rest.classic.jsx 에서 추출 (마크업/디자인은 각 화면 파일에 유지).

const SPECIES_TO_PIXEL = {
  seed:   'seed',
  shroom: 'mushroom',
  cactus: 'cactus',
  fire:   'fire',
  ice:    'ice',
  moon:   'moonlight',
  bolt:   'bolt',
  rose:   'rose',
};

const STAGE_KEYS = ['seed', 'sprout', 'leaf', 'bloom', 'full'];

const GROWTH_STAGE_TO_STAGE = {
  SEED: 'seed', SPROUT: 'sprout', MATURE: 'leaf', BLOOM: 'bloom', FULL_BLOOM: 'full',
};

const TIL_MODAL_PAGE_SIZE = 10;
const TIL_IDS_MAX_SIZE = 200; // BE AiPolicy.TIL_IDS_MAX_SIZE 와 동기화 — AI에 전달 가능한 선택 최대 개수

export { SPECIES_TO_PIXEL, STAGE_KEYS, GROWTH_STAGE_TO_STAGE, TIL_MODAL_PAGE_SIZE, TIL_IDS_MAX_SIZE };
