// 정원 화면 공유 로직 — 게임보이/클래식 양 테마가 공유하는 순수 변환·매퍼·날짜 유틸.
// screens-garden.jsx 와 screens-garden.classic.jsx 에서 추출 (마크업/디자인은 각 화면 파일에 유지).
import { inferSpecies } from './utils/plant.js';

const GROWTH_STAGE_TO_PIXEL_STAGE = {
  SEED: 'seed',
  SPROUT: 'sprout',
  MATURE: 'leaf',
  LEAF: 'leaf',
  BLOOM: 'bloom',
  FULL_BLOOM: 'full',
};

const STAGE_REPRESENTATIVE_TIL_COUNT = {
  seed: 1,
  sprout: 6,
  leaf: 16,
  bloom: 26,
  full: 40,
};

const POT_TITLE_MAX_LENGTH = 10;
const POT_DESCRIPTION_MAX_LENGTH = 25;
const EMPTY_POT_INTRO = '아직 소개글이 없는 화분이에요.';
const POT_TITLE_PREVIEW_STYLE = {
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};
const POT_DESCRIPTION_PREVIEW_STYLE = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  overflowWrap: 'anywhere',
  wordBreak: 'break-word',
};

const POT_LAYOUT_SLOTS = [
  { x: 18, y: 78 },
  { x: 40, y: 72 },
  { x: 62, y: 80 },
  { x: 82, y: 74 },
  { x: 28, y: 88 },
  { x: 52, y: 86 },
  { x: 74, y: 90 },
];

const POT_TIER_META = [
  {
    minLevel: 1,
    label: '흙빛 화분',
    shortLabel: '기본',
    rim: ['#d8b58b', '#a87552'],
    body: ['#c89468', '#9f6545'],
    accent: '#7a472d',
    outline: 'rgba(92, 48, 16, 0.22)',
    clipPath: 'polygon(8% 0, 92% 0, 76% 100%, 24% 100%)',
  },
  {
    minLevel: 5,
    label: '새싹 도자기 화분',
    shortLabel: '도자기',
    rim: ['#e7f3e8', '#9ccab0'],
    body: ['#dcefe0', '#9bbd9f'],
    accent: '#3d8b5e',
    outline: 'rgba(46, 107, 72, 0.24)',
    clipPath: 'polygon(5% 0, 95% 0, 82% 100%, 18% 100%)',
  },
  {
    minLevel: 15,
    label: '이끼 화분',
    shortLabel: '이끼',
    rim: ['#9dbb83', '#557744'],
    body: ['#78965d', '#4f6639'],
    accent: '#d8d6a7',
    outline: 'rgba(51, 83, 44, 0.34)',
    clipPath: 'polygon(4% 0, 96% 0, 86% 100%, 14% 100%)',
    moss: true,
  },
  {
    minLevel: 25,
    label: '석재 화분',
    shortLabel: '석재',
    rim: ['#d9ddd6', '#8c958f'],
    body: ['#b9c0bc', '#727b77'],
    accent: '#5f6967',
    outline: 'rgba(49, 58, 55, 0.32)',
    clipPath: 'polygon(2% 0, 98% 0, 88% 100%, 12% 100%)',
    blocks: true,
  },
  {
    minLevel: 40,
    label: '명예 화분',
    shortLabel: '명예',
    rim: ['#f0d778', '#b28a2d'],
    body: ['#2f7655', '#194b38'],
    accent: '#f2dc85',
    outline: 'rgba(36, 73, 53, 0.4)',
    clipPath: 'polygon(3% 0, 97% 0, 84% 100%, 16% 100%)',
    crest: true,
  },
];

function getPotTier(level = 1) {
  const safeLevel = Math.max(1, Number(level) || 1);
  return POT_TIER_META
    .slice()
    .reverse()
    .find(tier => safeLevel >= tier.minLevel) ?? POT_TIER_META[0];
}

function growthStageToPixelStage(growthStage) {
  return GROWTH_STAGE_TO_PIXEL_STAGE[growthStage] ?? 'seed';
}


