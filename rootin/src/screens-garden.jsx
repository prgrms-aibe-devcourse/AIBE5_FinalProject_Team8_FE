import { useState, useEffect, useRef } from 'react';
import { POTS, GARDEN_THEMES, DEFAULT_GARDEN_LAYOUT, DEX, TILS } from './data.jsx';
import { useUser } from './context/UserContext.jsx';
import { Icon, Pill, Btn, Card, SectionHeader, ProgressBar } from './ui.jsx';
import { PixelPlant, PIXEL_SPECIES } from './pixel-plants.jsx';
import { tilCountToStage, STAGE_META } from './plants.jsx';

// Garden + Pot Detail screens — pixel-art edition with 정원 꾸미기 mode

// ============================
// Pot card (used in grid)
// ============================
function PotCard({ pot, onClick }) {
  const stage = tilCountToStage(pot.tilCount);
  const stageMeta = STAGE_META[stage];
  const rare = pot.species === 'moonlight';
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
          <PixelPlant species={pot.species} stage={stage} size={110} />
        </div>
      </div>

      <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.6, minHeight: 36 }}>{pot.intro}</div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-3)' }}>
          <span>다음 단계까지 {Math.max(0, stageMeta.next - pot.tilCount)} TIL</span>
          <span style={{ color: 'var(--moss-2)' }}>{pot.tilCount} / {stageMeta.next}</span>
        </div>
        <ProgressBar value={pot.tilCount / stageMeta.next} />
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
        const stage = tilCountToStage(pot.tilCount);
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
              <PixelPlant species={pot.species} stage={stage} size={size} glow={pot.species === 'moonlight'} />
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

  return (
    <div style={{ padding: 32, maxWidth: 1280, margin: '0 auto' }}>

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
              4개의 화분이 자라고 있어요. 오늘 <b style={{ color: 'var(--moss-2)' }}>2개</b>의 화분에 물을 줬어요.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
            <Btn variant="secondary" size="md" icon={Icon.plus}>새 화분</Btn>
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
            pots={POTS}
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
                      {POTS.filter(p => hiddenPots[p.id]).map(p => {
                        const stage = tilCountToStage(p.tilCount);
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
                            <PixelPlant species={p.species} stage={stage} size={32} />
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
          <Pill>전체 4</Pill>
          <Pill tone="green">활동 중 3</Pill>
        </div>
      } />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
        {POTS.map(p => <PotCard key={p.id} pot={p} onClick={() => onOpenPot(p.id)} />)}

        <Card padding={20} hoverable style={{
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

      <div style={{
        marginTop: 28, padding: '16px 22px',
        background: '#fff', border: '0.5px solid var(--rule)',
        borderRadius: 12,
        display: 'flex', alignItems: 'center', gap: 18,
      }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--paper-2)', color: 'var(--moss-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🌱</div>
        <div style={{ flex: 1, fontSize: 13, color: 'var(--ink-2)' }}>
          <b style={{ color: 'var(--ink)' }}>운동 화분</b>이 4일째 비어있어요. 한 줄이라도 물을 주면 씨앗이 새싹으로 자라요.
        </div>
        <Btn variant="secondary" size="sm">운동 화분으로 이동</Btn>
      </div>
    </div>
  );
}

// ============================
// Pot Detail Screen
// ============================
function PotDetailScreen({ potId, onBack }) {
  const pot = POTS.find(p => p.id === potId);
  const [showHarvest, setShowHarvest] = useState(false);
  if (!pot) return null;
  const stage = tilCountToStage(pot.tilCount);
  const stageMeta = STAGE_META[stage];
  const tils = TILS.filter(t => t.potId === potId);
  const speciesInfo = PIXEL_SPECIES[pot.species];
  const monName = speciesInfo?.stages[stage]?.name;
  const isRare = pot.species === 'moonlight';

  return (
    <div style={{ padding: 32, maxWidth: 1280, margin: '0 auto' }}>
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
                <Pill tone={isRare ? 'navy' : 'green'}>{isRare && '✦ '}#{String(POTS.indexOf(pot) + 1).padStart(3, '0')}</Pill>
                <Pill>{pot.tilCount} TIL</Pill>
              </div>
              <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center' }}>
                <PixelPlant species={pot.species} stage={stage} size={180} glow={isRare} />
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
                <Pill tone={isRare ? 'navy' : 'default'}>{isRare ? '✦ 희귀종' : '일반종'}</Pill>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                {speciesInfo?.label} · Lv.{pot.level} · {stageMeta.label}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 10, lineHeight: 1.6 }}>{pot.intro}</div>
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-3)' }}>
                  <span>화분 레벨 진척도</span>
                  <span style={{ color: 'var(--moss-2)' }}>{Math.round(pot.levelProgress * 100)}%</span>
                </div>
                <ProgressBar value={pot.levelProgress} />
              </div>
              <div style={{ marginTop: 14, fontSize: 11.5, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                {pot.createdAt} 생성 · 누적 {Math.floor(pot.tilCount * 850)}자
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
                <Btn variant={pot.waterToday ? 'secondary' : 'green'} size="md" icon={Icon.drop} style={{ flex: 1 }}>
                  {pot.waterToday ? '오늘 물 줬어요' : '물 주기 · +1 TIL'}
                </Btn>
                <Btn variant="secondary" size="md" onClick={() => setShowHarvest(true)}>수확</Btn>
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
                    <PixelPlant species={pot.species} stage={stage} size={42} />
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

function HarvestModal({ pot, onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15, 42, 71, 0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
      backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 480, background: '#fff', borderRadius: 18,
        padding: '32px 28px', boxShadow: 'var(--shadow-lg)',
        textAlign: 'center',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
          <PixelPlant species={pot.species} stage="full" size={140} glow={pot.species === 'moonlight'} />
        </div>
        <div className="eyebrow" style={{ color: 'var(--moss-2)' }}>수확하기</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginTop: 6 }}>
          {pot.emoji} {pot.name}의 식물을 수확할까요?
        </h2>
        <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 8, lineHeight: 1.6 }}>
          수확하면 식물 아이템으로 정원에 장식할 수 있어요.<br />
          현재 식물을 유지하거나, 새로운 씨앗을 심을 수 있어요.
        </div>
        <div style={{
          margin: '20px 0',
          padding: '12px 16px',
          background: 'var(--paper-2)',
          borderRadius: 10,
          fontSize: 11.5, color: 'var(--ink-3)',
          fontFamily: 'var(--font-mono)',
          display: 'flex', justifyContent: 'space-around',
        }}>
          <span>수확일 <b style={{ color: 'var(--ink)' }}>2026.05.22</b></span>
          <span>화분 Lv.<b style={{ color: 'var(--ink)' }}>{pot.level}</b></span>
          <span>총 <b style={{ color: 'var(--ink)' }}>{pot.tilCount} TIL</b></span>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <Btn variant="secondary" size="lg" style={{ flex: 1 }} onClick={onClose}>현재 식물 유지</Btn>
          <Btn variant="green" size="lg" style={{ flex: 1 }} onClick={onClose}>새 씨앗 심기</Btn>
        </div>
      </div>
    </div>
  );
}

export { GardenScreen, PotDetailScreen, GardenScene };
