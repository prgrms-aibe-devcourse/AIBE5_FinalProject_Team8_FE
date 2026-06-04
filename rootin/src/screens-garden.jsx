import { useState, useEffect, useRef } from 'react';
import { POTS, GARDEN_THEMES, DEFAULT_GARDEN_LAYOUT, TILS } from './data.jsx';
import { harvestPot, getGardenState, updateGardenTheme, updateGardenLayout } from './api/garden.js';
import { createPot, getGardenDashboard, getPots, updatePot } from './api/pot.js';
import { getMyTils, getTil } from './api/til.js';
import { useUser } from './context/UserContext.jsx';
import { Icon, Pill, Btn, Card, SectionHeader, ProgressBar } from './ui.jsx';
import { PixelPlant, PIXEL_SPECIES } from './pixel-plants.jsx';
import { tilCountToStage, STAGE_META } from './plants.jsx';

// Garden + Pot Detail screens — pixel-art edition with 정원 꾸미기 mode

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

function inferSpecies(plantName = '') {
  if (plantName.includes('달빛')) return 'moonlight';
  if (plantName.includes('버섯')) return 'mushroom';
  return 'seed';
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
    intro: apiPot.description || '아직 소개글이 없는 화분이에요.',
    tilCount: STAGE_REPRESENTATIVE_TIL_COUNT[stage],
    level,
    levelProgress,
    totalExp: apiPot.totalExp ?? 0,
    color: '#a8d5b5',
    createdAt: '',
    waterToday: false,
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
    intro: dashboard.description || '아직 소개글이 없는 화분이에요.',
    tilCount: dashboard.totalTilCount ?? STAGE_REPRESENTATIVE_TIL_COUNT[stage],
    level: dashboard.level ?? 1,
    levelProgress,
    totalExp: dashboard.totalExp ?? 0,
    currentLevelExp: dashboard.currentLevelExp ?? 0,
    nextLevelExpRequired: dashboard.nextLevelExpRequired ?? 0,
    streakDays: dashboard.streakDays ?? 0,
    lastWateredAt: dashboard.lastWateredAt ?? null,
    waterToday: false,
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

function PottedPlant({ species, stage, size = 64, locked = false, glow = false, potLevel = 1 }) {
  const tier = getPotTier(potLevel);
  const potWidth = size * 0.5;
  const potHeight = size * 0.26;
  const rimHeight = size * 0.09;
  const pixel = Math.max(2, size * 0.025);

  return (
    <div style={{
      position: 'relative',
      width: size,
      height: size,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: 'translateY(-8%)',
        zIndex: 1,
      }}>
        <PixelPlant species={species} stage={stage} size={size} locked={locked} glow={glow} />
      </div>
      <div style={{
        position: 'absolute',
        left: '50%',
        bottom: size * 0.02,
        width: potWidth,
        height: potHeight,
        transform: 'translateX(-50%)',
        zIndex: 2,
        pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          width: potWidth * 1.18,
          height: rimHeight,
          transform: 'translateX(-50%)',
          background: `linear-gradient(180deg, ${tier.rim[0]} 0%, ${tier.rim[1]} 100%)`,
          border: `0.5px solid ${tier.outline}`,
          borderRadius: Math.max(4, size * 0.05),
        }} />
        <div style={{
          position: 'absolute',
          left: '50%',
          top: rimHeight * 0.56,
          width: potWidth * 0.88,
          height: potHeight - rimHeight * 0.2,
          transform: 'translateX(-50%)',
          background: `linear-gradient(180deg, ${tier.body[0]} 0%, ${tier.body[1]} 100%)`,
          border: `0.5px solid ${tier.outline}`,
          clipPath: tier.clipPath,
        }} />
        {tier.blocks && (
          <>
            <div style={{ position: 'absolute', left: potWidth * 0.25, top: rimHeight * 1.22, width: pixel * 3, height: pixel, background: 'rgba(255,255,255,0.28)' }} />
            <div style={{ position: 'absolute', right: potWidth * 0.25, top: rimHeight * 1.86, width: pixel * 2.5, height: pixel, background: 'rgba(49,58,55,0.2)' }} />
          </>
        )}
        {tier.moss && (
          <>
            <div style={{ position: 'absolute', left: potWidth * 0.19, top: rimHeight * 1.18, width: pixel * 2, height: pixel * 1.25, background: '#c6d98b', borderRadius: pixel }} />
            <div style={{ position: 'absolute', right: potWidth * 0.22, top: rimHeight * 1.74, width: pixel * 1.5, height: pixel * 1.5, background: '#d8d6a7', borderRadius: pixel }} />
          </>
        )}
        {tier.crest && (
          <div style={{
            position: 'absolute',
            left: '50%',
            top: rimHeight * 1.42,
            width: pixel * 3.2,
            height: pixel * 3.2,
            transform: 'translateX(-50%) rotate(45deg)',
            background: tier.accent,
            border: '0.5px solid rgba(83, 62, 18, 0.26)',
          }} />
        )}
        <div style={{
          position: 'absolute',
          left: '50%',
          top: rimHeight * 0.9,
          width: potWidth * 0.48,
          height: pixel,
          transform: 'translateX(-50%)',
          background: tier.accent,
          opacity: 0.72,
          borderRadius: 999,
        }} />
      </div>
    </div>
  );
}

// ============================
// Pot card (used in grid)
// ============================
function PotCard({ pot, onClick }) {
  const stage = pot.stage ?? tilCountToStage(pot.tilCount ?? 0);
  const stageMeta = STAGE_META[stage];
  const potTier = getPotTier(pot.level);
  const rare = pot.species === 'moonlight';
  const levelProgress = pot.levelProgress ?? ((pot.tilCount ?? 0) / stageMeta.next);
  return (
    <Card padding={20} hoverable onClick={onClick} style={{
      display: 'flex', flexDirection: 'column', gap: 12,
      background: rare
        ? 'linear-gradient(180deg, #ffffff 0%, #eef2fa 100%)'
        : 'linear-gradient(180deg, #ffffff 0%, #f9faf7 100%)',
      borderColor: rare ? '#ccd6ec' : undefined,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>Lv.{pot.level} · {potTier.shortLabel} 화분 · {stageMeta.label}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--ink)', marginTop: 4 }}>{pot.emoji} {pot.name}</div>
        </div>
        {pot.waterToday ? (
          <Pill tone="green"><span style={{ display: 'inline-flex', marginRight: 2 }}>{Icon.drop}</span>오늘 물줌</Pill>
        ) : (
          <Pill tone="warn">물줄 시간</Pill>
        )}
      </div>

      <div style={{
        height: 132,
        background: rare
          ? 'radial-gradient(ellipse at center bottom, rgba(168, 197, 235, 0.5), transparent 70%)'
          : 'radial-gradient(ellipse at center bottom, rgba(168, 213, 181, 0.4), transparent 70%)',
        display: 'flex', justifyContent: 'center', alignItems: 'flex-end',
        borderRadius: 10,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 18, height: 1, background: 'linear-gradient(90deg, transparent, var(--leaf), transparent)' }} />
        <div style={{ paddingBottom: 6 }}>
          <PottedPlant species={pot.species} stage={stage} size={112} potLevel={pot.level} />
        </div>
      </div>

      <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.6, minHeight: 36 }}>{pot.intro}</div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-3)' }}>
          <span>화분 레벨 진척도</span>
          <span style={{ color: 'var(--moss-2)' }}>{Math.round(levelProgress * 100)}%</span>
        </div>
        <ProgressBar value={levelProgress} />
      </div>
    </Card>
  );
}

// ============================
// Pixel ground tiles (8-bit style strip)
// ============================
function PixelGround({ color = '#a8d5b5', shade = '#7cb893', length = 32 }) {
  const tiles = [];
  for (let i = 0; i < length; i++) {
    tiles.push(
      <div key={i} style={{
        width: 16, height: 16,
        background: i % 2 === 0 ? color : shade,
        borderRight: '0.5px solid rgba(0,0,0,0.06)',
      }} />
    );
  }
  return (
    <div style={{ display: 'flex', position: 'absolute', left: 0, right: 0, bottom: 0, imageRendering: 'pixelated' }}>
      {tiles}
    </div>
  );
}