function getStageEmoji(stage) {
  const stageEmojis = {
    seed: '🫘',
    sprout: '🌱',
    leaf: '🌿',
    bloom: '🌸',
    full: '💐',
  };
  return stageEmojis[stage] ?? '🫘';
}

function calculateLevelProgress(totalExp = 0, level = 1) {
  const safeLevel = Math.max(1, Number(level) || 1);
  const minExpForLevel = ((safeLevel - 1) * safeLevel * 100) / 2;
  const currentLevelExp = Math.max(0, Number(totalExp) - minExpForLevel);
  return Math.min(1, currentLevelExp / (safeLevel * 100));
}

function percentFromRatio(value = 0) {
  return Math.min(100, Math.max(0, Math.round((Number(value) || 0) * 100)));
}

function formatPotExperience(pot) {
  return `${percentFromRatio(pot.levelProgress)}/100`;
}

function formatPlantGrowthPercent(pot) {
  const growth = Number(pot.plantGrowthPercentage);
  if (Number.isFinite(growth) && growth > 0) {
    return Math.min(100, Math.max(0, Math.round(growth)));
  }
  return percentFromRatio(pot.levelProgress);
}

function getPlantStageStatus(stage) {
  const stageStatuses = {
    seed: '씨앗',
    sprout: '새싹',
    leaf: '성숙',
    bloom: '개화',
    full: '만개',
    // 백엔드의 growthStage API 값과도 안전하게 매핑되도록 대문자 상태도 지원합니다.
    SEED: '씨앗',
    SPROUT: '새싹',
    MATURE: '성숙',
    BLOOM: '개화',
    FULL_BLOOM: '만개',
  };
  return stageStatuses[stage] ?? '씨앗';
}

function getHarvestStatus(canHarvest) {
  return canHarvest ? '수확 가능' : '수확 불가';
}

function resolveWateredToday(wateredToday, lastWateredAt) {
  return Boolean(wateredToday) || isTodayDateTime(lastWateredAt);
}

function toGardenPot(apiPot) {
  const growthStage = apiPot.growthStage;
  const stage = growthStageToPixelStage(growthStage);
  const level = apiPot.level ?? 1;
  const levelProgress = calculateLevelProgress(apiPot.totalExp, level);
  return {
    id: apiPot.id,
    name: apiPot.title,
    emoji: getStageEmoji(stage),
    species: inferSpecies(apiPot.plantName),
    intro: apiPot.description || EMPTY_POT_INTRO,
    tilCount: STAGE_REPRESENTATIVE_TIL_COUNT[stage],
    level,
    levelProgress,
    totalExp: apiPot.totalExp ?? 0,
    color: '#a8d5b5',
    createdAt: '',
    lastWateredAt: apiPot.lastWateredAt ?? null,
    waterToday: resolveWateredToday(apiPot.wateredToday, apiPot.lastWateredAt),
    plantName: apiPot.plantName,
    growthStage,
    plantGrowthPercentage: 0,
    canHarvest: false,
    stage,
  };
}

function toDashboardPot(dashboard) {
  const growthStage = dashboard.plant?.growthStage;
  const stage = growthStageToPixelStage(growthStage);
  const levelProgress = Math.min(1, Math.max(0, (dashboard.progressPercentage ?? 0) / 100));
  return {
    id: dashboard.potId,
    name: dashboard.title,
    emoji: getStageEmoji(stage),
    species: inferSpecies(dashboard.plant?.name),
    intro: dashboard.description || EMPTY_POT_INTRO,
    tilCount: dashboard.totalTilCount ?? STAGE_REPRESENTATIVE_TIL_COUNT[stage],
    level: dashboard.level ?? 1,
    levelProgress,
    totalExp: dashboard.totalExp ?? 0,
    currentLevelExp: dashboard.currentLevelExp ?? 0,
    nextLevelExpRequired: dashboard.nextLevelExpRequired ?? 0,
    streakDays: dashboard.streakDays ?? 0,
    lastWateredAt: dashboard.lastWateredAt ?? null,
    waterToday: resolveWateredToday(dashboard.wateredToday, dashboard.lastWateredAt),
    plantName: dashboard.plant?.name,
    growthStage,
    plantGrowthPercentage: dashboard.plant?.growthPercentage ?? 0,
    canHarvest: dashboard.plant?.canHarvest ?? false,
    imageUrl: dashboard.plant?.imageUrl ?? null,
    silhouetteUrl: dashboard.plant?.silhouetteUrl ?? null,
    createdAt: '',
    color: '#a8d5b5',
    stage,
  };
}

