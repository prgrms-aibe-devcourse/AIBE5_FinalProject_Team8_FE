import { useState, useEffect, useRef, useCallback } from 'react';
import { POTS, GARDEN_THEMES, DEFAULT_GARDEN_LAYOUT, TILS } from './data.jsx';
import { harvestPot, getGardenState, updateGardenTheme, updateGardenLayout } from './api/garden.js';
import { createPot, deletePot, getGardenDashboard, getPots, updatePot } from './api/pot.js';
import { getMyTils, getTil, deleteTil } from './api/til.js';
import { useUser } from './context/UserContext.jsx';
import { RtIcon } from './pixel-icons.jsx';
import { playSfx } from './lib/sfx.js';
import { PixelPlant, PIXEL_SPECIES } from './pixel-plants.jsx';
import { tilCountToStage, STAGE_META } from './plants.jsx';
import { inferSpecies } from './utils/plant.js';
import { TilContentView } from './components/til/til-content-view';
import './garden.css';
import './pot-detail.css';
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

// 희귀종 전용 무대 연출 — 도감 희귀 화면(gb-dex-screen--moon/bolt/rose)과 동일.
// 식물 뒤(z-index:0) 레이어. 좌표·연출은 도감(DEX_STAR_POS·DEX_PETALS)과 동일.
const RARE_STAR_POS = [
  { l: '14%', t: '20%' }, { l: '28%', t: '14%' }, { l: '42%', t: '24%' },
  { l: '60%', t: '16%' }, { l: '74%', t: '30%' }, { l: '86%', t: '18%' },
  { l: '20%', t: '40%' }, { l: '52%', t: '38%' }, { l: '90%', t: '44%' },
];
const RARE_PETALS = [
  { l: '12%', d: 0,   dur: 3.6 }, { l: '24%', d: 1.1, dur: 4.4 },
  { l: '38%', d: 0.5, dur: 3.2 }, { l: '52%', d: 1.9, dur: 4.7 },
  { l: '66%', d: 0.9, dur: 3.9 }, { l: '79%', d: 2.3, dur: 4.1 },
  { l: '90%', d: 1.4, dur: 3.4 },
];
// 희귀 종(pixel) → 도감 배경 테마 매핑
const RARE_THEME = { moonlight: 'moon', bolt: 'bolt', rose: 'rose' };
function isRareSpecies(species) {
  return PIXEL_SPECIES[species]?.rarity === 'rare';
}
// 희귀종이면 도감 테마('moon'|'bolt'|'rose'), 아니면 null
function rareThemeOf(species) {
  return isRareSpecies(species) ? (RARE_THEME[species] ?? 'moon') : null;
}

