import { useState, useEffect, useRef } from 'react';
import { POTS, GARDEN_THEMES, DEFAULT_GARDEN_LAYOUT, DEX, TILS } from './data.jsx';
import { harvestPot } from './api/garden.js';
import { createPot, getGardenDashboard, getPots } from './api/pot.js';
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

function buildGardenLayout(pots) {
  return pots.reduce((layout, pot, index) => {
    const slot = POT_LAYOUT_SLOTS[index % POT_LAYOUT_SLOTS.length];
    const row = Math.floor(index / POT_LAYOUT_SLOTS.length);
    layout[pot.id] = {
      x: Math.min(92, slot.x + row * 6),
      y: Math.min(94, slot.y + row * 3),
    };
    return layout;
  }, {});
}

function getLayoutSlot(index) {
  const slot = POT_LAYOUT_SLOTS[index % POT_LAYOUT_SLOTS.length];
  const row = Math.floor(index / POT_LAYOUT_SLOTS.length);
  return {
    x: Math.min(92, slot.x + row * 6),
    y: Math.min(94, slot.y + row * 3),
  };
}

function PottedPlant({ species, stage, size = 64, locked = false, glow = false }) {
  const potWidth = size * 0.5;
  const potHeight = size * 0.26;
  const rimHeight = size * 0.09;

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
        filter: 'drop-shadow(0 3px 2px rgba(26, 58, 92, 0.16))',
      }}>
        <div style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          width: potWidth * 1.18,
          height: rimHeight,
          transform: 'translateX(-50%)',
          background: 'linear-gradient(180deg, #d2ae86 0%, #a87552 100%)',
          border: '0.5px solid rgba(92, 48, 16, 0.22)',
          borderRadius: Math.max(4, size * 0.05),
        }} />
        <div style={{
          position: 'absolute',
          left: '50%',
          top: rimHeight * 0.56,
          width: potWidth * 0.88,
          height: potHeight - rimHeight * 0.2,
          transform: 'translateX(-50%)',
          background: 'linear-gradient(180deg, #c89468 0%, #9f6545 100%)',
          border: '0.5px solid rgba(92, 48, 16, 0.22)',
          clipPath: 'polygon(8% 0, 92% 0, 76% 100%, 24% 100%)',
        }} />
        <div style={{
          position: 'absolute',
          left: '50%',
          top: rimHeight * 0.9,
          width: potWidth * 0.48,
          height: Math.max(2, size * 0.025),
          transform: 'translateX(-50%)',
          background: 'rgba(92, 48, 16, 0.28)',
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
          <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>Lv.{pot.level} · {stageMeta.label}</div>
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
          <PottedPlant species={pot.species} stage={stage} size={112} />
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
              transform: 'translate(-50%, -100%)',
              cursor: editMode ? (isDragging ? 'grabbing' : 'grab') : 'default',
              opacity: editMode ? 1 : 0.95,
              touchAction: 'none',
              filter: isDragging ? 'drop-shadow(0 6px 10px rgba(0,0,0,0.3))' : 'drop-shadow(0 2px 3px rgba(0,0,0,0.2))',
              transition: isDragging ? 'none' : 'left 160ms ease, top 160ms ease',
              zIndex: isDragging ? 10 : 1,
            }}
          >
            <div
              onPointerDown={editMode ? (e) => startDrag('dec', d.id, e, pos) : undefined}
            >
              <PixelPlant species={d.species} stage="full" size={56} glow={d.species === 'moonlight'} />
            </div>
            {editMode && (
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveDecoration && onRemoveDecoration(d.id);
                }}
                style={{
                  position: 'absolute',
                  top: -8, right: -8,
                  width: 20, height: 20, borderRadius: '50%',
                  background: '#fff',
                  border: '1px solid var(--rule-2)',
                  color: '#b8536a',
                  fontSize: 12, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  lineHeight: 1,
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
              transform: 'translate(-50%, -100%)',
              cursor: editMode ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              transition: isDragging ? 'none' : 'left 200ms ease, top 200ms ease',
              touchAction: 'none',
              zIndex: isDragging ? 10 : 2,
              filter: isDragging ? 'drop-shadow(0 6px 10px rgba(0,0,0,0.25))' : 'none',
            }}
          >
            <div
              onPointerDown={editMode ? (e) => startDrag('pot', pot.id, e, pos) : undefined}
              onClick={editMode ? undefined : () => onOpenPot && onOpenPot(pot.id)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
            >
              {/* shadow */}
              <div style={{
                position: 'absolute', bottom: -2,
                width: size * 0.7, height: 6,
                background: 'radial-gradient(ellipse, rgba(0,0,0,0.18), transparent 70%)',
                filter: 'blur(2px)',
              }} />
              <PottedPlant species={pot.species} stage={stage} size={size} glow={pot.species === 'moonlight'} />
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
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onHidePot && onHidePot(pot.id);
                }}
                style={{
                  position: 'absolute',
                  top: -8, right: -8,
                  width: 20, height: 20, borderRadius: '50%',
                  background: '#fff',
                  border: '1px solid var(--rule-2)',
                  color: '#b8536a',
                  fontSize: 12, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  lineHeight: 1,
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

  const theme = GARDEN_THEMES.find(t => t.id === themeId);
  const movePot = (id, x, y) => setLayout(L => ({ ...L, [id]: { x, y } }));
  const moveDecoration = (id, x, y) => setDecorations(D => D.map(d => d.id === id ? { ...d, x, y } : d));
  const addDecoration = (species, sourceName) => {
    setDecorations(D => [...D, { id: `d${Date.now()}-${Math.random().toString(36).slice(2,6)}`, species, name: sourceName, x: 50, y: 55 }]);
  };
  const removeDecoration = (id) => setDecorations(D => D.filter(d => d.id !== id));
  const clearDecorations = () => setDecorations([]);
  const hidePot = (id) => setHiddenPots(H => ({ ...H, [id]: true }));
  const showPot = (id) => setHiddenPots(H => { const N = { ...H }; delete N[id]; return N; });
  const resetGarden = () => { setLayout(DEFAULT_GARDEN_LAYOUT); setHiddenPots({}); setDecorations([]); };

  // Harvested plants from DEX — actual list user has collected
  const harvestedPlants = DEX.filter(d => d.state === 'harvested');
  const visiblePots = pots.filter(p => !hiddenPots[p.id]);
  const wateredCount = pots.filter(p => p.waterToday).length;
  const attentionPot = pots.find(p => !p.waterToday) ?? pots[0] ?? null;
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

  useEffect(() => {
    let active = true;
    setPotsLoading(true);
    setPotsError(null);

    getPots(user?.userId)
      .then(data => {
        if (!active) return;
        const list = Array.isArray(data) ? data.map(toGardenPot) : [];
        setPots(list);
        setLayout(current => ({
          ...buildGardenLayout(list),
          ...current,
        }));
      })
      .catch(() => {
        if (!active) return;
        setPots([]);
        setPotsError('화분 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
      })
      .finally(() => {
        if (active) setPotsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user?.userId]);

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
              <Btn variant="green" size="md" icon={Icon.check} onClick={() => setEditMode(false)}>꾸미기 완료</Btn>
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
                  <div className="eyebrow">수확한 식물 · 인벤토리 ({harvestedPlants.length})</div>
                  {decorations.length > 0 && (
                    <button onClick={clearDecorations} style={{
                      fontSize: 11, color: 'var(--ink-3)',
                      fontFamily: 'var(--font-display)',
                    }}>장식 모두 제거 ({decorations.length})</button>
                  )}
                </div>
                {harvestedPlants.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', padding: '12px 14px', background: '#fff', border: '0.5px dashed var(--rule-2)', borderRadius: 8 }}>
                    아직 수확한 식물이 없어요. 만개 단계까지 키운 뒤 수확하면 여기로 들어와요.
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {harvestedPlants.map(h => {
                      const monName = PIXEL_SPECIES[h.species]?.stages?.full?.name;
                      const isRare = h.rarity === 'rare';
                      const placedCount = decorations.filter(d => d.species === h.species).length;
                      return (
                        <button
                          key={h.no}
                          onClick={() => addDecoration(h.species, monName)}
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
                          {placedCount > 0 && (
                            <span style={{
                              position: 'absolute', top: 4, right: 5,
                              padding: '0 5px', borderRadius: 8,
                              fontSize: 9, fontFamily: 'var(--font-mono)',
                              background: 'var(--moss)', color: '#fff',
                              minWidth: 14, textAlign: 'center', lineHeight: '12px',
                            }}>{placedCount}</span>
                          )}
                          <PixelPlant species={h.species} stage="full" size={44} />
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>{monName}</div>
                          <div style={{ fontSize: 9, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{h.pot?.emoji} {h.harvestedAt?.slice(5)}</div>
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
                            <PottedPlant species={p.species} stage={stage} size={34} />
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
function PotDetailScreen({ potId, onBack }) {
  const { user } = useUser();
  const fallbackPot = POTS.find(p => p.id === potId);
  const [showHarvest, setShowHarvest] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState(null);

  useEffect(() => {
    if (!potId) return;
    let active = true;
    setDashboardLoading(true);
    setDashboardError(null);

    getGardenDashboard(potId, user?.userId)
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
  }, [potId, user?.userId]);

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
  const tils = fallbackPot ? TILS.filter(t => t.potId === potId) : [];
  const speciesInfo = PIXEL_SPECIES[pot.species];
  const monName = speciesInfo?.stages[stage]?.name;
  const isRare = pot.species === 'moonlight';
  const detailSubText = dashboard
    ? `최근 물주기 ${formatDateTime(pot.lastWateredAt)} · 누적 ${pot.totalExp} EXP`
    : `${pot.createdAt} 생성 · 누적 ${Math.floor(pot.tilCount * 850)}자`;
  const potExperienceText = formatPotExperience(pot);
  const plantGrowthPercent = formatPlantGrowthPercent(pot);
  const plantStageStatus = getPlantStageStatus(stage);
  const harvestStatus = getHarvestStatus(pot.canHarvest);

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
                <PottedPlant species={pot.species} stage={stage} size={182} glow={isRare} />
              </div>
              {monName && (
                <div style={{ marginTop: 12, fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                  {monName}
                </div>
              )}
            </div>
            <div style={{ padding: '20px 24px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                <Pill tone={isRare ? 'navy' : 'default'}>{isRare ? '✦ 희귀종' : '일반종'}</Pill>
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
                <Btn variant={pot.waterToday ? 'secondary' : 'green'} size="md" icon={Icon.drop} style={{ flex: 1 }}>
                  {pot.waterToday ? '오늘 물 줬어요' : 'TIL 작성하면 물주기'}
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
          <SectionHeader eyebrow="이 화분의 기록" title={`TIL ${tils.length}개`} action={
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="secondary" size="sm">최신순 ↓</Btn>
              <Btn variant="primary" size="sm" icon={Icon.plus}>TIL 작성</Btn>
            </div>
          } />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {dashboard && tils.length === 0 && (
              <Card padding={22} style={{ color: 'var(--ink-3)', fontSize: 13, lineHeight: 1.6 }}>
                이 화분의 TIL 목록은 아직 별도 API가 연결되지 않았어요.<br />
                현재 대시보드 API로는 총 TIL 개수와 성장 정보까지만 표시합니다.
              </Card>
            )}
            {tils.map(t => (
              <Card key={t.id} padding={20} hoverable>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
                      {t.date} · {t.chars}자
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
                      {t.title}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6, marginTop: 6 }}>{t.excerpt}</div>
                    <div style={{ display: 'flex', gap: 5, marginTop: 10, flexWrap: 'wrap' }}>
                      {t.tags.map(tag => (
                        <span key={tag} style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 999, background: 'var(--paper-2)', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ width: 56, height: 56, borderRadius: 10, background: isRare ? '#eef2fa' : 'var(--paper-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <PottedPlant species={pot.species} stage={stage} size={44} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {showHarvest && <HarvestModal pot={pot} onClose={() => setShowHarvest(false)} />}
    </div>
  );
}

const HARVEST_SPECIES_MAP = { '기본 씨앗': 'seed', '달빛씨앗': 'moonlight', '버섯씨앗': 'mushroom' };

function HarvestResult({ result, onClose }) {
  const nextSpecies = HARVEST_SPECIES_MAP[result.nextPlantName] ?? 'seed';
  const isNextRare  = result.nextRarity === '희귀';
  return (
    <>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
      <div className="eyebrow" style={{ color: 'var(--moss-2)' }}>수확 완료</div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginTop: 6 }}>
        {result.harvestedPlantName} 수확!
      </h2>
      <div style={{
        margin: '20px 0', padding: '16px', background: 'var(--paper-2)',
        borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 10,
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
        <div style={{ borderTop: '0.5px solid var(--rule)', paddingTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>새로 심어진 씨앗</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PottedPlant species={nextSpecies} stage="seed" size={36} glow={isNextRare} />
            <b style={{ color: isNextRare ? '#534ab7' : 'var(--moss-2)' }}>
              {isNextRare ? '✦ ' : ''}{result.nextPlantName}
            </b>
          </div>
        </div>
      </div>
      <Btn variant="green" size="lg" style={{ width: '100%' }} onClick={onClose}>확인</Btn>
    </>
  );
}

function HarvestModal({ pot, onClose }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleHarvest = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await harvestPot(pot.id);
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
          <HarvestResult result={result} onClose={onClose} />
        ) : (
          /* 수확 확인 화면 */
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
              <PottedPlant species={pot.species} stage="full" size={142} glow={pot.species === 'moonlight'} />
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