function formatDateTime(value) {
  if (!value) return '아직 물주기 기록 없음';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function isTodayDateTime(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return getKstDateString(date) === getKstDateString();
}

function getKstDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const getPart = (type) => Number(parts.find(part => part.type === type)?.value);
  return { year: getPart('year'), month: getPart('month'), day: getPart('day') };
}

function getKstDateString(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function getMsUntilKstMidnight() {
  const now = new Date();
  const { year, month, day } = getKstDateParts(now);
  const kstOffsetMs = 9 * 60 * 60 * 1000;
  // KST 다음 날 00:00을 UTC 기준 timestamp로 환산합니다.
  const nextKstMidnightUtc = Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0) - kstOffsetMs;
  return Math.max(0, nextKstMidnightUtc - now.getTime());
}

function formatTilDateTime(value) {
  if (!value) return '작성일 정보 없음';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatTilDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function toTilListItem(til) {
  const content = til.content ?? '';
  const plainContent = (til.content ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    id: til.tilId,
    title: til.title,
    date: formatTilDate(til.publishedAt ?? til.createdAt),
    createdAt: til.createdAt,
    updatedAt: til.updatedAt,
    publishedAt: til.publishedAt,
    content,
    chars: plainContent.length,
    excerpt: plainContent || '작성된 본문 미리보기가 없어요.',
    tags: Array.isArray(til.tags) ? til.tags : [],
    author: til.author,
    potId: til.potId,
    potName: til.potName,
  };
}

function getLayoutSlot(index) {
  const slot = POT_LAYOUT_SLOTS[index % POT_LAYOUT_SLOTS.length];
  const row = Math.floor(index / POT_LAYOUT_SLOTS.length);
  return {
    x: Math.min(92, slot.x + row * 6),
    y: Math.min(94, slot.y + row * 3),
  };
}

function findNearestVisiblePotId(position, layout, pots, hiddenPots) {
  if (!position || position.x == null || position.y == null) return null;

  return pots
    .filter(pot => !hiddenPots[pot.id])
    .map(pot => {
      const potPosition = layout[pot.id];
      if (!potPosition) return null;
      return {
        id: pot.id,
        distance: Math.hypot(position.x - potPosition.x, position.y - potPosition.y),
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.distance - right.distance)[0]?.id ?? null;
}

const POTTED_PLANT_ALIGNMENT = {
  seed: { scale: 0.92 },
  sprout: { scale: 0.96 },
  leaf: { scale: 1 },
  bloom: { scale: 1 },
  full: { scale: 1.02 },
};

function getPottedPlantAlignment(stage) {
  return POTTED_PLANT_ALIGNMENT[stage] ?? POTTED_PLANT_ALIGNMENT.seed;
}

export {
  POT_TITLE_MAX_LENGTH,
  POT_DESCRIPTION_MAX_LENGTH,
  EMPTY_POT_INTRO,
  POT_TITLE_PREVIEW_STYLE,
  POT_DESCRIPTION_PREVIEW_STYLE,
  getPotTier,
  formatPotExperience,
  formatPlantGrowthPercent,
  getPlantStageStatus,
  getHarvestStatus,
  toGardenPot,
  toDashboardPot,
  formatDateTime,
  getKstDateString,
  getMsUntilKstMidnight,
  formatTilDateTime,
  toTilListItem,
  getLayoutSlot,
  findNearestVisiblePotId,
  getPottedPlantAlignment,
};