// ============================
// Garden Scene — themed background with pixel plants
// ============================
function GardenScene({ pots, theme, layout, editMode, onMovePot, onOpenPot, dense = false, decorations = [], onMoveDecoration, onRemoveDecoration, hiddenPots = {}, onHidePot }) {
  const sceneRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const dragOffsetRef = useRef({ dx: 0, dy: 0 });

  // Pointer handlers for dragging pots
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const rect = sceneRef.current.getBoundingClientRect();
      const rawX = ((e.clientX - rect.left) / rect.width) * 100;
      const rawY = ((e.clientY - rect.top) / rect.height) * 100;
      const x = Math.max(4, Math.min(96, rawX - dragOffsetRef.current.dx));
      const y = Math.max(20, Math.min(95, rawY - dragOffsetRef.current.dy));
      if (dragging.kind === 'pot') {
        onMovePot(dragging.id, x, y);
      } else if (dragging.kind === 'dec' && onMoveDecoration) {
        onMoveDecoration(dragging.id, x, y);
      }
    };
    const onUp = () => setDragging(null);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging, onMovePot, onMoveDecoration]);

  const startDrag = (kind, id, e, currentPos) => {
    e.preventDefault();
    const rect = sceneRef.current.getBoundingClientRect();
    const pointerX = ((e.clientX - rect.left) / rect.width) * 100;
    const pointerY = ((e.clientY - rect.top) / rect.height) * 100;
    dragOffsetRef.current = {
      dx: pointerX - currentPos.x,
      dy: pointerY - currentPos.y,
    };
    setDragging({ kind, id });
  };

  const stopControlPropagation = (e) => {
    e.stopPropagation();
  };

  const sceneHeight = dense ? 280 : 360;
  const isDark = theme.id === 'night';

  return (
    <div ref={sceneRef} style={{
      position: 'relative',
      height: sceneHeight,
      background: theme.sky,
      borderRadius: 14,
      overflow: 'hidden',
      cursor: editMode ? 'crosshair' : 'default',
      userSelect: 'none',
    }}>
      {/* sun / moon */}
      <div style={{
        position: 'absolute', top: 22, right: 50,
        width: 36, height: 36,
        background: theme.sunColor,
        boxShadow: `0 0 24px ${theme.sunColor}80`,
        imageRendering: 'pixelated',
      }} />

      {/* stars for night */}
      {isDark && (
        <>
          {[
            { l: '12%', t: '18%' }, { l: '24%', t: '30%' }, { l: '38%', t: '14%' },
            { l: '50%', t: '24%' }, { l: '68%', t: '12%' }, { l: '82%', t: '40%' },
            { l: '92%', t: '22%' }, { l: '8%',  t: '42%' },
          ].map((s, i) => (
            <div key={i} style={{
              position: 'absolute', left: s.l, top: s.t,
              width: 2, height: 2, background: '#fff',
              boxShadow: '0 0 4px #fff',
            }} />
          ))}
        </>
      )}

      {/* clouds (not in night) */}
      {!isDark && (
        <>
          <div style={{ position: 'absolute', top: 30, left: '20%', display: 'flex', imageRendering: 'pixelated' }}>
            <div style={{ width: 14, height: 6, background: 'rgba(255,255,255,0.65)' }} />
            <div style={{ width: 18, height: 10, background: 'rgba(255,255,255,0.85)', marginLeft: -4 }} />
            <div style={{ width: 14, height: 7, background: 'rgba(255,255,255,0.7)', marginLeft: -4 }} />
          </div>
          <div style={{ position: 'absolute', top: 56, left: '58%', display: 'flex', imageRendering: 'pixelated' }}>
            <div style={{ width: 10, height: 5, background: 'rgba(255,255,255,0.55)' }} />
            <div style={{ width: 14, height: 8, background: 'rgba(255,255,255,0.75)', marginLeft: -3 }} />
          </div>
        </>
      )}

      {/* ground gradient + horizon */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 28,
        height: 60,
        background: `linear-gradient(180deg, transparent, ${theme.ground}66 70%, ${theme.ground} 100%)`,
      }} />

      {/* pixel grass tufts */}
      {!isDark && theme.id !== 'paper' && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 18, display: 'flex', justifyContent: 'space-between', padding: '0 20px', imageRendering: 'pixelated' }}>
          {[6, 22, 41, 55, 73, 88].map((p, i) => (
            <div key={i} style={{
              position: 'absolute', left: `${p}%`,
              transform: 'translateX(-50%)',
              display: 'flex', alignItems: 'flex-end', gap: 1,
            }}>
              <div style={{ width: 2, height: 4, background: theme.accent, opacity: 0.7 }} />
              <div style={{ width: 2, height: 6, background: theme.accent }} />
              <div style={{ width: 2, height: 3, background: theme.accent, opacity: 0.7 }} />
            </div>
          ))}
        </div>
      )}

      {/* edit mode grid */}
      {editMode && (
        <>
          {[20, 40, 60, 80].map(p => (
            <div key={`v${p}`} style={{
              position: 'absolute', left: `${p}%`, top: 0, bottom: 0,
              width: 1, borderLeft: '1px dashed rgba(255,255,255,0.35)',
              pointerEvents: 'none',
            }} />
          ))}
          {[25, 50, 75].map(p => (
            <div key={`h${p}`} style={{
              position: 'absolute', top: `${p}%`, left: 0, right: 0,
              height: 1, borderTop: '1px dashed rgba(255,255,255,0.35)',
              pointerEvents: 'none',
            }} />
          ))}
        </>
      )}

      {/* decorations (harvested plant items placed by user) */}
      {decorations.map(d => {
        const pos = { x: d.x, y: d.y };
        const isDragging = dragging?.kind === 'dec' && dragging?.id === d.id;
        return (
          <div
            key={d.id}
            style={{
              position: 'absolute',
              left: `${pos.x}%`, top: `${pos.y}%`,
              transform: 'translate3d(-50%, -100%, 0)',
              cursor: editMode ? (isDragging ? 'grabbing' : 'grab') : 'default',
              opacity: editMode ? 1 : 0.95,
              touchAction: 'none',
              transition: isDragging ? 'none' : 'left 160ms ease, top 160ms ease',
              zIndex: isDragging ? 10 : 1,
              willChange: isDragging ? 'left, top, transform' : 'auto',
            }}
          >
            <div
              onPointerDown={editMode ? (e) => startDrag('dec', d.id, e, pos) : undefined}
            >
              <PixelPlant species={d.species} stage="full" size={56} glow={d.species === 'moonlight'} />
            </div>
            {editMode && (
              <button
                type="button"
                onPointerDown={stopControlPropagation}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemoveDecoration && onRemoveDecoration(d.id);
                }}
                style={{
                  position: 'absolute',
                  top: -12, right: -12,
                  width: 28, height: 28, borderRadius: '50%',
                  background: '#fff',
                  border: '1px solid rgba(184, 83, 106, 0.32)',
                  color: '#b8536a',
                  fontSize: 16, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(15,42,71,0.16)',
                  lineHeight: 1,
                  zIndex: 30,
                  padding: 0,
                  touchAction: 'manipulation',
                }}
                title="장식 제거"
              >×</button>
            )}
          </div>
        );
      })}

      {/* pots — positioned by layout[id].x / .y */}
      {pots.filter(p => !hiddenPots[p.id]).map(pot => {
        const stage = pot.stage ?? tilCountToStage(pot.tilCount ?? 0);
        const pos = layout[pot.id] || { x: 50, y: 75 };
        const size = dense ? 76 : 92;
        const isDragging = dragging?.kind === 'pot' && dragging?.id === pot.id;
        return (
          <div
            key={pot.id}
            style={{
              position: 'absolute',
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: 'translate3d(-50%, -100%, 0)',
              cursor: editMode ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              transition: isDragging ? 'none' : 'left 200ms ease, top 200ms ease',
              touchAction: 'none',
              zIndex: isDragging ? 10 : 2,
              willChange: isDragging ? 'left, top, transform' : 'auto',
            }}
          >
            <div
              onPointerDown={editMode ? (e) => startDrag('pot', pot.id, e, pos) : undefined}
              onClick={editMode ? undefined : () => onOpenPot && onOpenPot(pot.id)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
            >
              <PottedPlant species={pot.species} stage={stage} size={size} glow={pot.species === 'moonlight'} potLevel={pot.level} />
              <div style={{
                fontSize: 10.5, color: isDark ? '#e8f4ec' : 'var(--ink)',
                fontFamily: 'var(--font-display)', fontWeight: 600,
                padding: '2px 7px', borderRadius: 4,
                background: isDark ? 'rgba(15, 42, 71, 0.6)' : 'rgba(255, 255, 255, 0.75)',
                whiteSpace: 'nowrap',
                imageRendering: 'pixelated',
              }}>
                {pot.emoji} {pot.name}
              </div>
            </div>
            {editMode && (
              <button
                type="button"
                onPointerDown={stopControlPropagation}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onHidePot && onHidePot(pot.id);
                }}
                style={{
                  position: 'absolute',
                  top: -12, right: -12,
                  width: 28, height: 28, borderRadius: '50%',
                  background: '#fff',
                  border: '1px solid rgba(184, 83, 106, 0.32)',
                  color: '#b8536a',
                  fontSize: 16, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(15,42,71,0.16)',
                  lineHeight: 1,
                  zIndex: 30,
                  padding: 0,
                  touchAction: 'manipulation',
                }}
                title="정원에서 숨기기"
              >×</button>
            )}
          </div>
        );
      })}

      {/* edit mode hint */}
      {editMode && (
        <div style={{
          position: 'absolute', top: 14, left: 16,
          padding: '6px 10px', borderRadius: 6,
          background: 'rgba(15, 42, 71, 0.7)', color: '#fff',
          fontSize: 11, fontFamily: 'var(--font-display)',
          backdropFilter: 'blur(4px)',
          whiteSpace: 'nowrap',
        }}>
          ✥ 자유롭게 드래그해서 어디든 배치하세요
        </div>
      )}
    </div>
  );
}

