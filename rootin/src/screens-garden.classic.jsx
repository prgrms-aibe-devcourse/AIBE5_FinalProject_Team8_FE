import { useState, useEffect, useRef, useCallback } from 'react';
import { POTS, GARDEN_THEMES, DEFAULT_GARDEN_LAYOUT, TILS } from './data.jsx';
import { harvestPot, getGardenState, updateGardenTheme, updateGardenLayout } from './api/garden.js';
import { createPot, deletePot, getGardenDashboard, getPots, updatePot } from './api/pot.js';
import { getMyTils, getTil, deleteTil } from './api/til.js';
import { useUser } from './context/UserContext.jsx';
import { Icon, Pill, Btn, Card, SectionHeader, ProgressBar } from './ui.jsx';
import { PixelPlant, PIXEL_SPECIES } from './pixel-plants.jsx';
import { tilCountToStage, STAGE_META } from './plants.jsx';
import { inferSpecies } from './utils/plant.js';
import { POT_TITLE_MAX_LENGTH, POT_DESCRIPTION_MAX_LENGTH, EMPTY_POT_INTRO, POT_TITLE_PREVIEW_STYLE, POT_DESCRIPTION_PREVIEW_STYLE, getPotTier, formatPotExperience, formatPlantGrowthPercent, getPlantStageStatus, getHarvestStatus, toGardenPot, toDashboardPot, formatDateTime, getKstDateString, getMsUntilKstMidnight, formatTilDateTime, toTilListItem, getLayoutSlot, findNearestVisiblePotId, getPottedPlantAlignment } from './screens-garden.logic.js';