function RareStageFx({ theme = 'moon' }) {
  return (
    <div className={`gb-rare-fx gb-rare-fx--${theme}`} aria-hidden="true">
      {theme === 'moon' && (
        <>
          <span className="gb-rare-moon" />
          {RARE_STAR_POS.map((s, i) => (
            <span key={i} className="gb-rare-star" style={{ left: s.l, top: s.t, animationDelay: `${(i % 4) * 0.4}s` }} />
          ))}
        </>
      )}
      {theme === 'bolt' && (
        <>
          <span className="gb-rare-flash" />
          <span className="gb-rare-cloud gb-rare-cloud--1" />
          <span className="gb-rare-cloud gb-rare-cloud--2" />
          <span className="gb-rare-zap gb-rare-zap--1" />
          <span className="gb-rare-zap gb-rare-zap--2" />
        </>
      )}
      {theme === 'rose' && (
        <>
          <span className="gb-rare-rose-glow" />
          {RARE_PETALS.map((p, i) => (
            <span key={i} className="gb-rare-petal" style={{ left: p.l, animationDelay: `${p.d}s`, animationDuration: `${p.dur}s` }} />
          ))}
        </>
      )}
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
  const rareTheme = rareThemeOf(pot.species);
  const rare = rareTheme !== null;
  const levelProgress = pot.levelProgress ?? ((pot.tilCount ?? 0) / stageMeta.next);
  const progressPct = Math.round(levelProgress * 100);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }}
      className="rt-card gb-pot-card"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <p className="rt-stat-k" style={{ margin: '0 0 6px' }}>
            Lv.{pot.level} · {potTier.shortLabel} · {stageMeta.label}
          </p>
          <div
            title={`${pot.emoji} ${pot.name}`}
            className="rt-h3"
            style={{ margin: 0, fontSize: 17, ...POT_TITLE_PREVIEW_STYLE }}
          >
            {pot.emoji} {pot.name}
          </div>
        </div>
        {pot.waterToday ? (
          <span className="rt-badge rt-badge--leaf"><RtIcon name="drop" /> 물주기 완료</span>
        ) : (
          <span className="rt-badge rt-badge--peach">물주기 전</span>
        )}
      </div>

      <div className={`gb-pot-stage${rare ? ' gb-pot-stage--rare' : ''}`}>
        {rare && <RareStageFx theme={rareTheme} />}
        <div style={{ paddingBottom: 8, position: 'relative', zIndex: 1 }}>
          <PottedPlant species={pot.species} stage={stage} size={112} glow={rare} potLevel={pot.level} />
        </div>
      </div>

      <div
        title={pot.intro}
        className="rt-small"
        style={{ lineHeight: 1.6, minHeight: 36, ...POT_DESCRIPTION_PREVIEW_STYLE }}
      >
        {pot.intro}
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11, color: 'var(--muted)' }}>
          <span>화분 레벨 진척도</span>
          <span style={{ color: 'var(--leaf-2)' }}>{progressPct}%</span>
        </div>
        <div className="gb-prog"><i style={{ width: `${progressPct}%` }} /></div>
      </div>
    </div>
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
                glow={isRareSpecies(displayedSpecies)}
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

  // 이용 가이드 투어가 꾸미기 단계(.guide-garden-*)에 도달하면 정원 꾸미기 모드를 자동 온/오프한다.
  // (classic 테마 정원과 동일한 rootin-guide-step 프로토콜을 공유)
  useEffect(() => {
    const handleGuideStep = (e) => {
      const { action, isEnd, selector } = e.detail;
      if (isEnd) {
        setEditMode(false);
        return;
      }
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
    <div className="rt-app gb-garden-page" style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', minHeight: '100%' }}>

      {/* 게임 HUD 플레이어 바 */}
      <div className="rt-hud">
        <div className="rt-hud-l">
          <RtIcon name="person" /> PLAYER : {user?.name ?? '학습자'}
        </div>
        <div className="rt-hud-r">
          <span className="rt-hud-grp"><RtIcon name="sprout" /> 화분 {pots.length}</span>
          <span className="rt-hud-sep" />
          <span className="rt-hud-grp"><RtIcon name="drop" /> 물주기 {wateredCount}/{pots.length}</span>
          <span className="rt-hud-sep" />
          <span className="rt-hud-grp"><RtIcon name="book" /> TIL {user?.totalTil ?? 0}</span>
        </div>
      </div>

      {/* 게임보이 DMG 콘솔 — 정원 씬 */}
      <div className="gb-console">
        <div className="gb-console-head">
          <div>
            <span className="rt-tag"><RtIcon name="star" /> MY GARDEN</span>
            <h2 className="rt-h3" style={{ margin: '10px 0 0' }}>나의 정원 디스플레이</h2>
          </div>
          <div className="guide-garden-edit" style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
            <button className="gb-key gb-key--dark" onClick={() => { playSfx('nav'); setShowCreatePot(true); }}>
              <RtIcon name="plus" /> 새 화분
            </button>
            {editMode ? (
              <button className="gb-key gb-key--lcd" onClick={() => { playSfx('confirm'); handleSaveLayout(); }} disabled={layoutSaving}>
                <RtIcon name="check" /> {layoutSaving ? '저장 중...' : '꾸미기 완료'}
              </button>
            ) : (
              <button
                className="gb-key gb-key--ab"
                onClick={() => {
                  playSfx('toggle');
                  setEditMode(true);
                  setSelectedGardenPotId(visiblePots[0]?.id ?? null);
                }}
              >
                <RtIcon name="gear" /> 정원 꾸미기
              </button>
            )}
          </div>
        </div>

        {/* DMG LCD 패널 */}
        <div className="gb-garden guide-garden-scene">
          <div className="gb-garden-bezel">
            <div className="gb-garden-beztop">
              <span className="gb-garden-led" aria-hidden="true" />
              <span className="gb-garden-cap">DOT&nbsp;MATRIX&nbsp;·&nbsp;MY&nbsp;GARDEN</span>
            </div>
            <div className="gb-garden-frame">
              <span className="gb-garden-stripe" aria-hidden="true">
                <i className="red" /><i className="blue" />
              </span>
              <div className="gb-garden-lcd">
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
                <div className="gb-fx gb-fx-scan" aria-hidden="true" />
                <div className="gb-fx gb-fx-vignette" aria-hidden="true" />
                <div className="gb-fx gb-fx-glass" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>

        {/* 콘솔 하단 — 브랜드 각인 + 스피커 그릴 */}
        <div className="gb-console-foot">
          <div className="gb-brand">
            <span className="gb-brand-word">Rootin</span>
            <span className="gb-brand-sub">DOT-MATRIX&nbsp;GARDEN&nbsp;SYSTEM<span className="tm">TM</span></span>
          </div>
          <div className="gb-speaker" aria-hidden="true" />
        </div>

        {/* 꾸미기 패널 — 편집 모드일 때만 */}
        {editMode && (
          <div className="gb-panel">
            {/* 배경 */}
            <div className="guide-garden-theme">
              <p className="rt-eyebrow" style={{ marginBottom: 10 }}>배경</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {GARDEN_THEMES.map(t => {
                  const active = t.id === themeId;
                  return (
                    <button key={t.id} onClick={() => setThemeId(t.id)} className={`gb-chip${active ? ' is-active' : ''}`}>
                      <span style={{
                        width: 56, height: 36, borderRadius: 4,
                        background: t.sky, position: 'relative', overflow: 'hidden',
                        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.12)',
                      }}>
                        <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 10, background: t.ground }} />
                        <span style={{ position: 'absolute', top: 5, right: 6, width: 7, height: 7, background: t.sunColor }} />
                      </span>
                      {t.emoji} {t.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="gb-panel-sep" />

            {/* 수확한 식물 — 화분 위 꾸미기 */}
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8, flexWrap: 'wrap' }}>
                <p className="rt-eyebrow" style={{ margin: 0 }}>수확한 식물 · 화분 위 꾸미기 ({selectedPotAvailableHarvestedPlants.length})</p>
                {decorations.length > 0 && (
                  <button onClick={clearDecorations} className="rt-btn rt-btn--sm rt-btn--ghost">
                    꾸미기 모두 해제 ({decorations.length})
                  </button>
                )}
              </div>
              <div className="rt-small" style={{
                lineHeight: 1.6, padding: '10px 12px', borderRadius: 6, marginBottom: 10,
                background: selectedGardenPot ? 'var(--paper-card)' : 'var(--amber-soft)',
                border: `1px solid ${selectedGardenPot ? 'var(--line)' : 'var(--amber)'}`,
                color: selectedGardenPot ? 'var(--text-body)' : '#8a6322',
              }}>
                {selectedGardenPot
                  ? <>선택된 화분: <b style={{ color: 'var(--leaf-2)' }}>{selectedGardenPot.name}</b>{selectedPotDecoration ? ` · 적용 중: ${selectedPotDecoration.name}` : ' · 기본 식물 표시 중'}</>
                  : '먼저 정원에 배치된 화분을 선택해 주세요.'}
                {selectedPotDecoration && (
                  <button
                    type="button"
                    onClick={removeSelectedPotDecoration}
                    style={{ marginLeft: 8, fontSize: 11, color: 'var(--berry)', fontWeight: 700, fontFamily: 'var(--font-pixel)', padding: '2px 8px', borderRadius: 'var(--r-pill)', border: '1px solid var(--berry)', background: 'var(--berry-soft)', cursor: 'pointer' }}
                  >
                    적용 해제
                  </button>
                )}
              </div>
              {selectedPotAvailableHarvestedPlants.length === 0 ? (
                <div className="rt-small" style={{ padding: '12px 14px', background: 'var(--paper-card)', border: '1px dashed var(--line-strong)', borderRadius: 6, color: 'var(--muted-2)' }}>
                  {selectedGardenPot
                    ? '이 화분에서 수확한 식물이 없거나 이미 적용했어요. 해당 화분의 식물을 만개까지 키워 수확하면 여기에 추가됩니다.'
                    : '먼저 화분을 선택해 주세요.'}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {selectedPotAvailableHarvestedPlants.map(h => {
                    const species = inferSpecies(h.name);
                    const monName = PIXEL_SPECIES[species]?.stages?.full?.name ?? h.name;
                    const isRare = isRareSpecies(species);
                    return (
                      <button
                        key={h.id}
                        onClick={() => applyHarvestedPlantToPot(h)}
                        disabled={!selectedGardenPot}
                        className="gb-chip"
                        style={{
                          position: 'relative', minWidth: 92, padding: '10px 10px 8px',
                          borderColor: isRare ? 'var(--sky)' : undefined,
                          cursor: selectedGardenPot ? 'pointer' : 'not-allowed',
                          opacity: selectedGardenPot ? 1 : 0.55,
                        }}
                        title={selectedGardenPot ? `${selectedGardenPot.name} 화분 위에 ${monName} 적용` : '화분을 먼저 선택해 주세요'}
                      >
                        {isRare && (
                          <span style={{ position: 'absolute', top: 4, left: 5, fontSize: 9, color: 'var(--sky)' }}>✦</span>
                        )}
                        <PixelPlant species={species} stage="full" size={44} />
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--leaf)' }}>{monName}</div>
                        <span className="gb-chip-act">+ 적용</span>
                        {h.harvestedAt && (
                          <div style={{ fontSize: 9, color: 'var(--muted)' }}>{h.harvestedAt.slice(5)}</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 숨긴 화분 다시 배치 */}
              {Object.keys(hiddenPots).length > 0 && (
                <>
                  <p className="rt-eyebrow" style={{ marginTop: 14, marginBottom: 8 }}>숨긴 화분 · 다시 정원에 배치</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {pots.filter(p => hiddenPots[p.id]).map(p => {
                      const stage = p.stage ?? tilCountToStage(p.tilCount ?? 0);
                      return (
                        <button
                          key={p.id}
                          onClick={() => showPot(p.id)}
                          className="gb-chip"
                          style={{ flexDirection: 'row', gap: 8, padding: '6px 12px 6px 6px', borderStyle: 'dashed' }}
                        >
                          <PottedPlant species={p.species} stage={stage} size={34} potLevel={p.level} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--leaf)' }}>{p.emoji} {p.name}</span>
                          <span className="gb-chip-act">+ 배치</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="gb-panel-sep" />

            <button onClick={resetGarden} className="rt-btn rt-btn--sm rt-btn--ghost" style={{ alignSelf: 'flex-start' }}>
              ↺ 정원 초기화
            </button>
          </div>
        )}
      </div>

      {/* 화분 그리드 */}
      <div className="rt-section-head" style={{ marginBottom: 0 }}>
        <div className="rt-sh-top">
          <span className="rt-tag"><RtIcon name="leaf" /> 화분</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <span className="rt-badge">전체 {pots.length}</span>
            <span className="rt-badge rt-badge--leaf">활동 중 {visiblePots.length}</span>
          </div>
        </div>
        <h2 className="rt-h3">키우는 화분</h2>
      </div>

      <div className="rt-grid rt-grid--3 guide-garden-pots">
        {potsLoading && (
          <div className="rt-card" style={{ minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>
            화분 목록을 불러오는 중이에요.
          </div>
        )}

        {!potsLoading && potsError && (
          <div className="rt-card" style={{ minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--berry)', fontSize: 13, textAlign: 'center', lineHeight: 1.6 }}>
            {potsError}
          </div>
        )}

        {!potsLoading && !potsError && pots.length === 0 && (
          <div className="rt-card" style={{ minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13, textAlign: 'center', lineHeight: 1.6 }}>
            아직 생성된 화분이 없어요.<br />새 화분을 만들어 첫 씨앗을 심어보세요.
          </div>
        )}

        {!potsLoading && !potsError && pots.map(p => <PotCard key={p.id} pot={p} onClick={() => onOpenPot(p.id)} />)}

        <div
          role="button"
          tabIndex={0}
          onClick={() => setShowCreatePot(true)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowCreatePot(true); } }}
          className="rt-card gb-add-card"
        >
          <div className="gb-add-bubble"><RtIcon name="plus" /></div>
          <div style={{ textAlign: 'center' }}>
            <div className="rt-h3" style={{ margin: 0, fontSize: 15 }}>새 화분 만들기</div>
            <div className="rt-small rt-muted" style={{ marginTop: 4 }}>새로운 주제로 씨앗을 심어요</div>
          </div>
        </div>
      </div>

      {!potsLoading && !potsError && pots.length > 0 && (
        <div className="rt-card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 40, height: 40, flex: '0 0 auto', borderRadius: 8, background: 'var(--paper-2)', color: 'var(--leaf-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
            {allPotsWatered ? '✨' : '🌱'}
          </div>
          <div className="rt-small" style={{ flex: 1 }}>
            {allPotsWatered ? (
              <>오늘 모든 화분에 물주기를 마쳤어요. <b style={{ color: 'var(--leaf)' }}>꾸준한 기록이 정원을 더 깊게 자라게 하고 있어요.</b></>
            ) : (
              <><b style={{ color: 'var(--leaf)' }}>{attentionPot.name} 화분</b>에 오늘의 TIL을 남기면 경험치가 쌓이고 식물이 자라요.</>
            )}
          </div>
          {allPotsWatered ? (
            <span className="rt-badge rt-badge--leaf">오늘 루틴 완료</span>
          ) : (
            <button className="rt-btn rt-btn--sm" onClick={() => onOpenPot(attentionPot.id)}>화분으로 이동</button>
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
      });
      const freshPots = await getPots().catch(() => []);
      const createdWithPlant = freshPots.find(p => p.id === created.id) ?? created;
      onCreated(createdWithPlant);
      onClose();
    } catch (err) {
      setError(err?.body?.message ?? '화분을 만들지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  const fieldLabel = { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--leaf-2)', fontFamily: 'var(--font-pixel)', letterSpacing: '1px', textTransform: 'uppercase' };
  const fieldInput = (invalid) => ({
    borderRadius: 6,
    border: `2px solid ${invalid ? 'var(--berry)' : 'var(--line-strong)'}`,
    background: 'var(--paper)',
    outline: 'none',
    fontSize: 13.5,
    fontFamily: 'var(--font-pixel)',
    color: 'var(--leaf)',
  });

  return (
    <div
      className="rt-app"
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(28, 32, 18, 0.42)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
      onClick={loading ? undefined : onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={e => e.stopPropagation()}
        className="rt-card"
        style={{ width: 460, background: 'var(--paper-card)' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <span className="rt-tag"><RtIcon name="sprout" /> NEW POT</span>
            <h2 className="rt-h3" style={{ margin: '10px 0 0' }}>새 화분 만들기</h2>
            <div className="rt-small rt-muted" style={{ marginTop: 6, lineHeight: 1.6 }}>
              새로운 학습 주제를 정하고 기본 씨앗을 심어요.
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={loading} className="rt-btn rt-btn--ghost rt-btn--sm" style={{ flexShrink: 0, opacity: loading ? 0.5 : 1 }}>
            <RtIcon name="xmark" />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 22 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <span style={fieldLabel}>
              <span>화분 제목</span>
              <span style={{ color: title.length > POT_TITLE_MAX_LENGTH ? 'var(--berry)' : 'var(--muted)' }}>{title.length}/{POT_TITLE_MAX_LENGTH}</span>
            </span>
            <input
              value={title}
              onChange={e => setTitle(e.target.value.slice(0, POT_TITLE_MAX_LENGTH))}
              maxLength={POT_TITLE_MAX_LENGTH}
              placeholder="예: Spring 공부"
              disabled={loading}
              autoFocus
              style={{ height: 42, padding: '0 13px', ...fieldInput(titleInvalid && title.length > 0) }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <span style={fieldLabel}>
              <span>소개글</span>
              <span style={{ color: descriptionInvalid ? 'var(--berry)' : 'var(--muted)' }}>{descriptionLength}/{POT_DESCRIPTION_MAX_LENGTH}</span>
            </span>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value.slice(0, POT_DESCRIPTION_MAX_LENGTH))}
              maxLength={POT_DESCRIPTION_MAX_LENGTH}
              placeholder="이 화분에 어떤 기록을 모을지 적어보세요."
              disabled={loading}
              style={{ height: 82, resize: 'none', padding: '12px 13px', lineHeight: 1.6, ...fieldInput(descriptionInvalid) }}
            />
          </label>
        </div>

        {error && (
          <div className="rt-small" style={{ marginTop: 16, padding: '10px 12px', borderRadius: 6, background: 'var(--berry-soft)', border: '1px solid var(--berry)', color: 'var(--berry)', lineHeight: 1.5 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button type="button" className="rt-btn rt-btn--ghost" style={{ flex: 1 }} onClick={onClose} disabled={loading}>
            취소
          </button>
          <button type="submit" className="rt-btn rt-btn--primary" style={{ flex: 1 }} disabled={loading || titleInvalid || descriptionInvalid}>
            {loading ? '만드는 중...' : '씨앗 심기'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================
// Pot Detail Screen
// ============================
function PotDetailBackButton({ onBack, style, className }) {
  return (
    <button
      type="button"
      onClick={() => { playSfx('nav'); onBack?.(); }}
      className={`rt-btn rt-btn--sm${className ? ` ${className}` : ''}`}
      style={style}
    >
      <RtIcon name="arrow" style={{ transform: 'rotate(180deg)' }} />
      정원으로 돌아가기
    </button>
  );
}

const TIL_PAGE_SIZE_OPTIONS = [5, 10, 20];

function TilPagination({ tilPage, tilTotalPages, onPageChange }) {
  if (tilTotalPages <= 1) return null;

  const SIBLING = 1;
  const pages = [];
  const addPage = (i) => pages.push({ type: 'page', i });
  const addEllipsis = (key) => pages.push({ type: 'ellipsis', key });

  // 페이지를 옮겨도 슬롯 개수를 항상 동일하게 유지해 페이저 폭이 출렁이지 않게 한다.
  // (양끝 고정 2 + 말줄임 2 + 현재±SIBLING)
  const totalSlots = SIBLING * 2 + 5;
  if (tilTotalPages <= totalSlots) {
    for (let i = 0; i < tilTotalPages; i++) addPage(i);
  } else {
    const last = tilTotalPages - 1;
    const leftSibling = Math.max(tilPage - SIBLING, 1);
    const rightSibling = Math.min(tilPage + SIBLING, last - 1);
    const showLeftDots = leftSibling > 2;
    const showRightDots = rightSibling < last - 2;
    const edgeCount = 3 + SIBLING * 2;

    if (!showLeftDots && showRightDots) {
      for (let i = 0; i < edgeCount; i++) addPage(i);
      addEllipsis('right');
      addPage(last);
    } else if (showLeftDots && !showRightDots) {
      addPage(0);
      addEllipsis('left');
      for (let i = last - edgeCount + 1; i <= last; i++) addPage(i);
    } else {
      addPage(0);
      addEllipsis('left');
      for (let i = leftSibling; i <= rightSibling; i++) addPage(i);
      addEllipsis('right');
      addPage(last);
    }
  }

  return (
    <div
      role="navigation"
      aria-label="TIL 페이지 네비게이션"
      className="gb-pager"
    >
      <button type="button" aria-label="이전 페이지" disabled={tilPage === 0}
        onClick={() => onPageChange(tilPage - 1)} className="gb-page-btn">
        ‹
      </button>

      {pages.map(item => {
        if (item.type === 'ellipsis') {
          return <span key={`ellipsis-${item.key}`} className="gb-page-ellipsis">…</span>;
        }
        const i = item.i;
        const active = tilPage === i;
        return (
          <button
            key={i} type="button"
            aria-label={`${i + 1}페이지`}
            aria-current={active ? 'page' : undefined}
            onClick={() => onPageChange(i)}
            className={`gb-page-btn${active ? ' is-active' : ''}`}
          >
            {i + 1}
          </button>
        );
      })}

      <button type="button" aria-label="다음 페이지" disabled={tilPage >= tilTotalPages - 1}
        onClick={() => onPageChange(tilPage + 1)} className="gb-page-btn">
        ›
      </button>
    </div>
  );
}

function PotDetailSidebar({ pot, stage, dashboard, onStartTil, onShowHarvest, onShowEditPot }) {
  const speciesInfo = PIXEL_SPECIES[pot.species];
  const monName = speciesInfo?.stages[stage]?.name;
  const rareTheme = rareThemeOf(pot.species);
  const isRare = rareTheme !== null;
  const potTier = getPotTier(pot.level);
  const detailSubText = dashboard
    ? `최근 물주기 ${formatDateTime(pot.lastWateredAt)} · 누적 ${pot.totalExp} EXP`
    : `${pot.createdAt} 생성 · 누적 ${Math.floor(pot.tilCount * 850)}자`;
  const potExperienceText = formatPotExperience(pot);
  const plantGrowthPercent = formatPlantGrowthPercent(pot);
  const plantStageStatus = getPlantStageStatus(stage);
  const harvestStatus = getHarvestStatus(pot.canHarvest);
  const stages = ['seed', 'sprout', 'leaf', 'bloom', 'full'];

  return (
    <>
      {/* 프로필 카드 */}
      <div className="rt-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* 식물 무대 (미니 LCD) */}
        <div className={`gb-pot-stage guide-pot-detail-plant${isRare ? ' gb-pot-stage--rare' : ''}`}>
          {isRare && <RareStageFx theme={rareTheme} />}
          <span className="gb-pot-stage-badge rt-badge rt-badge--leaf"><RtIcon name="book" /> {pot.tilCount} TIL</span>
          <div style={{ paddingBottom: 26, position: 'relative', zIndex: 1 }}>
            <PottedPlant species={pot.species} stage={stage} size={140} glow={isRare} potLevel={pot.level} />
          </div>
          {monName && <span className="gb-pot-stage-name">{monName}</span>}
        </div>

        {/* 배지 + 화분 수정 */}
        <div className="guide-pot-detail-info" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', minWidth: 0 }}>
            <span className="rt-badge">Lv.{pot.level}</span>
            <span className="rt-badge rt-badge--leaf">{potTier.label}</span>
            <span className={`rt-badge${isRare ? ' rt-badge--sky' : ''}`}>{isRare ? '✦ 희귀종' : '일반종'}</span>
          </div>
          {dashboard && (
            <button
              type="button"
              className="rt-btn rt-btn--ghost rt-btn--sm"
              onClick={() => { playSfx('nav'); onShowEditPot(); }}
            >
              <RtIcon name="gear" /> 화분 수정
            </button>
          )}
        </div>

        {/* 스탯 목록 */}
        <div className="gb-stat-list guide-pot-detail-growth">
          {[
            { label: '화분 경험치', value: potExperienceText, progress: pot.levelProgress },
            { label: '식물 상태', value: `${plantStageStatus} · ${plantGrowthPercent}%`, tone: 'on' },
            { label: '수확 가능 여부', value: harvestStatus, tone: pot.canHarvest ? 'on' : 'off' },
          ].map(item => (
            <div key={item.label} className="gb-stat-row">
              <div className="gb-stat-top">
                <span className="gb-stat-k">{item.label}</span>
                <span className={`gb-stat-v${item.tone === 'on' ? ' is-on' : item.tone === 'off' ? ' is-off' : ''}`}>
                  {item.value}
                </span>
              </div>
              {typeof item.progress === 'number' && (
                <div className="gb-prog" style={{ marginTop: 8 }}>
                  <i style={{ width: `${Math.min(100, Math.max(0, item.progress * 100))}%` }} />
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ fontSize: 11.5, color: 'var(--muted)', fontFamily: '"Galmuri9", var(--font-pixel)' }}>
          {detailSubText}
        </div>

        {/* 액션 */}
        <div className="guide-pot-detail-actions" style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="rt-btn rt-btn--accent" style={{ flex: 1 }} onClick={() => { playSfx('confirm'); onStartTil(); }}>
            <RtIcon name="drop" /> TIL 작성하고 물주기
          </button>
          <button
            type="button"
            className={`rt-btn${pot.canHarvest ? ' rt-btn--primary' : ''}`}
            onClick={() => { playSfx('confirm'); onShowHarvest(); }}
            disabled={dashboard && !pot.canHarvest}
            style={dashboard && !pot.canHarvest ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
          >
            <RtIcon name="trophy" /> 수확
          </button>
        </div>
      </div>

      {/* 진화 계통 */}
      <div className="rt-card guide-pot-detail-evolution">
        <span className="rt-tag"><RtIcon name="leaf" /> 진화 계통</span>
        <div className="gb-evo" style={{ marginTop: 14 }}>
          {stages.map(s => {
            const active = s === stage;
            const reached = stages.indexOf(s) <= stages.indexOf(stage);
            return (
              <div key={s} className={`gb-evo-cell${active ? ' is-active' : ''}`}>
                <div className={`gb-evo-tile${reached ? ' is-reached' : ' is-locked'}${active ? ' is-active' : ''}${active && isRare ? ' is-rare' : ''}`}>
                  <PixelPlant species={pot.species} stage={s} size={34} locked={!reached} />
                </div>
                <div className="gb-evo-name">{speciesInfo?.stages[s]?.name || STAGE_META[s].label}</div>
                <div className="gb-evo-min">{STAGE_META[s].min}+</div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function PotDetailScreen({ potId, refreshKey = 0, onBack, onStartTil, onOpenTil }) {
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
  const [tilSearchQuery, setTilSearchQuery] = useState('');
  const [selectedTilTag, setSelectedTilTag] = useState(null);
  const [tilPage, setTilPage] = useState(0);
  const [tilPageSize, setTilPageSize] = useState(10);
  const [tilTotalPages, setTilTotalPages] = useState(0);

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
  }, [potId, user?.userId, refreshKey, tilPage, tilPageSize]);

  const refreshDashboard = useCallback(async () => {
    const updatedDashboard = await getGardenDashboard(potId);
    setDashboard(updatedDashboard);
  }, [potId]);

  const pot = dashboard ? toDashboardPot(dashboard) : fallbackPot;

  if (dashboardLoading && !pot) {
    return (
      <div className="rt-app gb-pot-page" style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', minHeight: '100%' }}>
        <div className="rt-page-head gb-pot-head">
          <div>
            <span className="rt-tag"><RtIcon name="leaf" /> ROOTIN · 화분 상세</span>
            <h1 className="rt-page-title">화분 상세 <span className="rt-title-cursor" /></h1>
          </div>
          <PotDetailBackButton onBack={onBack} />
        </div>
        <div className="rt-card gb-note" style={{ textAlign: 'center', color: 'var(--muted)' }}>
          화분 대시보드를 불러오는 중이에요.
        </div>
      </div>
    );
  }

  if (!pot) {
    return (
      <div className="rt-app gb-pot-page" style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', minHeight: '100%' }}>
        <div className="rt-page-head gb-pot-head">
          <div>
            <span className="rt-tag"><RtIcon name="leaf" /> ROOTIN · 화분 상세</span>
            <h1 className="rt-page-title">화분 상세 <span className="rt-title-cursor" /></h1>
          </div>
          <PotDetailBackButton onBack={onBack} />
        </div>
        <div className="rt-card" style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
          <h2 className="rt-h3" style={{ margin: 0 }}>화분 정보를 불러오지 못했어요</h2>
          <div className="gb-note" style={{ marginTop: 8, color: 'var(--muted)' }}>
            {dashboardError ?? '목록에서 화분을 다시 선택해 주세요.'}
          </div>
        </div>
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
    <div className="rt-app gb-pot-page" style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', minHeight: '100%' }}>

      {/* 게임 HUD — 화분 상태 요약 */}
      <div className="rt-hud">
        <div className="rt-hud-l">
          <RtIcon name="sprout" /> POT : {pot.name} · <span className="rt-hud-lv">Lv.{pot.level}</span>
        </div>
        <div className="rt-hud-r">
          <span className="rt-hud-grp"><RtIcon name="book" /> TIL {displayedTilCount}</span>
          <span className="rt-hud-sep" />
          <span className="rt-hud-grp"><RtIcon name="drop" /> {pot.waterToday ? '물주기 완료' : '물주기 전'}</span>
          <span className="rt-hud-sep" />
          <span className="rt-hud-grp"><RtIcon name="leaf" /> {getPlantStageStatus(stage)}</span>
          <span className="rt-hud-sep" />
          <span className="rt-hud-grp"><RtIcon name="trophy" /> {pot.canHarvest ? '수확 가능' : '성장 중'}</span>
        </div>
      </div>

      {/* 페이지 헤더 + 뒤로가기 */}
      <div className="rt-page-head gb-pot-head">
        <div style={{ minWidth: 0 }}>
          <span className="rt-tag"><RtIcon name="leaf" /> ROOTIN · 화분 상세</span>
          <h1 className="rt-page-title">
            <span style={POT_TITLE_PREVIEW_STYLE}>{pot.emoji} {pot.name}</span>
            <span className="rt-title-cursor" />
          </h1>
          <p className="rt-page-sub" style={{ ...POT_DESCRIPTION_PREVIEW_STYLE, maxWidth: 640 }}>{pot.intro}</p>
        </div>
        <PotDetailBackButton onBack={onBack} />
      </div>

      {/* 2단 그리드 — 프로필(좌, 고정) + 기록(우) */}
      <div className="gb-pot-grid">
        <div className="gb-pot-aside">
          <PotDetailSidebar
            pot={pot}
            stage={stage}
            dashboard={dashboard}
            onStartTil={handleStartTil}
            onShowHarvest={() => setShowHarvest(true)}
            onShowEditPot={() => setShowEditPot(true)}
          />
        </div>

        <div className="gb-pot-records guide-pot-detail-records">
          {/* 기록 헤더 + 컨트롤(페이지 크기 + 검색) */}
          <div className="rt-section-head">
            <div className="rt-sh-top">
              <span className="rt-tag"><RtIcon name="book" /> 이 화분의 기록</span>
              <div className="gb-rec-controls">
                {/* 페이지 크기 */}
                <div className="rt-seg" role="group" aria-label="페이지 크기 선택">
                  {TIL_PAGE_SIZE_OPTIONS.map(size => (
                    <button
                      key={size}
                      type="button"
                      aria-pressed={tilPageSize === size}
                      className={`rt-seg-item${tilPageSize === size ? ' is-active' : ''}`}
                      onClick={() => {
                        playSfx('toggle');
                        setTilPageSize(size);
                        setTilPage(0);
                      }}
                    >
                      {size}개
                    </button>
                  ))}
                </div>
                {/* 검색 */}
                <div className="gb-search">
                  <span className="gb-search-ico"><RtIcon name="search" /></span>
                  <input
                    value={tilSearchQuery}
                    onChange={e => setTilSearchQuery(e.target.value)}
                    placeholder="제목, 본문, 태그 검색"
                    aria-label="TIL 검색"
                  />
                  {tilSearchQuery && (
                    <button
                      type="button"
                      className="gb-search-clear"
                      onClick={() => setTilSearchQuery('')}
                      aria-label="검색어 지우기"
                    >
                      <RtIcon name="xmark" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <h2 className="rt-h3">TIL {displayedTilCount}개</h2>
          </div>

          {/* 태그 필터 */}
          {(suggestedTilTags.length > 0 || hasTilFilter) && (
            <div className="gb-tags" style={{ margin: '-2px 0 14px' }}>
              <span className="rt-eyebrow" style={{ margin: 0 }}>태그</span>
              {suggestedTilTags.map(([tag, count]) => {
                const active = selectedTilTag === tag;
                return (
                  <button
                    key={tag}
                    type="button"
                    className={`gb-tag-chip${active ? ' is-active' : ''}`}
                    onClick={() => setSelectedTilTag(active ? null : tag)}
                    aria-label={`#${tag} 태그, TIL ${count}개`}
                    title={`#${tag} · TIL ${count}개`}
                  >
                    <span className="gb-tag-name">#{tag}</span>
                    <span className="gb-tag-count"><RtIcon name="book" /> {count}</span>
                  </button>
                );
              })}
              {hasTilFilter && (
                <>
                  <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{visibleTils.length}개 표시</span>
                  <button
                    type="button"
                    className="gb-tag-reset"
                    onClick={() => {
                      setTilSearchQuery('');
                      setSelectedTilTag(null);
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

          <div
            className="gb-til-list"
            data-loading={dashboard && tilsLoading && displayedTils.length > 0 ? 'true' : undefined}
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            {dashboard && tilsLoading && displayedTils.length === 0 && (
              <div className="rt-card gb-note">이 화분의 TIL 목록을 불러오는 중이에요.</div>
            )}
            {dashboard && !tilsLoading && tilsError && (
              <div className="rt-card gb-note gb-note--error">{tilsError}</div>
            )}
            {dashboard && !tilsLoading && !tilsError && displayedTils.length === 0 && (
              <div className="rt-card gb-note">
                아직 이 화분에 작성된 TIL이 없어요.<br />
                TIL을 작성하면 이곳에 최신순으로 표시됩니다.
              </div>
            )}
            {dashboard && !tilsLoading && !tilsError && displayedTils.length > 0 && visibleTils.length === 0 && (
              <div className="rt-card gb-note">
                검색 결과가 없어요.<br />
                검색어를 바꾸거나 선택한 태그를 해제해 보세요.
              </div>
            )}
            {visibleTils.map(t => (
              <div
                key={t.id}
                role="button"
                tabIndex={0}
                className="rt-card gb-til-card"
                onClick={() => onOpenTil && onOpenTil(t.id)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenTil && onOpenTil(t.id); } }}
              >
                <div className="gb-til-meta">{t.date} · {t.chars}자</div>
                <div className="gb-til-title">{t.title}</div>
                <div className="gb-til-excerpt">{t.excerpt}</div>
                {t.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 5, marginTop: 10, flexWrap: 'wrap' }}>
                    {t.tags.map(tag => <span key={tag} className="gb-til-tag">#{tag}</span>)}
                  </div>
                )}
              </div>
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

// 화분의 TIL을 모달이 아닌 전용 풀페이지로 읽는 화면.
// 본문은 저장된 Tiptap HTML을 .til-reader로 렌더해 줄바꿈·서식을 그대로 보여준다.
export function TilDetailScreen({ tilId, onBack, onEdit, onDeleted }) {
  const [til, setTil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setConfirmDelete(false);
    setDeleteError(null);
    getTil(tilId)
      .then(detail => { if (active) setTil(toTilListItem(detail)); })
      .catch(() => { if (active) setError('TIL을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tilId]);

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteTil(tilId);
      onDeleted && onDeleted();
    } catch (err) {
      setDeleteError(err?.body?.message ?? 'TIL을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.');
      setDeleting(false);
    }
  };

  const contentHtml = til?.content?.trim();

  return (
    <div className="rt-app gb-til-page" style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', minHeight: '100%' }}>
      {/* 헤더 — 제목/메타/태그를 본문과 같은 폭으로, 아래 구분선으로 본문과 분리 */}
      <div className="gb-til-col" style={{ borderBottom: '2px dotted var(--line-strong)', paddingBottom: 18 }}>
        <span className="rt-tag"><RtIcon name="book" /> ROOTIN · TIL 기록</span>
        <h1 className="rt-page-title" style={{ marginTop: 10 }}>
          <span style={{ wordBreak: 'keep-all' }}>
            {loading ? 'TIL 불러오는 중' : (til?.title ?? 'TIL')}
            <span className="rt-title-cursor" />
          </span>
        </h1>
        {til && !error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8, color: 'var(--muted)', fontSize: 12, fontFamily: '"Galmuri9", var(--font-pixel)' }}>
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
        )}
        {til && !error && til.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
            {til.tags.map(tag => <span key={tag} className="gb-til-tag">#{tag}</span>)}
          </div>
        )}
      </div>

      {/* 본문 — 카드 없이 페이지 배경 위, 에디터와 같은 폭 */}
      <div className="gb-til-col">
        {loading ? (
          <div style={{ color: 'var(--muted)', fontSize: 14 }}>TIL 내용을 불러오는 중이에요.</div>
        ) : error ? (
          <div className="gb-note gb-note--error">{error}</div>
        ) : contentHtml ? (
          <TilContentView content={contentHtml} />
        ) : (
          <div style={{ color: 'var(--muted)' }}>{til?.excerpt}</div>
        )}
      </div>

      {/* 우측 플로팅 액션 바 — 스크롤을 따라다니는 수정/삭제/돌아가기 (삭제 확인도 이 안에서) */}
      {til && !error && (
        <div className="gb-til-fab" role="group" aria-label="TIL 액션">
          {confirmDelete ? (
            <>
              <span className="gb-til-fab-msg">삭제할까요?</span>
              <button type="button" className="gb-til-fab-btn is-danger" onClick={() => { playSfx('delete'); handleDeleteConfirm(); }} disabled={deleting}>
                <RtIcon name="check" size={15} /><span>{deleting ? '삭제중' : '확인'}</span>
              </button>
              <button type="button" className="gb-til-fab-btn" onClick={() => { playSfx('cancel'); setConfirmDelete(false); setDeleteError(null); }} disabled={deleting}>
                <RtIcon name="xmark" size={15} /><span>취소</span>
              </button>
              {deleteError && <span className="gb-til-fab-err">{deleteError}</span>}
            </>
          ) : (
            <>
              <button type="button" className="gb-til-fab-btn is-edit" onClick={() => { playSfx('confirm'); onEdit && onEdit(til); }}>
                <RtIcon name="gear" size={15} /><span>수정</span>
              </button>
              <button type="button" className="gb-til-fab-btn is-danger" onClick={() => { playSfx('nav'); setConfirmDelete(true); }}>
                <RtIcon name="xmark" size={15} /><span>삭제</span>
              </button>
              <button type="button" className="gb-til-fab-btn" onClick={() => { playSfx('nav'); onBack && onBack(); }}>
                <RtIcon name="arrow" size={15} style={{ transform: 'rotate(180deg)' }} /><span>뒤로</span>
              </button>
            </>
          )}
        </div>
      )}
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
    <div className="gb-modal-overlay" onClick={loading ? undefined : onClose}>
      <div onClick={e => e.stopPropagation()} className="gb-modal-card gb-modal-card--danger" style={{ maxWidth: 460 }}>
        <div className="gb-modal-head">
          <div>
            <span className="rt-tag" style={{ background: 'var(--berry)' }}><RtIcon name="xmark" /> 화분 삭제</span>
            <h2 className="rt-h3" style={{ margin: '10px 0 0', fontSize: 20 }}>
              {pot.name} 화분을 삭제할까요?
            </h2>
            <div style={{ fontSize: 12.5, color: 'var(--muted-2)', marginTop: 8, lineHeight: 1.6 }}>
              삭제하면 이 화분에 작성된 TIL도 함께 삭제되며, 삭제한 데이터는 복구할 수 없어요.
            </div>
          </div>
          <button type="button" className="gb-modal-x" onClick={onClose} disabled={loading}>
            <RtIcon name="xmark" />
          </button>
        </div>

        <div className="gb-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="gb-modal-warn">
            <b>{pot.tilCount}개의 TIL</b>이 함께 삭제됩니다.
          </div>
          {error && <div className="gb-modal-warn">{error}</div>}
        </div>

        <div className="gb-modal-foot">
          <button type="button" className="rt-btn rt-btn--ghost" style={{ flex: 1 }} onClick={() => { playSfx('cancel'); onClose(); }} disabled={loading}>
            취소
          </button>
          <button type="button" className="rt-btn rt-btn--danger" style={{ flex: 1 }} onClick={() => { playSfx('delete'); handleDelete(); }} disabled={loading}>
            {loading ? '삭제 중...' : '삭제'}
          </button>
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
    <div className="gb-modal-overlay" onClick={loading ? undefined : onClose}>
      <form onSubmit={handleSubmit} onClick={e => e.stopPropagation()} className="gb-modal-card" style={{ maxWidth: 460 }}>
        <div className="gb-modal-head">
          <div>
            <span className="rt-tag"><RtIcon name="gear" /> 화분 수정</span>
            <h2 className="rt-h3" style={{ margin: '10px 0 0', fontSize: 20 }}>
              화분 정보 수정
            </h2>
            <div style={{ fontSize: 12.5, color: 'var(--muted-2)', marginTop: 8, lineHeight: 1.6 }}>
              화분의 학습 주제와 소개글을 다듬을 수 있어요.
            </div>
          </div>
          <button type="button" className="gb-modal-x" onClick={onClose} disabled={loading}>
            <RtIcon name="xmark" />
          </button>
        </div>

        <div className="gb-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label className="gb-field">
            <span className="gb-field-label">
              <span>화분 제목</span>
              <span className={`gb-field-count${title.length > POT_TITLE_MAX_LENGTH ? ' is-over' : ''}`}>{title.length}/{POT_TITLE_MAX_LENGTH}</span>
            </span>
            <input
              className={`gb-input${titleInvalid && title.length > 0 ? ' is-invalid' : ''}`}
              value={title}
              onChange={e => setTitle(e.target.value.slice(0, POT_TITLE_MAX_LENGTH))}
              maxLength={POT_TITLE_MAX_LENGTH}
              disabled={loading}
              autoFocus
            />
          </label>

          <label className="gb-field">
            <span className="gb-field-label">
              <span>소개글</span>
              <span className={`gb-field-count${descriptionInvalid ? ' is-over' : ''}`}>{description.length}/{POT_DESCRIPTION_MAX_LENGTH}</span>
            </span>
            <textarea
              className={`gb-textarea${descriptionInvalid ? ' is-invalid' : ''}`}
              value={description}
              onChange={e => setDescription(e.target.value.slice(0, POT_DESCRIPTION_MAX_LENGTH))}
              maxLength={POT_DESCRIPTION_MAX_LENGTH}
              disabled={loading}
              style={{ height: 82 }}
            />
          </label>

          {error && <div className="gb-modal-warn">{error}</div>}
        </div>

        <div className="gb-modal-foot" style={{ justifyContent: 'space-between' }}>
          <button type="button" className="rt-btn rt-btn--danger" onClick={() => { playSfx('delete'); onDeleteRequest(); }} disabled={loading}>
            화분 삭제
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="rt-btn rt-btn--ghost" onClick={() => { playSfx('cancel'); onClose(); }} disabled={loading}>
              취소
            </button>
            <button type="submit" className="rt-btn rt-btn--primary" onClick={() => playSfx('confirm')} disabled={loading || titleInvalid || descriptionInvalid}>
              {loading ? '저장 중...' : '저장'}
            </button>
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
      <div style={{ fontSize: 44, marginBottom: 10 }}>🎉</div>
      <span className="rt-tag"><RtIcon name="trophy" /> 수확 완료</span>
      <h2 className="rt-h3" style={{ margin: '10px 0 0', fontSize: 20 }}>
        {result.harvestedPlantName} 수확!
      </h2>
      <div style={{
        margin: '18px 0', padding: 16, background: 'var(--paper-warm)',
        border: '1px solid var(--line-strong)', borderRadius: 'var(--r-chip)',
        display: 'flex', flexDirection: 'column', gap: 10,
        fontSize: 13, color: 'var(--text-body)', textAlign: 'left',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>수확한 식물</span>
          <b style={{ color: 'var(--leaf)' }}>
            {result.harvestedPlantName}
            <span style={{ fontSize: 11, marginLeft: 6, color: result.harvestedRarity === '희귀' ? 'var(--sky)' : 'var(--leaf-2)' }}>
              {result.harvestedRarity === '희귀' ? '✦ 희귀종' : '일반종'}
            </span>
          </b>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>수확 레벨</span>
          <b style={{ color: 'var(--leaf)' }}>Lv.{result.harvestedLevel}</b>
        </div>
        <div style={{ borderTop: '2px dotted var(--line-strong)', paddingTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>새로 심어진 씨앗</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PottedPlant species={nextSpecies} stage="seed" size={36} glow={isNextRare} potLevel={potLevel} />
            <b style={{ color: isNextRare ? 'var(--sky)' : 'var(--leaf-2)' }}>
              {isNextRare ? '✦ ' : ''}{result.nextPlantName}
            </b>
          </div>
        </div>
      </div>
      <button type="button" className="rt-btn rt-btn--primary" style={{ width: '100%' }} onClick={() => { playSfx('confirm'); onClose(); }}>확인</button>
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
    <div className="gb-modal-overlay" onClick={result ? undefined : onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className="gb-modal-card"
        style={{ maxWidth: 480, padding: '28px 26px', textAlign: 'center', display: 'block' }}
      >
        {result ? (
          <HarvestResult result={result} onClose={onClose} potLevel={pot.level} />
        ) : (
          /* 수확 확인 화면 */
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <PottedPlant species={pot.species} stage={pot.stage ?? 'full'} size={132} glow={isRareSpecies(pot.species)} potLevel={pot.level} />
            </div>
            <span className="rt-tag"><RtIcon name="trophy" /> 수확하기</span>
            <h2 className="rt-h3" style={{ margin: '10px 0 0', fontSize: 20 }}>
              {pot.emoji} {pot.name}의 식물을 수확할까요?
            </h2>
            <div style={{ fontSize: 13, color: 'var(--text-body)', marginTop: 8, lineHeight: 1.6 }}>
              수확하면 식물 도감에 기록되고, 새로운 씨앗이 심어져요.<br />
              다음 씨앗은 일반(90%) 또는 희귀(10%) 중 랜덤으로 배정됩니다.
            </div>
            <div className="gb-modal-info" style={{ margin: '18px 0' }}>
              <span>화분 Lv.<b style={{ color: 'var(--leaf)' }}>{pot.level}</b></span>
              <span>총 <b style={{ color: 'var(--leaf)' }}>{pot.tilCount} TIL</b></span>
            </div>
            {error && <div className="gb-modal-warn" style={{ marginBottom: 14, textAlign: 'left' }}>{error}</div>}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button type="button" className="rt-btn rt-btn--ghost" style={{ flex: 1 }} onClick={() => { playSfx('cancel'); onClose(); }} disabled={loading}>
                취소
              </button>
              <button type="button" className="rt-btn rt-btn--accent" style={{ flex: 1 }} onClick={() => { playSfx('confirm'); handleHarvest(); }} disabled={loading}>
                {loading ? '수확 중...' : '새 씨앗 심기 🌱'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export { GardenScreen, PotDetailScreen, GardenScene };