// ============================
// Garden Screen
// ============================
// 백엔드 테마값과 프론트 테마 ID 간의 맵핑을 지정합니다.
const BE_THEME_TO_FE_THEME = {
  FOREST: 'meadow',
  AUTUMN: 'sunset',
  NIGHT: 'night',
  MINI_ROOM: 'paper',
};

const FE_THEME_TO_BE_THEME = {
  meadow: 'FOREST',
  sunset: 'AUTUMN',
  night: 'NIGHT',
  paper: 'MINI_ROOM',
};

function GardenScreen({ onOpenPot }) {
  const { user } = useUser();
  const [editMode, setEditMode] = useState(false);
  const [themeId, setThemeId] = useState('meadow');
  const [layout, setLayout] = useState(DEFAULT_GARDEN_LAYOUT);
  const [decorations, setDecorations] = useState([]);
  const [hiddenPots, setHiddenPots] = useState({}); // { potId: true }
  const [pots, setPots] = useState([]);
  const [potsLoading, setPotsLoading] = useState(true);
  const [potsError, setPotsError] = useState(null);
  const [showCreatePot, setShowCreatePot] = useState(false);

  // 백엔드로부터 가져온 수확 식물의 전체 인벤토리 목록을 관리하기 위한 상태입니다.
  const [allHarvestedPlants, setAllHarvestedPlants] = useState([]);
  // 정원 레이아웃을 백엔드에 저장하는 API 호출 로딩 상태입니다.
  const [layoutSaving, setLayoutSaving] = useState(false);

  const theme = GARDEN_THEMES.find(t => t.id === themeId);
  const movePot = (id, x, y) => setLayout(L => ({ ...L, [id]: { x, y } }));
  const moveDecoration = (id, x, y) => setDecorations(D => D.map(d => d.id === id ? { ...d, x, y } : d));

  // 인벤토리에서 수확 완료 식물을 선택하여 정원에 배치할 때 호출되는 함수입니다.
  const addDecoration = (harvestedPlant) => {
    const species = inferSpecies(harvestedPlant.name);
    setDecorations(D => [
      ...D,
      {
        id: harvestedPlant.id, // 백엔드의 수확식물 고유 ID를 그대로 활용합니다.
        species,
        name: harvestedPlant.name,
        x: 50,
        y: 55
      }
    ]);
  };
  const removeDecoration = (id) => setDecorations(D => D.filter(d => d.id !== id));
  const clearDecorations = () => setDecorations([]);
  const hidePot = (id) => setHiddenPots(H => ({ ...H, [id]: true }));
  const showPot = (id) => {
    const index = pots.findIndex(p => p.id === id);
    setLayout(L => ({ ...L, [id]: L[id] ?? getLayoutSlot(Math.max(0, index)) }));
    setHiddenPots(H => { const N = { ...H }; delete N[id]; return N; });
  };
  const resetGarden = () => {
    setLayout({});
    setHiddenPots(Object.fromEntries(pots.map(p => [p.id, true])));
    setDecorations([]);
  };

  // 정원에 아직 배치되지 않은 수확 식물들만 필터링하여 인벤토리에 나타냅니다.
  const unplacedHarvestedPlants = allHarvestedPlants.filter(
    hp => !decorations.some(d => d.id === hp.id)
  );

  const visiblePots = pots.filter(p => !hiddenPots[p.id]);
  const wateredCount = pots.filter(p => p.waterToday).length;
  const attentionPot = pots.find(p => !p.waterToday) ?? pots[0] ?? null;

  // 신규 화분이 만들어졌을 때 화면에 즉시 배치하기 위한 콜백입니다.
  const handlePotCreated = (createdPot) => {
    const nextPot = toGardenPot({
      ...createdPot,
      plantName: createdPot.plantName ?? '기본 씨앗',
      growthStage: createdPot.growthStage ?? 'SEED',
    });

    const nextIndex = pots.length;
    setPots(current => current.some(p => p.id === nextPot.id) ? current : [...current, nextPot]);
    setLayout(current => ({
      ...current,
      [nextPot.id]: current[nextPot.id] ?? getLayoutSlot(nextIndex),
    }));
    setHiddenPots(current => {
      if (!current[nextPot.id]) return current;
      const next = { ...current };
      delete next[nextPot.id];
      return next;
    });
  };

  // 백엔드 정원 정보를 한 번에 불러오는 비동기 함수입니다.
  const loadGardenState = async (active = true) => {
    setPotsLoading(true);
    setPotsError(null);
    try {
      const [data, potSummaries] = await Promise.all([
        getGardenState(),
        getPots().catch(() => []),
      ]);
      if (!active) return;

      // 1. 서버 테마를 프론트 테마 ID로 변환하여 적용합니다.
      const feTheme = BE_THEME_TO_FE_THEME[data.theme] ?? 'meadow';
      setThemeId(feTheme);

      // 2. 화분 데이터를 정원 포맷에 맞춰 변환하여 저장합니다.
      const potSummaryMap = new Map(
        (Array.isArray(potSummaries) ? potSummaries : []).map(pot => [pot.id, pot])
      );
      const apiPots = (Array.isArray(data.pots) ? data.pots : []).map(pot => {
        const summary = potSummaryMap.get(pot.id);
        return {
          ...summary,
          ...pot,
          description: summary?.description ?? pot.description ?? '',
          totalExp: summary?.totalExp ?? pot.totalExp ?? 0,
        };
      });
      const potList = apiPots.map(toGardenPot);
      setPots(potList);

      // 3. 화분들의 배치 여부(isDisplayed)와 좌표 정보가 있다면 불러옵니다.
      // 아직 한 번도 저장된 배치가 없는 첫 화면에서는 모든 화분을 기본 슬롯에 보여줍니다.
      const newLayout = {};
      const newHiddenPots = {};
      const hasSavedPotLayout = apiPots.some(
        p => p.isDisplayed && p.positionX !== null && p.positionY !== null
      );

      apiPots.forEach((p, index) => {
        if (p.isDisplayed && p.positionX !== null && p.positionY !== null) {
          newLayout[p.id] = { x: p.positionX, y: p.positionY };
        } else if (!hasSavedPotLayout && p.positionX === null && p.positionY === null) {
          newLayout[p.id] = getLayoutSlot(index);
        } else {
          newHiddenPots[p.id] = true;
        }
      });

      // 저장된 배치가 일부만 있는 경우, 숨김 처리되지 않은 화분에는 기본 슬롯 좌표를 할당합니다.
      potList.forEach((pot, index) => {
        if (!newLayout[pot.id] && !newHiddenPots[pot.id]) {
          newLayout[pot.id] = getLayoutSlot(index);
        }
      });

      setLayout(newLayout);
      setHiddenPots(newHiddenPots);

      // 4. 수확한 식물 목록 전체 데이터를 인벤토리용으로 저장합니다.
      const harvestList = Array.isArray(data.harvestedPlants) ? data.harvestedPlants : [];
      setAllHarvestedPlants(harvestList);

      // 5. 수확 식물 중 정원에 배치 표시된 항목들만 추려서 장식물 상태로 변환합니다.
      const activeDecs = harvestList
        .filter(hp => hp.isDisplayed && hp.positionX !== null && hp.positionY !== null)
        .map(hp => ({
          id: hp.id,
          species: inferSpecies(hp.name),
          name: hp.name,
          x: hp.positionX,
          y: hp.positionY,
        }));
      setDecorations(activeDecs);

    } catch (err) {
      if (!active) return;
      setPots([]);
      setAllHarvestedPlants([]);
      setDecorations([]);
      setPotsError('정원 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      if (active) setPotsLoading(false);
    }
  };

  // 컴포넌트 마운트 시 정원 상태를 서버에서 조회해 옵니다.
  useEffect(() => {
    let active = true;
    loadGardenState(active);
    return () => {
      active = false;
    };
  }, []);

  // '꾸미기 완료' 버튼을 눌렀을 때, 배경 테마와 화분/식물의 배치 정보를 일괄 수집하여 백엔드에 전송합니다.
  const handleSaveLayout = async () => {
    setLayoutSaving(true);
    try {
      // 1. 선택된 배경 테마 일괄 저장
      const beTheme = FE_THEME_TO_BE_THEME[themeId];
      if (beTheme) {
        await updateGardenTheme(beTheme);
      }

      // 2. 화분 배치 목록 가공
      const potsPayload = pots.map(p => {
        const isDisplayed = !hiddenPots[p.id];
        const pos = layout[p.id] ?? { x: 50, y: 75 };
        return {
          id: p.id,
          isDisplayed,
          positionX: isDisplayed ? Math.max(0, Math.round(pos.x)) : null,
          positionY: isDisplayed ? Math.max(0, Math.round(pos.y)) : null,
        };
      });

      // 3. 수확 식물 배치 목록 가공
      const harvestedPlantsPayload = allHarvestedPlants.map(hp => {
        const dec = decorations.find(d => d.id === hp.id);
        const isDisplayed = !!dec;
        return {
          id: hp.id,
          isDisplayed,
          positionX: isDisplayed ? Math.max(0, Math.round(dec.x)) : null,
          positionY: isDisplayed ? Math.max(0, Math.round(dec.y)) : null,
        };
      });

      // 4. 배치 레이아웃 일괄 저장 API 호출
      await updateGardenLayout({
        pots: potsPayload,
        harvestedPlants: harvestedPlantsPayload,
      });

      setEditMode(false);
    } catch (err) {
      // 서버에서 전달된 구체적인 에러 메시지가 있을 경우 우선 노출합니다.
      const errMsg = err.body?.message ?? '꾸미기 설정 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.';
      alert(errMsg);
    } finally {
      setLayoutSaving(false);
    }
  };

  return (
    <div style={{ padding: 32, width: '100%', maxWidth: 1600, margin: '0 auto', fontFamily: 'var(--font-body)' }}>

      {/* Hero with scene */}
      <Card padding={0} style={{
        overflow: 'hidden',
        background: '#fff',
        border: '0.5px solid var(--rule)',
        marginBottom: 24,
      }}>
        <div style={{ padding: '24px 28px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0, flex: '1 1 320px' }}>
            <div className="eyebrow" style={{ color: 'var(--moss-2)' }}>나의 정원</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em', marginTop: 4, whiteSpace: 'nowrap' }}>
              {user?.name ?? ''}님의 정원 · TIL <span style={{ color: 'var(--moss-2)' }}>{user?.totalTil ?? 0}</span>개
            </h2>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 6 }}>
              {potsLoading
                ? '화분을 불러오는 중이에요.'
                : `${pots.length}개의 화분이 자라고 있어요. 오늘 ${wateredCount}개의 화분에 물을 줬어요.`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
            <Btn variant="secondary" size="md" icon={Icon.plus} onClick={() => setShowCreatePot(true)}>새 화분</Btn>
            {editMode ? (
              <Btn variant="green" size="md" icon={Icon.check} onClick={handleSaveLayout} disabled={layoutSaving}>
                {layoutSaving ? '저장 중...' : '꾸미기 완료'}
              </Btn>
            ) : (
              <Btn variant="primary" size="md" onClick={() => setEditMode(true)}>🎨 정원 꾸미기</Btn>
            )}
          </div>
        </div>

        {/* Scene */}
        <div style={{ padding: '0 20px 20px' }}>
          <GardenScene
            pots={pots}
            theme={theme}
            layout={layout}
            editMode={editMode}
            onMovePot={movePot}
            onOpenPot={onOpenPot}
            decorations={decorations}
            onMoveDecoration={moveDecoration}
            onRemoveDecoration={removeDecoration}
            hiddenPots={hiddenPots}
            onHidePot={hidePot}
          />

          {/* Theme switcher / decorate panel — only in edit mode */}
          {editMode && (
            <div style={{
              marginTop: 14, padding: '16px 18px',
              border: '0.5px solid var(--rule)',
              borderRadius: 12,
              background: 'var(--paper-2)',
              display: 'grid',
              gridTemplateColumns: 'auto 1px 1fr 1px auto',
              gap: 22,
              alignItems: 'flex-start',
            }}>
              {/* Backgrounds */}
              <div>
                <div className="eyebrow" style={{ marginBottom: 10 }}>배경</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {GARDEN_THEMES.map(t => {
                    const active = t.id === themeId;
                    return (
                      <button key={t.id} onClick={() => setThemeId(t.id)} style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                        padding: 6, borderRadius: 8,
                        background: active ? 'var(--ink)' : '#fff',
                        color: active ? '#fff' : 'var(--ink-2)',
                        border: '0.5px solid ' + (active ? 'var(--ink)' : 'var(--rule-2)'),
                      }}>
                        <div style={{
                          width: 56, height: 36, borderRadius: 5,
                          background: t.sky,
                          position: 'relative', overflow: 'hidden',
                          border: '0.5px solid rgba(0,0,0,0.08)',
                        }}>
                          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 10, background: t.ground }} />
                          <div style={{ position: 'absolute', top: 5, right: 6, width: 7, height: 7, background: t.sunColor }} />
                        </div>
                        <div style={{ fontSize: 10.5, fontWeight: 500, fontFamily: 'var(--font-display)' }}>{t.emoji} {t.name}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--rule)' }} />

              {/* Inventory: harvested plants */}
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div className="eyebrow">수확한 식물 · 인벤토리 ({unplacedHarvestedPlants.length})</div>
                  {decorations.length > 0 && (
                    <button onClick={clearDecorations} style={{
                      fontSize: 11, color: 'var(--ink-3)',
                      fontFamily: 'var(--font-display)',
                    }}>장식 모두 제거 ({decorations.length})</button>
                  )}
                </div>
                {unplacedHarvestedPlants.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', padding: '12px 14px', background: '#fff', border: '0.5px dashed var(--rule-2)', borderRadius: 8 }}>
                    아직 수확한 식물이 없거나 정원에 모두 배치했어요. 만개 단계 식물을 수확하면 여기에 추가됩니다.
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {unplacedHarvestedPlants.map(h => {
                      const species = inferSpecies(h.name);
                      const monName = PIXEL_SPECIES[species]?.stages?.full?.name ?? h.name;
                      const isRare = species === 'moonlight';
                      return (
                        <button
                          key={h.id}
                          onClick={() => addDecoration(h)}
                          style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                            padding: '10px 10px 8px',
                            borderRadius: 10,
                            background: '#fff',
                            border: '0.5px solid ' + (isRare ? '#ccc9f0' : 'var(--rule-2)'),
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'transform 100ms ease',
                            minWidth: 92,
                          }}
                          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                          title={`${monName} 추가하기`}
                        >
                          {isRare && (
                            <span style={{
                              position: 'absolute', top: 4, left: 5,
                              fontSize: 9, color: '#534ab7',
                            }}>✦</span>
                          )}
                          <PixelPlant species={species} stage="full" size={44} />
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>{monName}</div>
                          {h.harvestedAt && (
                            <div style={{ fontSize: 9, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{h.harvestedAt.slice(5)}</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Hidden pots — bring back */}
                {Object.keys(hiddenPots).length > 0 && (
                  <>
                    <div className="eyebrow" style={{ marginTop: 14, marginBottom: 8 }}>숨긴 화분 · 다시 정원에 배치</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {pots.filter(p => hiddenPots[p.id]).map(p => {
                        const stage = p.stage ?? tilCountToStage(p.tilCount ?? 0);
                        return (
                          <button
                            key={p.id}
                            onClick={() => showPot(p.id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              padding: '6px 12px 6px 6px',
                              borderRadius: 10,
                              background: '#fff',
                              border: '0.5px dashed var(--rule-2)',
                              cursor: 'pointer',
                            }}
                          >
                            <PottedPlant species={p.species} stage={stage} size={34} potLevel={p.level} />
                            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
                              {p.emoji} {p.name}
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--moss-2)' }}>+ 배치</span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--rule)' }} />

              <button onClick={resetGarden} style={{
                padding: '8px 12px', fontSize: 12,
                color: 'var(--ink-3)', fontFamily: 'var(--font-display)',
                alignSelf: 'flex-start',
                whiteSpace: 'nowrap',
              }}>↺ 정원 초기화</button>
            </div>
          )}
        </div>
      </Card>

      {/* Pot grid */}
      <SectionHeader eyebrow="화분" title="키우는 화분" action={
        <div style={{ display: 'flex', gap: 6, fontSize: 12 }}>
          <Pill>전체 {pots.length}</Pill>
          <Pill tone="green">활동 중 {visiblePots.length}</Pill>
        </div>
      } />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
        {potsLoading && (
          <Card padding={24} style={{ minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
            화분 목록을 불러오는 중이에요.
          </Card>
        )}

        {!potsLoading && potsError && (
          <Card padding={24} style={{ minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b8536a', fontSize: 13, textAlign: 'center', lineHeight: 1.6 }}>
            {potsError}
          </Card>
        )}

        {!potsLoading && !potsError && pots.length === 0 && (
          <Card padding={24} style={{ minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)', fontSize: 13, textAlign: 'center', lineHeight: 1.6 }}>
            아직 생성된 화분이 없어요.<br />새 화분을 만들어 첫 씨앗을 심어보세요.
          </Card>
        )}

        {!potsLoading && !potsError && pots.map(p => <PotCard key={p.id} pot={p} onClick={() => onOpenPot(p.id)} />)}

        <Card padding={20} hoverable onClick={() => setShowCreatePot(true)} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 14, minHeight: 320,
          background: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(168, 213, 181, 0.08) 8px, rgba(168, 213, 181, 0.08) 16px)',
          border: '0.5px dashed var(--leaf)',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: '#fff', border: '0.5px dashed var(--leaf)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--moss)',
          }}>{Icon.plus}</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--ink)', fontSize: 14 }}>새 화분 만들기</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 4 }}>새로운 주제로 씨앗을 심어요</div>
          </div>
        </Card>
      </div>

      {!potsLoading && !potsError && attentionPot && (
        <div style={{
          marginTop: 28, padding: '16px 22px',
          background: '#fff', border: '0.5px solid var(--rule)',
          borderRadius: 12,
          display: 'flex', alignItems: 'center', gap: 18,
        }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--paper-2)', color: 'var(--moss-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🌱</div>
          <div style={{ flex: 1, fontSize: 13, color: 'var(--ink-2)' }}>
            <b style={{ color: 'var(--ink)' }}>{attentionPot.name} 화분</b>에 오늘의 TIL을 남기면 경험치가 쌓이고 식물이 자라요.
          </div>
          <Btn variant="secondary" size="sm" onClick={() => onOpenPot(attentionPot.id)}>화분으로 이동</Btn>
        </div>
      )}
      {showCreatePot && (
        <CreatePotModal
          userId={user?.userId}
          onClose={() => setShowCreatePot(false)}
          onCreated={handlePotCreated}
        />
      )}
    </div>
  );
}

function CreatePotModal({ userId, onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const titleLength = title.trim().length;
  const descriptionLength = description.length;
  const titleInvalid = titleLength === 0 || title.length > 100;
  const descriptionInvalid = descriptionLength > 255;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (title.trim().length === 0) {
      setError('화분 제목을 입력해 주세요.');
      return;
    }
    if (title.length > 100) {
      setError('화분 제목은 최대 100자까지 입력할 수 있어요.');
      return;
    }
    if (description.length > 255) {
      setError('화분 소개글은 최대 255자까지 입력할 수 있어요.');
      return;
    }

    setLoading(true);
    try {
      const created = await createPot({
        title: title.trim(),
        description: description.trim(),
      }, userId);
      onCreated(created);
      onClose();
    } catch (err) {
      setError(err?.body?.message ?? '화분을 만들지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 42, 71, 0.38)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      backdropFilter: 'blur(4px)',
    }} onClick={loading ? undefined : onClose}>
      <form onSubmit={handleSubmit} onClick={e => e.stopPropagation()} style={{
        width: 460,
        background: '#fff',
        borderRadius: 18,
        padding: '28px 28px 24px',
        boxShadow: 'var(--shadow-lg)',
        border: '0.5px solid var(--rule)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div className="eyebrow" style={{ color: 'var(--moss-2)' }}>New Pot</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginTop: 6 }}>
              새 화분 만들기
            </h2>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 6, lineHeight: 1.6 }}>
              새로운 학습 주제를 정하고 기본 씨앗을 심어요.
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={loading} style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            border: '0.5px solid var(--rule)',
            color: 'var(--ink-3)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            opacity: loading ? 0.5 : 1,
          }}>
            {Icon.close}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--ink-3)', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              <span>화분 제목</span>
              <span style={{ color: title.length > 100 ? '#b8536a' : 'var(--ink-3)' }}>{title.length}/100</span>
            </span>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="예: Spring 공부"
              disabled={loading}
              autoFocus
              style={{
                height: 42,
                borderRadius: 10,
                border: `0.5px solid ${titleInvalid && title.length > 0 ? '#f0c4cc' : 'var(--rule-2)'}`,
                background: 'var(--paper)',
                padding: '0 13px',
                outline: 'none',
                fontSize: 13.5,
              }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--ink-3)', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              <span>소개글</span>
              <span style={{ color: descriptionInvalid ? '#b8536a' : 'var(--ink-3)' }}>{descriptionLength}/255</span>
            </span>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="이 화분에 어떤 기록을 모을지 적어보세요."
              disabled={loading}
              rows={4}
              style={{
                minHeight: 96,
                resize: 'vertical',
                borderRadius: 10,
                border: `0.5px solid ${descriptionInvalid ? '#f0c4cc' : 'var(--rule-2)'}`,
                background: 'var(--paper)',
                padding: '12px 13px',
                outline: 'none',
                fontSize: 13.5,
                lineHeight: 1.6,
              }}
            />
          </label>
        </div>

        {error && (
          <div style={{
            marginTop: 16,
            padding: '10px 12px',
            borderRadius: 9,
            background: '#fff3f5',
            border: '0.5px solid #f7c1c1',
            fontSize: 12.5,
            color: '#b8536a',
            lineHeight: 1.5,
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <Btn type="button" variant="secondary" size="lg" style={{ flex: 1 }} onClick={onClose} disabled={loading}>
            취소
          </Btn>
          <Btn type="submit" variant="green" size="lg" style={{ flex: 1 }} disabled={loading || titleInvalid || descriptionInvalid}>
            {loading ? '만드는 중...' : '씨앗 심기'}
          </Btn>
        </div>
      </form>
    </div>
  );
}

// ============================
// Pot Detail Screen
// ============================
function PotDetailScreen({ potId, refreshKey = 0, onBack, onStartTil, onEditTil }) {
  const { user } = useUser();
  const fallbackPot = POTS.find(p => p.id === potId);
  const [showHarvest, setShowHarvest] = useState(false);
  const [showEditPot, setShowEditPot] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState(null);
  const [tils, setTils] = useState([]);
  const [tilsLoading, setTilsLoading] = useState(true);
  const [tilsError, setTilsError] = useState(null);
  const [tilTotalCount, setTilTotalCount] = useState(0);
  const [selectedTil, setSelectedTil] = useState(null);
  const [tilDetailLoading, setTilDetailLoading] = useState(false);
  const [tilSearchQuery, setTilSearchQuery] = useState('');
  const [selectedTilTag, setSelectedTilTag] = useState(null);

  useEffect(() => {
    if (!potId) return;
    let active = true;
    setDashboardLoading(true);
    setDashboardError(null);

    getGardenDashboard(potId)
      .then(data => {
        if (!active) return;
        setDashboard(data);
      })
      .catch(() => {
        if (!active) return;
        setDashboard(null);
        setDashboardError('화분 대시보드 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
      })
      .finally(() => {
        if (active) setDashboardLoading(false);
      });

    return () => {
      active = false;
    };
  }, [potId, user?.userId, refreshKey]);

  useEffect(() => {
    if (!potId) return;
    let active = true;
    setTilsLoading(true);
    setTilsError(null);

    getMyTils({ potId, page: 0, size: 20, sort: 'latest' })
      .then(page => {
        if (!active) return;
        const content = Array.isArray(page?.content) ? page.content : [];
        setTils(content.map(toTilListItem));
        setTilTotalCount(page?.totalElements ?? content.length);
      })
      .catch(() => {
        if (!active) return;
        setTils([]);
        setTilTotalCount(0);
        setTilsError('이 화분의 TIL 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
      })
      .finally(() => {
        if (active) setTilsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [potId, user?.userId, refreshKey]);

  useEffect(() => {
    if (!selectedTil) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedTil]);

  const pot = dashboard ? toDashboardPot(dashboard) : fallbackPot;

  if (dashboardLoading && !pot) {
    return (
      <div style={{ padding: 32, maxWidth: 960, margin: '0 auto' }}>
        <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ink-3)', fontSize: 12.5, marginBottom: 14 }}>
          <span style={{ transform: 'rotate(180deg)', display: 'inline-flex' }}>{Icon.arrow}</span> 정원으로
        </button>
        <Card padding={28} style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
          화분 대시보드를 불러오는 중이에요.
        </Card>
      </div>
    );
  }

  if (!pot) {
    return (
      <div style={{ padding: 32, maxWidth: 960, margin: '0 auto' }}>
        <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ink-3)', fontSize: 12.5, marginBottom: 14 }}>
          <span style={{ transform: 'rotate(180deg)', display: 'inline-flex' }}>{Icon.arrow}</span> 정원으로
        </button>
        <Card padding={28} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🌱</div>
          <div className="eyebrow" style={{ color: 'var(--moss-2)' }}>Garden Detail</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginTop: 6 }}>
            화분 정보를 불러오지 못했어요
          </h2>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 8, lineHeight: 1.6 }}>
            {dashboardError ?? '목록에서 화분을 다시 선택해 주세요.'}
          </div>
        </Card>
      </div>
    );
  }
  const stage = pot.stage ?? tilCountToStage(pot.tilCount ?? 0);
  const fallbackTils = fallbackPot && !dashboard ? TILS.filter(t => t.potId === potId) : [];
  const displayedTils = dashboard ? tils : fallbackTils;
  const displayedTilCount = dashboard ? tilTotalCount : displayedTils.length;
  const normalizedTilSearch = tilSearchQuery.trim().replace(/^#/, '').toLowerCase();
  const tilTagCounts = displayedTils.reduce((acc, til) => {
    (til.tags ?? []).forEach(tag => {
      const normalizedTag = String(tag).trim();
      if (!normalizedTag) return;
      acc.set(normalizedTag, (acc.get(normalizedTag) ?? 0) + 1);
    });
    return acc;
  }, new Map());
  const suggestedTilTags = Array.from(tilTagCounts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko-KR'))
    .slice(0, 8);
  const hasTilFilter = Boolean(normalizedTilSearch || selectedTilTag);
  const filteredTils = displayedTils.filter(til => {
    const tags = (til.tags ?? []).map(tag => String(tag));
    const matchesTag = !selectedTilTag || tags.includes(selectedTilTag);
    const searchTarget = [
      til.title,
      til.excerpt,
      til.content?.replace(/<[^>]*>/g, ' '),
      ...tags,
    ].filter(Boolean).join(' ').toLowerCase();
    const matchesSearch = !normalizedTilSearch || searchTarget.includes(normalizedTilSearch);
    return matchesTag && matchesSearch;
  });
  const visibleTils = hasTilFilter ? filteredTils : displayedTils;
  const speciesInfo = PIXEL_SPECIES[pot.species];
  const monName = speciesInfo?.stages[stage]?.name;
  const isRare = pot.species === 'moonlight';
  const potTier = getPotTier(pot.level);
  const detailSubText = dashboard
    ? `최근 물주기 ${formatDateTime(pot.lastWateredAt)} · 누적 ${pot.totalExp} EXP`
    : `${pot.createdAt} 생성 · 누적 ${Math.floor(pot.tilCount * 850)}자`;
  const potExperienceText = formatPotExperience(pot);
  const plantGrowthPercent = formatPlantGrowthPercent(pot);
  const plantStageStatus = getPlantStageStatus(stage);
  const harvestStatus = getHarvestStatus(pot.canHarvest);
  const handleStartTil = () => {
    onStartTil && onStartTil(pot.id);
  };
  const handleOpenTilDetail = async (til) => {
    setSelectedTil(til);
    if (!til.id) return;

    setTilDetailLoading(true);
    try {
      const detail = await getTil(til.id);
      setSelectedTil(current => ({
        ...current,
        ...toTilListItem(detail),
      }));
    } catch {
      setSelectedTil(til);
    } finally {
      setTilDetailLoading(false);
    }
  };
  const handleEditTil = (til) => {
    setSelectedTil(null);
    onEditTil && onEditTil({
      ...til,
      potId: til.potId ?? pot.id,
    });
  };
  const handleHarvested = async () => {
    try {
      const updatedDashboard = await getGardenDashboard(pot.id);
      setDashboard(updatedDashboard);
    } catch {
      setDashboardError('수확 후 화분 정보를 다시 불러오지 못했어요. 새로고침 후 확인해 주세요.');
    }
  };
  const handlePotUpdated = (updatedPot) => {
    setDashboard(current => current
      ? {
          ...current,
          title: updatedPot.title,
          description: updatedPot.description,
        }
      : current
    );
  };

  return (
    <div style={{ padding: 32, width: '100%', maxWidth: 1600, margin: '0 auto', fontFamily: 'var(--font-body)' }}>
      <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ink-3)', fontSize: 12.5, marginBottom: 14 }}>
        <span style={{ transform: 'rotate(180deg)', display: 'inline-flex' }}>{Icon.arrow}</span> 정원으로
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 380px) 1fr', gap: 24 }}>

        {/* Left — plant card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card padding={0} style={{ overflow: 'hidden' }}>
            <div style={{
              padding: '34px 24px 24px',
              background: isRare
                ? 'linear-gradient(180deg, #d8e2f0 0%, #f5f7f5 80%)'
                : 'linear-gradient(180deg, #d4ebdc 0%, #f5f7f5 80%)',
              textAlign: 'center',
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute', top: 14, left: 14, right: 14,
                display: 'flex', justifyContent: 'space-between',
              }}>
                <Pill tone={isRare ? 'navy' : 'green'}>{isRare && '✦ '}#{String(pot.id).padStart(3, '0')}</Pill>
                <Pill>{pot.tilCount} TIL</Pill>
              </div>
              <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center' }}>
                <PottedPlant species={pot.species} stage={stage} size={182} glow={isRare} potLevel={pot.level} />
              </div>
              {monName && (
                <div style={{ marginTop: 12, fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                  {monName}
                </div>
              )}
            </div>
            <div style={{ padding: '20px 24px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                  {pot.emoji} {pot.name}
                </div>
                <span style={{
                  padding: '2px 7px',
                  borderRadius: 999,
                  background: 'var(--paper-2)',
                  border: '0.5px solid var(--rule)',
                  color: 'var(--moss-2)',
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  lineHeight: 1.5,
                  whiteSpace: 'nowrap',
                }}>
                  Lv. {pot.level}
                </span>
                <Pill tone="green">{potTier.label}</Pill>
                <Pill tone={isRare ? 'navy' : 'default'}>{isRare ? '✦ 희귀종' : '일반종'}</Pill>
                {dashboard && (
                  <button
                    type="button"
                    onClick={() => setShowEditPot(true)}
                    style={{
                      marginLeft: 'auto',
                      padding: '4px 8px',
                      borderRadius: 8,
                      border: '0.5px solid var(--rule)',
                      color: 'var(--ink-3)',
                      fontSize: 11,
                      fontFamily: 'var(--font-display)',
                      background: '#fff',
                    }}
                  >
                    정보 수정
                  </button>
                )}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 10, lineHeight: 1.6 }}>{pot.intro}</div>
              <div style={{
                marginTop: 18,
                background: '#fff',
                border: '0.5px solid var(--rule)',
                borderRadius: 12,
                overflow: 'hidden',
              }}>
                {[
                  { label: '화분 경험치', value: potExperienceText, progress: pot.levelProgress },
                  { label: '식물 상태', value: `${plantStageStatus} · ${plantGrowthPercent}%`, tone: 'stage' },
                  { label: '수확 가능 여부', value: harvestStatus, tone: pot.canHarvest ? 'ready' : 'disabled' },
                ].map((item, index) => (
                  <div key={item.label} style={{
                    padding: '13px 14px',
                    borderTop: index === 0 ? 'none' : '0.5px solid var(--rule)',
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      gap: 14,
                    }}>
                      <span style={{
                        fontSize: 11,
                        color: 'var(--ink-3)',
                        fontFamily: 'var(--font-display)',
                        letterSpacing: '0.06em',
                      }}>
                        {item.label}
                      </span>
                      <span style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: item.tone === 'ready' || item.tone === 'stage' ? 'var(--moss-2)' : item.tone === 'disabled' ? 'var(--ink-3)' : 'var(--ink)',
                        fontFamily: 'var(--font-display)',
                        lineHeight: 1.45,
                        textAlign: 'right',
                      }}>
                        {item.value}
                      </span>
                    </div>
                    {typeof item.progress === 'number' && (
                      <>
                        <div style={{ marginTop: 8 }}>
                          <ProgressBar value={item.progress} height={8} />
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, fontSize: 11.5, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                {detailSubText}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
                <Btn variant="green" size="md" icon={Icon.drop} style={{ flex: 1 }} onClick={handleStartTil}>
                  TIL 작성하고 물주기
                </Btn>
                <Btn
                  variant={pot.canHarvest ? 'green' : 'secondary'}
                  size="md"
                  onClick={() => setShowHarvest(true)}
                  disabled={dashboard && !pot.canHarvest}
                  style={dashboard && !pot.canHarvest ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
                >
                  수확
                </Btn>
              </div>
            </div>
          </Card>

          {/* Evolution chain (mini) */}
          <Card padding={18}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>진화 계통</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              {['seed','sprout','leaf','bloom','full'].map(s => {
                const stages = ['seed','sprout','leaf','bloom','full'];
                const active = s === stage;
                const reached = stages.indexOf(s) <= stages.indexOf(stage);
                return (
                  <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 8,
                      background: active ? (isRare ? '#eef2fa' : '#e1f5ee') : (reached ? '#f3f6f3' : '#f7f9f7'),
                      border: active ? `1.5px solid ${isRare ? '#185FA5' : '#0F6E56'}` : '0.5px solid var(--rule)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: reached ? 1 : 0.4,
                    }}>
                      <PixelPlant species={pot.species} stage={s} size={36} locked={!reached} />
                    </div>
                    <div style={{ fontSize: 10, color: active ? (isRare ? '#185FA5' : 'var(--moss-2)') : 'var(--ink-3)', fontWeight: active ? 600 : 400, fontFamily: 'var(--font-display)' }}>
                      {speciesInfo?.stages[s]?.name || STAGE_META[s].label}
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{STAGE_META[s].min}+</div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right — TIL list */}
        <div>
          <SectionHeader eyebrow="이 화분의 기록" title={`TIL ${displayedTilCount}개`} action={
            <div style={{ position: 'relative', width: 300, maxWidth: '42vw' }}>
              <span style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--ink-3)',
                display: 'inline-flex',
                pointerEvents: 'none',
              }}>{Icon.search}</span>
              <input
                value={tilSearchQuery}
                onChange={e => setTilSearchQuery(e.target.value)}
                placeholder="제목, 본문, 태그 검색"
                aria-label="TIL 검색"
                style={{
                  width: '100%',
                  height: 40,
                  borderRadius: 10,
                  border: '0.5px solid var(--rule-2)',
                  background: '#fff',
                  padding: tilSearchQuery ? '0 38px 0 34px' : '0 12px 0 34px',
                  fontSize: 12.5,
                  color: 'var(--ink)',
                  outline: 'none',
                  fontFamily: 'var(--font-body)',
                }}
              />
              {tilSearchQuery && (
                <button
                  type="button"
                  onClick={() => setTilSearchQuery('')}
                  aria-label="검색어 지우기"
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 24,
                    height: 24,
                    borderRadius: 8,
                    color: 'var(--ink-3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {Icon.close}
                </button>
              )}
            </div>
          } />
          {(suggestedTilTags.length > 0 || hasTilFilter) && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
              margin: '-4px 0 14px',
            }}>
              <span className="eyebrow" style={{ marginRight: 2 }}>태그</span>
              {suggestedTilTags.map(([tag, count]) => {
                const active = selectedTilTag === tag;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTilTag(active ? null : tag)}
                    style={{
                      padding: '5px 9px',
                      borderRadius: 999,
                      border: `0.5px solid ${active ? 'var(--moss)' : 'var(--rule-2)'}`,
                      background: active ? '#ebf5ef' : '#fff',
                      color: active ? 'var(--moss-2)' : 'var(--ink-2)',
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                      fontWeight: active ? 700 : 500,
                    }}
                  >
                    #{tag} {count}
                  </button>
                );
              })}
              {hasTilFilter && (
                <>
                  <span style={{ fontSize: 11.5, color: 'var(--ink-3)', marginLeft: 2 }}>
                    {visibleTils.length}개 표시
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setTilSearchQuery('');
                      setSelectedTilTag(null);
                    }}
                    style={{
                      fontSize: 11.5,
                      color: 'var(--moss-2)',
                      fontWeight: 600,
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    초기화
                  </button>
                </>
              )}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {dashboard && tilsLoading && (
              <Card padding={22} style={{ color: 'var(--ink-3)', fontSize: 13, lineHeight: 1.6 }}>
                이 화분의 TIL 목록을 불러오는 중이에요.
              </Card>
            )}
            {dashboard && !tilsLoading && tilsError && (
              <Card padding={22} style={{ color: '#b8536a', fontSize: 13, lineHeight: 1.6 }}>
                {tilsError}
              </Card>
            )}
            {dashboard && !tilsLoading && !tilsError && displayedTils.length === 0 && (
              <Card padding={22} style={{ color: 'var(--ink-3)', fontSize: 13, lineHeight: 1.6 }}>
                아직 이 화분에 작성된 TIL이 없어요.<br />
                TIL을 작성하면 이곳에 최신순으로 표시됩니다.
              </Card>
            )}
            {dashboard && !tilsLoading && !tilsError && displayedTils.length > 0 && visibleTils.length === 0 && (
              <Card padding={22} style={{ color: 'var(--ink-3)', fontSize: 13, lineHeight: 1.6 }}>
                검색 결과가 없어요.<br />
                검색어를 바꾸거나 선택한 태그를 해제해 보세요.
              </Card>
            )}
            {!tilsLoading && visibleTils.map(t => (
              <Card
                key={t.id}
                padding={20}
                hoverable
                onClick={() => handleOpenTilDetail(t)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
                      {t.date} · {t.chars}자
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 16,
                      fontWeight: 600,
                      color: 'var(--ink)',
                      lineHeight: 1.45,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {t.title}
                    </div>
                    <div style={{
                      fontSize: 13,
                      color: 'var(--ink-2)',
                      lineHeight: 1.6,
                      marginTop: 6,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {t.excerpt}
                    </div>
                    <div style={{ display: 'flex', gap: 5, marginTop: 10, flexWrap: 'wrap' }}>
                      {t.tags.map(tag => (
                        <span key={tag} style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 999, background: 'var(--paper-2)', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ width: 56, height: 56, borderRadius: 10, background: isRare ? '#eef2fa' : 'var(--paper-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <PottedPlant species={pot.species} stage={stage} size={44} potLevel={pot.level} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {showHarvest && (
        <HarvestModal
          pot={pot}
          onClose={() => setShowHarvest(false)}
          onHarvested={handleHarvested}
        />
      )}
      {selectedTil && (
        <TilDetailModal
          til={selectedTil}
          loading={tilDetailLoading}
          onClose={() => setSelectedTil(null)}
          onEdit={() => handleEditTil(selectedTil)}
        />
      )}
      {showEditPot && (
        <EditPotModal
          pot={pot}
          onClose={() => setShowEditPot(false)}
          onUpdated={handlePotUpdated}
        />
      )}
    </div>
  );
}

function TilDetailModal({ til, loading, onClose, onEdit }) {
  const contentHtml = til.content?.trim();

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 42, 71, 0.38)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 60,
      backdropFilter: 'blur(4px)',
      padding: 24,
      overscrollBehavior: 'contain',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 'min(760px, 100%)',
        height: 'min(720px, calc(100vh - 48px))',
        background: '#fff',
        borderRadius: 18,
        border: '0.5px solid var(--rule)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        overscrollBehavior: 'contain',
      }}>
        <div style={{
          padding: '24px 28px 18px',
          borderBottom: '0.5px solid var(--rule)',
          background: 'linear-gradient(180deg, #fff 0%, var(--paper) 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18 }}>
            <div style={{ minWidth: 0 }}>
              <div className="eyebrow" style={{ color: 'var(--moss-2)' }}>TIL Detail</div>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 24,
                fontWeight: 700,
                color: 'var(--ink)',
                marginTop: 7,
                lineHeight: 1.3,
                wordBreak: 'keep-all',
              }}>
                {til.title}
              </h2>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
                marginTop: 10,
                color: 'var(--ink-3)',
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
              }}>
                <span>{formatTilDateTime(til.publishedAt ?? til.createdAt)}</span>
                <span>·</span>
                <span>{til.chars}자</span>
                {til.potName && (
                  <>
                    <span>·</span>
                    <span>{til.potName} 화분</span>
                  </>
                )}
              </div>
            </div>
            <button type="button" onClick={onClose} style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              border: '0.5px solid var(--rule)',
              color: 'var(--ink-3)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              background: '#fff',
            }}>
              {Icon.close}
            </button>
          </div>

          {til.tags.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 14 }}>
              {til.tags.map(tag => (
                <span key={tag} style={{
                  fontSize: 11,
                  padding: '3px 9px',
                  borderRadius: 999,
                  background: 'var(--paper-2)',
                  color: 'var(--ink-3)',
                  fontFamily: 'var(--font-mono)',
                }}>
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="scrollbar" style={{
          flex: 1,
          overflow: 'auto',
          overscrollBehavior: 'contain',
          padding: '26px 30px 30px',
        }}>
          {loading ? (
            <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>
              TIL 상세 내용을 불러오는 중이에요.
            </div>
          ) : contentHtml ? (
            <div
              className="til-prose"
              style={{ fontSize: 14.5, lineHeight: 1.8, color: 'var(--ink)' }}
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />
          ) : (
            <div style={{ color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.7 }}>
              {til.excerpt}
            </div>
          )}
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 10,
          padding: '16px 22px',
          borderTop: '0.5px solid var(--rule)',
          background: 'var(--paper)',
        }}>
          <Btn type="button" variant="secondary" size="md" onClick={onClose}>
            닫기
          </Btn>
          <Btn type="button" variant="green" size="md" icon={Icon.edit} onClick={onEdit}>
            수정하기
          </Btn>
        </div>
      </div>
    </div>
  );
}

function EditPotModal({ pot, onClose, onUpdated }) {
  const [title, setTitle] = useState(pot.name ?? '');
  const [description, setDescription] = useState(pot.intro === '아직 소개글이 없는 화분이에요.' ? '' : (pot.intro ?? ''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const titleInvalid = title.trim().length === 0 || title.length > 100;
  const descriptionInvalid = description.length > 255;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (title.trim().length === 0) {
      setError('화분 제목을 입력해 주세요.');
      return;
    }
    if (title.length > 100) {
      setError('화분 제목은 최대 100자까지 입력할 수 있어요.');
      return;
    }
    if (description.length > 255) {
      setError('화분 소개글은 최대 255자까지 입력할 수 있어요.');
      return;
    }

    setLoading(true);
    try {
      const updated = await updatePot(pot.id, {
        title: title.trim(),
        description: description.trim(),
      });
      onUpdated(updated);
      onClose();
    } catch (err) {
      setError(
        err?.status === 401
          ? '로그인 인증이 만료되었어요. 다시 로그인한 뒤 수정해 주세요.'
          : err?.body?.message ?? '화분 정보를 수정하지 못했어요. 잠시 후 다시 시도해 주세요.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 42, 71, 0.38)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      backdropFilter: 'blur(4px)',
    }} onClick={loading ? undefined : onClose}>
      <form onSubmit={handleSubmit} onClick={e => e.stopPropagation()} style={{
        width: 460,
        background: '#fff',
        borderRadius: 18,
        padding: '28px 28px 24px',
        boxShadow: 'var(--shadow-lg)',
        border: '0.5px solid var(--rule)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div className="eyebrow" style={{ color: 'var(--moss-2)' }}>Edit Pot</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginTop: 6 }}>
              화분 정보 수정
            </h2>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 6, lineHeight: 1.6 }}>
              화분의 학습 주제와 소개글을 다듬을 수 있어요.
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={loading} style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            border: '0.5px solid var(--rule)',
            color: 'var(--ink-3)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            opacity: loading ? 0.5 : 1,
          }}>
            {Icon.close}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--ink-3)', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              <span>화분 제목</span>
              <span style={{ color: title.length > 100 ? '#b8536a' : 'var(--ink-3)' }}>{title.length}/100</span>
            </span>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              disabled={loading}
              autoFocus
              style={{
                height: 42,
                borderRadius: 10,
                border: `0.5px solid ${titleInvalid && title.length > 0 ? '#f0c4cc' : 'var(--rule-2)'}`,
                background: 'var(--paper)',
                padding: '0 13px',
                outline: 'none',
                fontSize: 13.5,
              }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--ink-3)', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              <span>소개글</span>
              <span style={{ color: descriptionInvalid ? '#b8536a' : 'var(--ink-3)' }}>{description.length}/255</span>
            </span>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              disabled={loading}
              rows={4}
              style={{
                minHeight: 96,
                resize: 'vertical',
                borderRadius: 10,
                border: `0.5px solid ${descriptionInvalid ? '#f0c4cc' : 'var(--rule-2)'}`,
                background: 'var(--paper)',
                padding: '12px 13px',
                outline: 'none',
                fontSize: 13.5,
                lineHeight: 1.6,
              }}
            />
          </label>
        </div>

        {error && (
          <div style={{
            marginTop: 16,
            padding: '10px 12px',
            borderRadius: 9,
            background: '#fff3f5',
            border: '0.5px solid #f7c1c1',
            fontSize: 12.5,
            color: '#b8536a',
            lineHeight: 1.5,
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <Btn type="button" variant="secondary" size="lg" style={{ flex: 1 }} onClick={onClose} disabled={loading}>
            취소
          </Btn>
          <Btn type="submit" variant="green" size="lg" style={{ flex: 1 }} disabled={loading || titleInvalid || descriptionInvalid}>
            {loading ? '저장 중...' : '저장'}
          </Btn>
        </div>
      </form>
    </div>
  );
}

function HarvestModal({ pot, onClose, onHarvested }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleHarvest = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await harvestPot(pot.id);
      await onHarvested?.(data);
      setResult(data);
    } catch (err) {
      if (err.status === 400) {
        setError('아직 수확할 수 없어요. 식물이 만개(🌸) 단계에 도달해야 합니다.');
      } else {
        setError('수확에 실패했어요. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15, 42, 71, 0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
      backdropFilter: 'blur(4px)',
    }} onClick={result ? undefined : onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 480, background: '#fff', borderRadius: 18,
        padding: '32px 28px', boxShadow: 'var(--shadow-lg)',
        textAlign: 'center',
      }}>

        {result ? (
          /* 수확 완료 결과 화면 */
          <>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <div className="eyebrow" style={{ color: 'var(--moss-2)' }}>수확 완료</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginTop: 6 }}>
              {result.harvestedPlantName} 수확!
            </h2>
            <div style={{
              margin: '20px 0',
              padding: '16px',
              background: 'var(--paper-2)',
              borderRadius: 12,
              display: 'flex', flexDirection: 'column', gap: 10,
              fontSize: 13, color: 'var(--ink-2)', textAlign: 'left',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>수확한 식물</span>
                <b style={{ color: 'var(--ink)' }}>
                  {result.harvestedPlantName}
                  <span style={{ fontSize: 11, marginLeft: 6, color: result.harvestedRarity === '희귀' ? '#534ab7' : 'var(--moss-2)' }}>
                    {result.harvestedRarity === '희귀' ? '✦ 희귀종' : '일반종'}
                  </span>
                </b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>수확 레벨</span>
                <b style={{ color: 'var(--ink)' }}>Lv.{result.harvestedLevel}</b>
              </div>
              <div style={{ borderTop: '0.5px solid var(--rule)', paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                <span>새로 심어진 씨앗</span>
                <b style={{ color: result.nextRarity === '희귀' ? '#534ab7' : 'var(--moss-2)' }}>
                  {result.nextRarity === '희귀' ? '✦ ' : ''}{result.nextPlantName}
                </b>
              </div>
            </div>
            <Btn variant="green" size="lg" style={{ width: '100%' }} onClick={onClose}>
              확인
            </Btn>
          </>
        ) : (
          /* 수확 확인 화면 */
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
              <PottedPlant species={pot.species} stage="full" size={142} glow={pot.species === 'moonlight'} potLevel={pot.level} />
            </div>
            <div className="eyebrow" style={{ color: 'var(--moss-2)' }}>수확하기</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginTop: 6 }}>
              {pot.emoji} {pot.name}의 식물을 수확할까요?
            </h2>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 8, lineHeight: 1.6 }}>
              수확하면 식물 도감에 기록되고, 새로운 씨앗이 심어져요.<br />
              다음 씨앗은 일반(90%) 또는 희귀(10%) 중 랜덤으로 배정됩니다.
            </div>
            <div style={{
              margin: '20px 0', padding: '12px 16px',
              background: 'var(--paper-2)', borderRadius: 10,
              fontSize: 11.5, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)',
              display: 'flex', justifyContent: 'space-around',
            }}>
              <span>화분 Lv.<b style={{ color: 'var(--ink)' }}>{pot.level}</b></span>
              <span>총 <b style={{ color: 'var(--ink)' }}>{pot.tilCount} TIL</b></span>
            </div>
            {error && (
              <div style={{
                marginBottom: 14, padding: '10px 14px', borderRadius: 8,
                background: '#fff3f5', border: '0.5px solid #f7c1c1',
                fontSize: 12.5, color: '#b8536a',
              }}>
                {error}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <Btn variant="secondary" size="lg" style={{ flex: 1 }} onClick={onClose} disabled={loading}>
                취소
              </Btn>
              <Btn variant="green" size="lg" style={{ flex: 1 }} onClick={handleHarvest} disabled={loading}>
                {loading ? '수확 중...' : '새 씨앗 심기 🌱'}
              </Btn>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export { GardenScreen, PotDetailScreen, GardenScene };