function PottedPlant({ species, stage, size = 64, locked = false, glow = false, potLevel = 1 }) {
  const tier = getPotTier(potLevel);
  const alignment = getPottedPlantAlignment(stage);
  const potWidth = size * 0.5;
  const potHeight = size * 0.26;
  const rimHeight = size * 0.09;
  const pixel = Math.max(2, size * 0.025);
  const plantSize = size * alignment.scale;
  const potTopFromBottom = size * 0.02 + potHeight;

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
        left: '50%',
        bottom: potTopFromBottom,
        width: plantSize,
        height: plantSize,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: 'translateX(-50%)',
        transformOrigin: '50% 100%',
        zIndex: 3,
      }}>
        <PixelPlant species={species} stage={stage} size={plantSize} locked={locked} glow={glow} />
      </div>
      <div style={{
        position: 'absolute',
        left: '50%',
        bottom: size * 0.02,
        width: potWidth,
        height: potHeight,
        transform: 'translateX(-50%)',
        zIndex: 1,
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>Lv.{pot.level} · {potTier.shortLabel} 화분 · {stageMeta.label}</div>
          <div
            title={`${pot.emoji} ${pot.name}`}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 17,
              fontWeight: 600,
              letterSpacing: '-0.03em',
              color: 'var(--ink)',
              marginTop: 4,
              ...POT_TITLE_PREVIEW_STYLE,
            }}
          >
            {pot.emoji} {pot.name}
          </div>
        </div>
        {pot.waterToday ? (
          <Pill tone="green"><span style={{ display: 'inline-flex', marginRight: 2 }}>{Icon.drop}</span>물주기 완료</Pill>
        ) : (
          <Pill tone="warn">물주기 전</Pill>
        )}
      </div>

      <div style={{ height: 132, position: 'relative' }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          background: rare
            ? 'radial-gradient(ellipse at center bottom, rgba(168, 197, 235, 0.5), transparent 70%)'
            : 'radial-gradient(ellipse at center bottom, rgba(168, 213, 181, 0.4), transparent 70%)',
          borderRadius: 10,
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 18, height: 1, background: 'linear-gradient(90deg, transparent, var(--leaf), transparent)' }} />
        </div>
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          paddingBottom: 6,
        }}>
          <PottedPlant species={pot.species} stage={stage} size={112} potLevel={pot.level} />
        </div>
      </div>

      <div
        title={pot.intro}
        style={{
          fontSize: 12.5,
          color: 'var(--ink-2)',
          lineHeight: 1.6,
          minHeight: 36,
          ...POT_DESCRIPTION_PREVIEW_STYLE,
        }}
      >
        {pot.intro}
      </div>

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
function GardenScene({ pots, theme, layout, editMode, onMovePot, onOpenPot, dense = false, potDecorations = {}, selectedPotId = null, onSelectPot, hiddenPots = {}, onHidePot }) {
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
      }
    };
    const onUp = () => setDragging(null);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging, onMovePot]);

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

      {/* pots — positioned by layout[id].x / .y */}
      {pots.filter(p => !hiddenPots[p.id]).map(pot => {
        const stage = pot.stage ?? tilCountToStage(pot.tilCount ?? 0);
        const decoration = potDecorations[pot.id];
        const displayedSpecies = decoration?.species ?? pot.species;
        const displayedStage = decoration ? 'full' : stage;
        const pos = layout[pot.id] || { x: 50, y: 75 };
        const size = dense ? 76 : 92;
        const isDragging = dragging?.kind === 'pot' && dragging?.id === pot.id;
        const isSelected = editMode && selectedPotId === pot.id;
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
              zIndex: isDragging || isSelected ? 12 : 2,
              willChange: isDragging ? 'left, top, transform' : 'auto',
            }}
          >
            <div
              onPointerDown={editMode ? (e) => {
                onSelectPot && onSelectPot(pot.id);
                startDrag('pot', pot.id, e, pos);
              } : undefined}
              onClick={editMode ? undefined : () => onOpenPot && onOpenPot(pot.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                filter: isSelected ? 'drop-shadow(0 0 0.35rem rgba(15, 110, 86, 0.45))' : 'none',
              }}
            >
              <PottedPlant
                species={displayedSpecies}
                stage={displayedStage}
                size={size}
                glow={displayedSpecies === 'moonlight'}
                potLevel={pot.level}
              />
              <div style={{
                fontSize: 10.5,
                color: isSelected ? 'var(--ink)' : isDark ? '#e8f4ec' : 'var(--ink)',
                fontFamily: 'var(--font-display)', fontWeight: 600,
                padding: '2px 7px', borderRadius: 4,
                background: isSelected
                  ? 'rgba(235, 245, 239, 0.95)'
                  : isDark ? 'rgba(15, 42, 71, 0.6)' : 'rgba(255, 255, 255, 0.75)',
                border: isSelected ? '1px solid var(--leaf)' : 'none',
                maxWidth: 132,
                imageRendering: 'pixelated',
                ...POT_TITLE_PREVIEW_STYLE,
              }} title={`${pot.emoji} ${pot.name}`}>
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

function GardenScreen({ refreshKey = 0, onOpenPot }) {
  const { user } = useUser();
  const [editMode, setEditMode] = useState(false);

  // 🎨 가이드 투어 순차 진행 시 특정 단계에 맞춰 자동으로 정원 꾸미기 모드(editMode)를 온/오프 처리합니다.
  useEffect(() => {
    const handleGuideStep = (e) => {
      const { action, isEnd, selector } = e.detail;
      if (isEnd) {
        setEditMode(false);
        return;
      }
      
      // 정원 화면 관련 가이드가 실행 중이고, 꾸미기 기능 설명 단계에 도달하면 편집 모드를 자동 활성화합니다.
      if (selector && selector.startsWith('.guide-garden-')) {
        setEditMode(action === 'enableGardenEditMode');
      }
    };

    window.addEventListener('rootin-guide-step', handleGuideStep);
    return () => window.removeEventListener('rootin-guide-step', handleGuideStep);
  }, []);
  const [themeId, setThemeId] = useState('meadow');
  const [layout, setLayout] = useState(DEFAULT_GARDEN_LAYOUT);
  const [decorations, setDecorations] = useState([]);
  const [selectedGardenPotId, setSelectedGardenPotId] = useState(null);
  const [hiddenPots, setHiddenPots] = useState({}); // { potId: true }
  const [pots, setPots] = useState([]);
  const [potsLoading, setPotsLoading] = useState(true);
  const [potsError, setPotsError] = useState(null);
  const [showCreatePot, setShowCreatePot] = useState(false);
  const lastFetchDateRef = useRef(getKstDateString());
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const loadingRequestIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 백엔드로부터 가져온 수확 식물의 전체 인벤토리 목록을 관리하기 위한 상태입니다.
  const [allHarvestedPlants, setAllHarvestedPlants] = useState([]);
  // 정원 레이아웃을 백엔드에 저장하는 API 호출 로딩 상태입니다.
  const [layoutSaving, setLayoutSaving] = useState(false);

  const theme = GARDEN_THEMES.find(t => t.id === themeId);
  const movePot = (id, x, y) => setLayout(L => ({ ...L, [id]: { x, y } }));

  // 수확 완료 식물은 독립 오브젝트가 아니라, 선택한 화분 위의 꾸미기용 식물로 적용합니다.
  const applyHarvestedPlantToPot = (harvestedPlant) => {
    const visiblePotList = pots.filter(p => !hiddenPots[p.id]);
    const targetPotId = selectedGardenPotId ?? visiblePotList[0]?.id;
    if (!targetPotId) return;
    if (harvestedPlant.potId !== targetPotId) return;

    const species = inferSpecies(harvestedPlant.name);
    setSelectedGardenPotId(targetPotId);
    setDecorations(D => [
      ...D.filter(d => d.id !== harvestedPlant.id && d.potId !== targetPotId),
      {
        id: harvestedPlant.id, // 백엔드의 수확식물 고유 ID를 그대로 활용합니다.
        potId: targetPotId,
        species,
        name: harvestedPlant.name,
      }
    ]);
  };
  const removeSelectedPotDecoration = () => {
    if (!selectedGardenPotId) return;
    setDecorations(D => D.filter(d => d.potId !== selectedGardenPotId));
  };
  const clearDecorations = () => setDecorations([]);
  const hidePot = (id) => {
    setHiddenPots(H => ({ ...H, [id]: true }));
    setDecorations(D => D.filter(d => d.potId !== id));
    setSelectedGardenPotId(current => current === id ? null : current);
  };
  const showPot = (id) => {
    const index = pots.findIndex(p => p.id === id);
    setLayout(L => ({ ...L, [id]: L[id] ?? getLayoutSlot(Math.max(0, index)) }));
    setHiddenPots(H => { const N = { ...H }; delete N[id]; return N; });
    setSelectedGardenPotId(id);
  };
  const resetGarden = () => {
    setLayout({});
    setHiddenPots(Object.fromEntries(pots.map(p => [p.id, true])));
    setDecorations([]);
    setSelectedGardenPotId(null);
  };

  // 정원에 아직 적용되지 않은 수확 식물들만 필터링하여 인벤토리에 나타냅니다.
  const unplacedHarvestedPlants = allHarvestedPlants.filter(
    hp => !decorations.some(d => d.id === hp.id)
  );

  const visiblePots = pots.filter(p => !hiddenPots[p.id]);
  const selectedGardenPot = visiblePots.find(p => p.id === selectedGardenPotId) ?? visiblePots[0] ?? null;
  const selectedPotDecoration = selectedGardenPot
    ? decorations.find(d => d.potId === selectedGardenPot.id)
    : null;
  const selectedPotAvailableHarvestedPlants = selectedGardenPot
    ? unplacedHarvestedPlants.filter(hp => hp.potId === selectedGardenPot.id)
    : [];
  const potDecorations = decorations.reduce((acc, decoration) => {
    if (decoration.potId) {
      acc[decoration.potId] = decoration;
    }
    return acc;
  }, {});
  const wateredCount = pots.filter(p => p.waterToday).length;
  const allPotsWatered = pots.length > 0 && wateredCount === pots.length;
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
  const loadGardenState = useCallback(async (silent = false) => {
    const requestId = ++requestIdRef.current;
    if (!silent) {
      loadingRequestIdRef.current = requestId;
      setPotsLoading(true);
      setPotsError(null);
    }
    try {
      const [data, potSummaries] = await Promise.all([
        getGardenState(),
        getPots().catch(() => []),
      ]);
      if (!mountedRef.current || requestId !== requestIdRef.current) return;

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
        .map(hp => {
          const sourcePotExists = potList.some(pot => pot.id === hp.potId && !newHiddenPots[pot.id]);
          const potId = hp.potId != null
            ? (sourcePotExists ? hp.potId : null)
            : findNearestVisiblePotId(
                { x: hp.positionX, y: hp.positionY },
                newLayout,
                potList,
                newHiddenPots
              );
          return potId ? {
            id: hp.id,
            potId,
            species: inferSpecies(hp.name),
            name: hp.name,
          } : null;
        })
        .filter(Boolean)
        .reduce((uniqueByPot, decoration) => {
          if (!uniqueByPot.some(item => item.potId === decoration.potId)) {
            uniqueByPot.push(decoration);
          }
          return uniqueByPot;
        }, []);
      setDecorations(activeDecs);
      lastFetchDateRef.current = getKstDateString();

    } catch (err) {
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      console.error('정원 정보를 불러오지 못했습니다.', err);
      if (!silent) {
        setPots([]);
        setAllHarvestedPlants([]);
        setDecorations([]);
        setPotsError('정원 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      if (mountedRef.current && loadingRequestIdRef.current === requestId) {
        setPotsLoading(false);
        loadingRequestIdRef.current = 0;
      }
    }
  }, []);

  // 컴포넌트 마운트 및 refreshKey 변경 시 정원 상태를 서버에서 조회해 옵니다.
  useEffect(() => {
    loadGardenState(false);
  }, [refreshKey, loadGardenState]);

  // 다음 자정 + 랜덤 딜레이(0~60초) 시점에 데이터를 재조회합니다.
  useEffect(() => {
    let timerId = null;

    const scheduleNextMidnightFetch = () => {
      const msUntilMidnight = getMsUntilKstMidnight();
      const randomDelay = Math.random() * 60000;
      const totalDelay = msUntilMidnight + randomDelay;

      timerId = setTimeout(() => {
        loadGardenState(true);
        scheduleNextMidnightFetch();
      }, totalDelay);
    };

    scheduleNextMidnightFetch();

    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [loadGardenState]);

  // 비활성 탭이었다가 다시 브라우저로 진입했을 때, 날짜가 바뀌었다면 재조회합니다.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const currentDateStr = getKstDateString();
        if (lastFetchDateRef.current !== currentDateStr) {
          loadGardenState(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadGardenState]);

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
        const pos = dec?.potId ? layout[dec.potId] : null;
        const isDisplayed = Boolean(dec && pos && !hiddenPots[dec.potId]);
        return {
          id: hp.id,
          isDisplayed,
          positionX: isDisplayed && pos ? Math.max(0, Math.round(pos.x)) : null,
          positionY: isDisplayed && pos ? Math.max(0, Math.round(pos.y)) : null,
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
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em', marginTop: 4, whiteSpace: 'nowrap' }}>
              {user?.name ?? ''}님의 정원 · TIL <span style={{ color: 'var(--moss-2)' }}>{user?.totalTil ?? 0}</span>개
            </h2>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 6 }}>
              {potsLoading
                ? '화분을 불러오는 중이에요.'
                : `${pots.length}개의 화분이 자라고 있어요. 오늘 ${wateredCount}개의 화분에 물을 줬어요.`}
            </div>
          </div>
          <div className="guide-garden-edit" style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
            <Btn variant="primary" size="md" icon={Icon.plus} onClick={() => setShowCreatePot(true)}>새 화분</Btn>
            {editMode ? (
              <Btn variant="green" size="md" icon={Icon.check} onClick={handleSaveLayout} disabled={layoutSaving}>
                {layoutSaving ? '저장 중...' : '꾸미기 완료'}
              </Btn>
            ) : (
              <Btn
                variant="accent"
                size="md"
                onClick={() => {
                  setEditMode(true);
                  setSelectedGardenPotId(visiblePots[0]?.id ?? null);
                }}
              >
                🎨 정원 꾸미기
              </Btn>
            )}
          </div>
        </div>

        {/* Scene */}
        <div className="guide-garden-scene" style={{ padding: '0 20px 20px' }}>
          <GardenScene
            pots={pots}
            theme={theme}
            layout={layout}
            editMode={editMode}
            onMovePot={movePot}
            onOpenPot={onOpenPot}
            potDecorations={potDecorations}
            selectedPotId={selectedGardenPot?.id ?? null}
            onSelectPot={setSelectedGardenPotId}
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
              <div className="guide-garden-theme">
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
                  <div className="eyebrow">수확한 식물 · 화분 위 꾸미기 ({selectedPotAvailableHarvestedPlants.length})</div>
                  {decorations.length > 0 && (
                    <button onClick={clearDecorations} style={{
                      fontSize: 11, color: 'var(--ink-3)',
                      fontFamily: 'var(--font-display)',
                    }}>꾸미기 모두 해제 ({decorations.length})</button>
                  )}
                </div>
                <div style={{
                  fontSize: 12,
                  color: selectedGardenPot ? 'var(--ink-2)' : '#8a5a12',
                  lineHeight: 1.6,
                  padding: '10px 12px',
                  background: selectedGardenPot ? '#fff' : '#fff7ed',
                  border: `0.5px solid ${selectedGardenPot ? 'var(--rule-2)' : '#f5d3a2'}`,
                  borderRadius: 8,
                  marginBottom: 10,
                }}>
                  {selectedGardenPot
                    ? <>선택된 화분: <b style={{ color: 'var(--moss-2)' }}>{selectedGardenPot.name}</b>{selectedPotDecoration ? ` · 적용 중: ${selectedPotDecoration.name}` : ' · 기본 식물 표시 중'}</>
                    : '먼저 정원에 배치된 화분을 선택해 주세요.'}
                  {selectedPotDecoration && (
                    <button
                      type="button"
                      onClick={removeSelectedPotDecoration}
                      style={{
                        marginLeft: 8,
                        fontSize: 11,
                        color: '#b8536a',
                        fontWeight: 700,
                        fontFamily: 'var(--font-display)',
                      }}
                    >
                      적용 해제
                    </button>
                  )}
                </div>
                {selectedPotAvailableHarvestedPlants.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', padding: '12px 14px', background: '#fff', border: '0.5px dashed var(--rule-2)', borderRadius: 8 }}>
                    {selectedGardenPot
                      ? '이 화분에서 수확한 식물이 없거나 이미 적용했어요. 해당 화분의 식물을 만개까지 키워 수확하면 여기에 추가됩니다.'
                      : '먼저 화분을 선택해 주세요.'}
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {selectedPotAvailableHarvestedPlants.map(h => {
                      const species = inferSpecies(h.name);
                      const monName = PIXEL_SPECIES[species]?.stages?.full?.name ?? h.name;
                      const isRare = species === 'moonlight';
                      return (
                        <button
                          key={h.id}
                          onClick={() => applyHarvestedPlantToPot(h)}
                          disabled={!selectedGardenPot}
                          style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                            padding: '10px 10px 8px',
                            borderRadius: 10,
                            background: '#fff',
                            border: '0.5px solid ' + (isRare ? '#ccc9f0' : 'var(--rule-2)'),
                            cursor: selectedGardenPot ? 'pointer' : 'not-allowed',
                            position: 'relative',
                            transition: 'transform 100ms ease',
                            minWidth: 92,
                            opacity: selectedGardenPot ? 1 : 0.55,
                          }}
                          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                          title={selectedGardenPot ? `${selectedGardenPot.name} 화분 위에 ${monName} 적용` : '화분을 먼저 선택해 주세요'}
                        >
                          {isRare && (
                            <span style={{
                              position: 'absolute', top: 4, left: 5,
                              fontSize: 9, color: '#534ab7',
                            }}>✦</span>
                          )}
                          <PixelPlant species={species} stage="full" size={44} />
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>{monName}</div>
                          <div style={{ fontSize: 9, color: 'var(--moss-2)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>+ 적용</div>
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
        </div>
      } />
      <div className="guide-garden-pots" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
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

      {!potsLoading && !potsError && pots.length > 0 && (
        <div style={{
          marginTop: 28, padding: '16px 22px',
          background: '#fff', border: '0.5px solid var(--rule)',
          borderRadius: 12,
          display: 'flex', alignItems: 'center', gap: 18,
        }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--paper-2)', color: 'var(--moss-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {allPotsWatered ? '✨' : '🌱'}
          </div>
          <div style={{ flex: 1, fontSize: 13, color: 'var(--ink-2)' }}>
            {allPotsWatered ? (
              <>
                오늘 모든 화분에 물주기를 마쳤어요. <b style={{ color: 'var(--ink)' }}>꾸준한 기록이 정원을 더 깊게 자라게 하고 있어요.</b>
              </>
            ) : (
              <>
                <b style={{ color: 'var(--ink)' }}>{attentionPot.name} 화분</b>에 오늘의 TIL을 남기면 경험치가 쌓이고 식물이 자라요.
              </>
            )}
          </div>
          {allPotsWatered ? (
            <Pill tone="green">오늘 루틴 완료</Pill>
          ) : (
            <Btn variant="secondary" size="sm" onClick={() => onOpenPot(attentionPot.id)}>화분으로 이동</Btn>
          )}
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
  const titleInvalid = titleLength === 0 || title.length > POT_TITLE_MAX_LENGTH;
  const descriptionInvalid = descriptionLength > POT_DESCRIPTION_MAX_LENGTH;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (title.trim().length === 0) {
      setError('화분 제목을 입력해 주세요.');
      return;
    }
    if (title.length > POT_TITLE_MAX_LENGTH) {
      setError(`화분 제목은 최대 ${POT_TITLE_MAX_LENGTH}자까지 입력할 수 있어요.`);
      return;
    }
    if (description.length > POT_DESCRIPTION_MAX_LENGTH) {
      setError(`화분 소개글은 최대 ${POT_DESCRIPTION_MAX_LENGTH}자까지 입력할 수 있어요.`);
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
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginTop: 6 }}>
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
              <span style={{ color: title.length > POT_TITLE_MAX_LENGTH ? '#b8536a' : 'var(--ink-3)' }}>{title.length}/{POT_TITLE_MAX_LENGTH}</span>
            </span>
            <input
              value={title}
              onChange={e => setTitle(e.target.value.slice(0, POT_TITLE_MAX_LENGTH))}
              maxLength={POT_TITLE_MAX_LENGTH}
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
              <span style={{ color: descriptionInvalid ? '#b8536a' : 'var(--ink-3)' }}>{descriptionLength}/{POT_DESCRIPTION_MAX_LENGTH}</span>
            </span>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value.slice(0, POT_DESCRIPTION_MAX_LENGTH))}
              maxLength={POT_DESCRIPTION_MAX_LENGTH}
              placeholder="이 화분에 어떤 기록을 모을지 적어보세요."
              disabled={loading}
              style={{
                height: 82,
                resize: 'none',
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
function PotDetailBackButton({ onBack, style }) {
  return (
    <button
      type="button"
      onClick={onBack}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '8px 12px',
        borderRadius: 999,
        border: '0.5px solid #c9dccd',
        background: '#fff',
        color: 'var(--moss-2)',
        fontSize: 12.5,
        fontWeight: 700,
        fontFamily: 'var(--font-display)',
        boxShadow: '0 4px 12px rgba(40, 84, 57, 0.08)',
        ...style,
      }}
    >
      <span style={{ transform: 'rotate(180deg)', display: 'inline-flex' }}>{Icon.arrow}</span>
      정원으로 돌아가기
    </button>
  );
}

const TIL_PAGE_SIZE_OPTIONS = [5, 10, 20];

function TilPagination({ tilPage, tilTotalPages, onPageChange }) {
  if (tilTotalPages <= 1) return null;

  const WING = 2;
  const pages = [];
  const addPage = (i) => pages.push({ type: 'page', i });
  const addEllipsis = (key) => pages.push({ type: 'ellipsis', key });

  if (tilTotalPages <= 7) {
    for (let i = 0; i < tilTotalPages; i++) addPage(i);
  } else {
    addPage(0);
    const leftEdge = tilPage - WING;
    const rightEdge = tilPage + WING;
    if (leftEdge > 1) addEllipsis('left');
    for (let i = Math.max(1, leftEdge); i <= Math.min(tilTotalPages - 2, rightEdge); i++) addPage(i);
    if (rightEdge < tilTotalPages - 2) addEllipsis('right');
    addPage(tilTotalPages - 1);
  }

  const arrowStyle = (disabled) => ({
    width: 38, height: 38, borderRadius: 9,
    border: '0.5px solid var(--rule-2)', background: '#fff',
    color: disabled ? 'var(--ink-3)' : 'var(--ink)',
    opacity: disabled ? 0.35 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 18, fontWeight: 400, lineHeight: 1,
  });

  return (
    <div
      role="navigation"
      aria-label="TIL 페이지 네비게이션"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
    >
      <button type="button" aria-label="이전 페이지" disabled={tilPage === 0}
        onClick={() => onPageChange(tilPage - 1)} style={arrowStyle(tilPage === 0)}>
        ‹
      </button>

      {pages.map(item => {
        if (item.type === 'ellipsis') {
          return (
            <span key={`ellipsis-${item.key}`} style={{
              width: 32, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, color: 'var(--ink-3)', letterSpacing: '0.05em', userSelect: 'none',
            }}>…</span>
          );
        }
        const i = item.i;
        const active = tilPage === i;
        return (
          <button
            key={i} type="button"
            aria-label={`${i + 1}페이지`}
            aria-current={active ? 'page' : undefined}
            onClick={() => onPageChange(i)}
            style={{
              width: 36, height: 38, borderRadius: 9,
              border: `0.5px solid ${active ? 'var(--moss)' : 'var(--rule-2)'}`,
              background: active ? '#ebf5ef' : '#fff',
              color: active ? 'var(--moss-2)' : 'var(--ink-2)',
              fontWeight: active ? 700 : 400,
              fontSize: 13, fontFamily: 'var(--font-display)', cursor: 'pointer',
            }}
          >
            {i + 1}
          </button>
        );
      })}

      <button type="button" aria-label="다음 페이지" disabled={tilPage >= tilTotalPages - 1}
        onClick={() => onPageChange(tilPage + 1)} style={arrowStyle(tilPage >= tilTotalPages - 1)}>
        ›
      </button>
    </div>
  );
}

function PotDetailSidebar({ pot, stage, dashboard, onBack, onStartTil, onShowHarvest, onShowEditPot }) {
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <PotDetailBackButton onBack={onBack} />
      </div>
      <Card className="guide-pot-detail-card" padding={0} style={{ overflow: 'hidden' }}>
        <div style={{
          padding: '60px 24px 24px',
          background: isRare
            ? 'linear-gradient(180deg, #d8e2f0 0%, #f5f7f5 80%)'
            : 'linear-gradient(180deg, #d4ebdc 0%, #f5f7f5 80%)',
          textAlign: 'center',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', top: 14, left: 14, right: 14,
            display: 'flex', justifyContent: 'flex-end',
          }}>
            <Pill>{pot.tilCount} TIL</Pill>
          </div>
          <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center' }}>
            <div className="guide-pot-detail-plant">
              <PottedPlant species={pot.species} stage={stage} size={182} glow={isRare} potLevel={pot.level} />
            </div>
          </div>
          {monName && (
            <div style={{ marginTop: 12, fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
              {monName}
            </div>
          )}
        </div>
        <div style={{ padding: '20px 24px 22px' }}>
          <div className="guide-pot-detail-info" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div
              title={`${pot.emoji} ${pot.name}`}
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 22,
                fontWeight: 700,
                color: 'var(--ink)',
                letterSpacing: '-0.01em',
                ...POT_TITLE_PREVIEW_STYLE,
              }}
            >
              {pot.emoji} {pot.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', minWidth: 0 }}>
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
              </div>
              {dashboard && (
                <button
                  type="button"
                  onClick={onShowEditPot}
                  style={{
                    flexShrink: 0,
                    padding: '4px 8px',
                    borderRadius: 8,
                    border: '0.5px solid var(--rule)',
                    color: 'var(--ink-3)',
                    fontSize: 11,
                    fontFamily: 'var(--font-display)',
                    background: '#fff',
                  }}
                >
                  화분 수정
                </button>
              )}
            </div>
          </div>
          <div
            title={pot.intro}
            style={{
              fontSize: 12.5,
              color: 'var(--ink-2)',
              marginTop: 10,
              lineHeight: 1.6,
              ...POT_DESCRIPTION_PREVIEW_STYLE,
            }}
          >
            {pot.intro}
          </div>
          <div style={{
            marginTop: 18,
            background: '#fff',
            border: '0.5px solid var(--rule)',
            borderRadius: 12,
            overflow: 'hidden',
          }} className="guide-pot-detail-growth">
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
                  <div style={{ marginTop: 8 }}>
                    <ProgressBar value={item.progress} height={8} />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, fontSize: 11.5, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
            {detailSubText}
          </div>
          <div className="guide-pot-detail-actions" style={{ display: 'flex', gap: 8, marginTop: 18 }}>
            <Btn variant="green" size="md" icon={Icon.drop} style={{ flex: 1 }} onClick={onStartTil}>
              TIL 작성하고 물주기
            </Btn>
            <Btn
              variant={pot.canHarvest ? 'accent' : 'secondary'}
              size="md"
              onClick={onShowHarvest}
              disabled={dashboard && !pot.canHarvest}
              style={dashboard && !pot.canHarvest ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
            >
              수확
            </Btn>
          </div>
        </div>
      </Card>

      {/* Evolution chain (mini) */}
      <Card className="guide-pot-detail-evolution" padding={18}>
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
  );
}

function PotDetailScreen({ potId, refreshKey = 0, onBack, onStartTil, onEditTil }) {
  const { user } = useUser();
  const fallbackPot = POTS.find(p => p.id === potId);
  const [showHarvest, setShowHarvest] = useState(false);
  const [showEditPot, setShowEditPot] = useState(false);
  const [showDeletePot, setShowDeletePot] = useState(false);
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
  const [tilPage, setTilPage] = useState(0);
  const [tilPageSize, setTilPageSize] = useState(10);
  const [tilTotalPages, setTilTotalPages] = useState(0);
  const [tilsRefreshKey, setTilsRefreshKey] = useState(0);

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

    getMyTils({ potId, page: tilPage, size: tilPageSize, sort: 'latest' })
      .then(pageData => {
        if (!active) return;
        const content = Array.isArray(pageData?.content) ? pageData.content : [];
        setTils(content.map(toTilListItem));
        setTilTotalCount(pageData?.totalElements ?? content.length);
        setTilTotalPages(
          pageData?.totalPages ?? Math.ceil((pageData?.totalElements ?? content.length) / tilPageSize)
        );
      })
      .catch(() => {
        if (!active) return;
        setTils([]);
        setTilTotalCount(0);
        setTilTotalPages(0);
        setTilsError('이 화분의 TIL 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
      })
      .finally(() => {
        if (active) setTilsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [potId, user?.userId, refreshKey, tilPage, tilPageSize, tilsRefreshKey]);

  useEffect(() => {
    if (!selectedTil) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedTil]);

  const refreshDashboard = useCallback(async () => {
    const updatedDashboard = await getGardenDashboard(potId);
    setDashboard(updatedDashboard);
  }, [potId]);

  const pot = dashboard ? toDashboardPot(dashboard) : fallbackPot;

  if (dashboardLoading && !pot) {
    return (
      <div style={{ padding: 32, maxWidth: 960, margin: '0 auto' }}>
        <PotDetailBackButton onBack={onBack} style={{ marginBottom: 16 }} />
        <Card padding={28} style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
          화분 대시보드를 불러오는 중이에요.
        </Card>
      </div>
    );
  }

  if (!pot) {
    return (
      <div style={{ padding: 32, maxWidth: 960, margin: '0 auto' }}>
        <PotDetailBackButton onBack={onBack} style={{ marginBottom: 16 }} />
        <Card padding={28} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🌱</div>
          <div className="eyebrow" style={{ color: 'var(--moss-2)' }}>Garden Detail</div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginTop: 6 }}>
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
  const handleDeleteTil = async () => {
    if (!selectedTil?.id) return;
    await deleteTil(selectedTil.id);
    setSelectedTil(null);
    setTilPage(0);
    setTilsRefreshKey(k => k + 1);
    try {
      await refreshDashboard();
    } catch (err) {
      console.error('dashboard 갱신 실패:', err);
      // 목록은 이미 갱신됐으므로 사용자에게 별도 에러를 노출하지 않음
    }
  };
  const handleHarvested = async () => {
    try {
      await refreshDashboard();
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
    <div style={{
      height: '100vh',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      maxWidth: 1600,
      margin: '0 auto',
      width: '100%',
      fontFamily: 'var(--font-body)',
    }}>
      <div style={{
        flex: 1,
        minHeight: 0,
        display: 'grid',
        gridTemplateColumns: 'minmax(340px, 400px) minmax(0, 1fr)',
      }}>

        {/* Left — 독립 고정 영역: 오른쪽 목록을 스크롤해도 전혀 움직이지 않아 항상 보임.
            내용이 길어 넘칠 때만 조용히 스크롤(스크롤바 숨김) → 화면엔 우측 스크롤바 1개만 노출 */}
        <div className="scrollbar-hide scroll-shadow" style={{ overflowY: 'auto', padding: '32px 16px 32px 32px' }}>
          <PotDetailSidebar
            pot={pot}
            stage={stage}
            dashboard={dashboard}
            onBack={onBack}
            onStartTil={handleStartTil}
            onShowHarvest={() => setShowHarvest(true)}
            onShowEditPot={() => setShowEditPot(true)}
          />

        </div>

        {/* Right — 유일한 스크롤 영역, 1fr로 가로 폭을 가득 채움 */}
        <div className="scrollbar-subtle" style={{ minWidth: 0, overflowY: 'auto', padding: '32px 32px 32px 16px' }}>
          <div className="guide-pot-detail-records" style={{ borderRadius: 14, padding: '8px 10px 12px', margin: '-8px -10px 0' }}>
            <SectionHeader eyebrow="이 화분의 기록" title={`TIL ${displayedTilCount}개`} action={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

              {/* Page size selector */}
              <div
                role="group"
                aria-label="페이지 크기 선택"
                style={{ display: 'flex', borderRadius: 8, border: '0.5px solid var(--rule-2)', overflow: 'hidden' }}
              >
                {TIL_PAGE_SIZE_OPTIONS.map(size => (
                  <button
                    key={size}
                    type="button"
                    aria-pressed={tilPageSize === size}
                    onClick={() => {
                      setTilPageSize(size);
                      setTilPage(0);
                    }}
                    style={{
                      padding: '5px 10px',
                      fontSize: 12,
                      fontFamily: 'var(--font-display)',
                      fontWeight: tilPageSize === size ? 700 : 400,
                      color: tilPageSize === size ? 'var(--moss-2)' : 'var(--ink-3)',
                      background: tilPageSize === size ? '#ebf5ef' : '#fff',
                      borderRight: size !== 20 ? '0.5px solid var(--rule-2)' : 'none',
                    }}
                  >
                    {size}개
                  </button>
                ))}
              </div>
              {/* Search input */}
              <div style={{ position: 'relative', width: 240, maxWidth: '35vw' }}>
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
            {/* 상단 페이지네이션 */}
            {!hasTilFilter && tilTotalPages > 1 && (
              <div style={{ marginBottom: 12 }}>
                <TilPagination tilPage={tilPage} tilTotalPages={tilTotalPages} onPageChange={setTilPage} />
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
                <div style={{ minWidth: 0 }}>
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
              </Card>
            ))}
            </div>

            {/* 하단 페이지네이션 */}
            {!hasTilFilter && (
              <div style={{ marginTop: 20 }}>
                <TilPagination tilPage={tilPage} tilTotalPages={tilTotalPages} onPageChange={setTilPage} />
              </div>
            )}
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
      {showDeletePot && (
        <DeletePotModal
          pot={pot}
          onClose={() => setShowDeletePot(false)}
          onDeleted={() => {
            setShowDeletePot(false);
            onBack && onBack();
          }}
        />
      )}
      {selectedTil && (
        <TilDetailModal
          til={selectedTil}
          loading={tilDetailLoading}
          onClose={() => setSelectedTil(null)}
          onEdit={() => handleEditTil(selectedTil)}
          onDelete={handleDeleteTil}
        />
      )}
      {showEditPot && (
        <EditPotModal
          pot={pot}
          onClose={() => setShowEditPot(false)}
          onUpdated={handlePotUpdated}
          onDeleteRequest={() => {
            setShowEditPot(false);
            setShowDeletePot(true);
          }}
        />
      )}
    </div>
  );
}

function TilDetailModal({ til, loading, onClose, onEdit, onDelete }) {
  const contentHtml = til.content?.trim();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDelete();
    } catch (err) {
      setDeleteError(err?.body?.message ?? 'TIL을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.');
      setDeleting(false);
    }
  };

  const handleClose = () => {
    if (deleting) return;
    setConfirmDelete(false);
    setDeleteError(null);
    onClose();
  };

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
    }} onClick={handleClose}>
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
            <button type="button" onClick={handleClose} style={{
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
          borderTop: '0.5px solid var(--rule)',
          background: 'var(--paper)',
        }}>
          {confirmDelete && (
            <div style={{
              padding: '12px 22px',
              background: '#fff3f5',
              borderBottom: '0.5px solid #f7c1c1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: 13, color: '#b8536a', fontWeight: 500 }}>
                이 TIL을 정말 삭제할까요? 삭제 후에는 복구할 수 없어요.
              </span>
              {deleteError && (
                <span style={{ fontSize: 12, color: '#b8536a' }}>{deleteError}</span>
              )}
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <Btn type="button" variant="secondary" size="sm" onClick={() => { setConfirmDelete(false); setDeleteError(null); }} disabled={deleting}>
                  취소
                </Btn>
                <Btn type="button" variant="danger" size="sm" onClick={handleDeleteConfirm} disabled={deleting}>
                  {deleting ? '삭제 중...' : '삭제 확인'}
                </Btn>
              </div>
            </div>
          )}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            padding: '16px 22px',
          }}>
            <Btn type="button" variant="danger" size="md" onClick={() => setConfirmDelete(true)} disabled={loading || confirmDelete || deleting}>
              삭제
            </Btn>
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn type="button" variant="secondary" size="md" onClick={handleClose} disabled={deleting}>
                닫기
              </Btn>
              <Btn type="button" variant="green" size="md" icon={Icon.edit} onClick={onEdit} disabled={loading || deleting}>
                수정하기
              </Btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeletePotModal({ pot, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      await deletePot(pot.id);
      setLoading(false);
      onDeleted?.();
    } catch (err) {
      setError(
        err?.status === 401
          ? '로그인 인증이 만료되었어요. 다시 로그인한 뒤 삭제해 주세요.'
          : err?.body?.message ?? '화분을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.'
      );
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 42, 71, 0.42)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 55,
      backdropFilter: 'blur(4px)',
      padding: 24,
    }} onClick={loading ? undefined : onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 460,
        background: '#fff',
        borderRadius: 18,
        padding: '28px 28px 24px',
        boxShadow: 'var(--shadow-lg)',
        border: '0.5px solid #f0c4cc',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div className="eyebrow" style={{ color: '#b8536a' }}>Delete Pot</div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginTop: 6 }}>
              {pot.name} 화분을 삭제할까요?
            </h2>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 6, lineHeight: 1.6 }}>
              삭제하면 이 화분에 작성된 TIL도 함께 삭제되며, 삭제한 데이터는 복구할 수 없어요.
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
            background: '#fff',
          }}>
            {Icon.close}
          </button>
        </div>

        <div style={{
          marginTop: 20,
          padding: '14px 16px',
          borderRadius: 12,
          background: '#fff3f5',
          border: '0.5px solid #f7c1c1',
          color: '#9f4055',
          fontSize: 12.5,
          lineHeight: 1.6,
        }}>
          <b style={{ color: '#8b2f43' }}>{pot.tilCount}개의 TIL</b>이 함께 삭제됩니다.
        </div>

        {error && (
          <div style={{
            marginTop: 14,
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
          <Btn type="button" variant="danger" size="lg" style={{ flex: 1 }} onClick={handleDelete} disabled={loading}>
            {loading ? '삭제 중...' : '삭제'}
          </Btn>
        </div>
      </div>
    </div>
  );
}

function EditPotModal({ pot, onClose, onUpdated, onDeleteRequest }) {
  const [title, setTitle] = useState(pot.name ?? '');
  const [description, setDescription] = useState(pot.intro === EMPTY_POT_INTRO ? '' : (pot.intro ?? ''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const titleInvalid = title.trim().length === 0 || title.length > POT_TITLE_MAX_LENGTH;
  const descriptionInvalid = description.length > POT_DESCRIPTION_MAX_LENGTH;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (title.trim().length === 0) {
      setError('화분 제목을 입력해 주세요.');
      return;
    }
    if (title.length > POT_TITLE_MAX_LENGTH) {
      setError(`화분 제목은 최대 ${POT_TITLE_MAX_LENGTH}자까지 입력할 수 있어요.`);
      return;
    }
    if (description.length > POT_DESCRIPTION_MAX_LENGTH) {
      setError(`화분 소개글은 최대 ${POT_DESCRIPTION_MAX_LENGTH}자까지 입력할 수 있어요.`);
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
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginTop: 6 }}>
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
              <span style={{ color: title.length > POT_TITLE_MAX_LENGTH ? '#b8536a' : 'var(--ink-3)' }}>{title.length}/{POT_TITLE_MAX_LENGTH}</span>
            </span>
            <input
              value={title}
              onChange={e => setTitle(e.target.value.slice(0, POT_TITLE_MAX_LENGTH))}
              maxLength={POT_TITLE_MAX_LENGTH}
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
              <span style={{ color: descriptionInvalid ? '#b8536a' : 'var(--ink-3)' }}>{description.length}/{POT_DESCRIPTION_MAX_LENGTH}</span>
            </span>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value.slice(0, POT_DESCRIPTION_MAX_LENGTH))}
              maxLength={POT_DESCRIPTION_MAX_LENGTH}
              disabled={loading}
              style={{
                height: 82,
                resize: 'none',
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

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 22, alignItems: 'center' }}>
          <Btn type="button" variant="danger" size="lg" onClick={onDeleteRequest} disabled={loading}>
            화분 삭제
          </Btn>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn type="button" variant="secondary" size="lg" onClick={onClose} disabled={loading}>
              취소
            </Btn>
            <Btn type="submit" variant="green" size="lg" disabled={loading || titleInvalid || descriptionInvalid}>
              {loading ? '저장 중...' : '저장'}
            </Btn>
          </div>
        </div>
      </form>
    </div>
  );
}

function HarvestResult({ result, onClose, potLevel }) {
  const nextSpecies = inferSpecies(result.nextPlantName);
  const isNextRare  = result.nextRarity === '희귀';
  return (
    <>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
      <div className="eyebrow" style={{ color: 'var(--moss-2)' }}>수확 완료</div>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginTop: 6 }}>
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
            <PottedPlant species={nextSpecies} stage="seed" size={36} glow={isNextRare} potLevel={potLevel} />
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
          <HarvestResult result={result} onClose={onClose} potLevel={pot.level} />
        ) : (
          /* 수확 확인 화면 */
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
              <PottedPlant species={pot.species} stage={pot.stage ?? 'full'} size={142} glow={pot.species === 'moonlight'} potLevel={pot.level} />
            </div>
            <div className="eyebrow" style={{ color: 'var(--moss-2)' }}>수확하기</div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginTop: 6 }}>
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
