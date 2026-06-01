import { useState, useEffect } from 'react';
import { getPlants } from './api/collection.js';
import { DEX } from './data.jsx';
import { generateSummary, generateQuiz, saveResult, fetchResults, deleteResult } from './api/ai.js';
import { getPots } from './api/pot.js';
import { Icon, Pill, Btn, Card, SectionHeader } from './ui.jsx';
import { PixelPlant, PIXEL_SPECIES } from './pixel-plants.jsx';
import { Plant, RootinLogo, STAGE_META } from './plants.jsx';
import { useUser } from './context/UserContext.jsx';

// Collection (식물도감), AI, Profile, Auth screens

// ============================
// Evolution chain card (pokedex style)
// ============================
function EvoCard({ entry }) {
  const stages = ['seed', 'sprout', 'leaf', 'bloom', 'full'];
  const stageOrder = ['씨앗', '새싹', '잎', '개화', '만개'];
  const stageMap = { '씨앗': 'seed', '새싹': 'sprout', '잎': 'leaf', '개화': 'bloom', '만개': 'full' };
  const reachedIdx = stages.indexOf(entry.currentStage);
  const speciesInfo = PIXEL_SPECIES[entry.species];
  const isHarvested = entry.state === 'harvested';
  const isRare = entry.rarity === 'rare';
  const isSecret = entry.rarity === 'secret';
  const isLocked = entry.state === 'locked';

  if (isLocked) {
    return (
      <div style={{
        position: 'relative',
        background: '#fff', borderRadius: 14,
        border: '0.5px solid #f0c4cc',
        padding: '16px 20px 14px',
        opacity: 0.85,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>#???</span>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-2)' }}>{entry.label}</span>
          </div>
          <Pill tone="pink">🔴 비밀종</Pill>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
          {stages.map((s, i) => (
            <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 6,
                background: '#fcebeb', border: '0.5px solid #f7c1c1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                filter: 'brightness(0.4)',
              }}>
                {i === 0 ? <PixelPlant species="secret" stage="seed" size={42} locked /> : null}
              </div>
              <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>???</div>
            </div>
          ))}
        </div>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 14,
          background: 'rgba(247, 249, 247, 0.85)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <div style={{ fontSize: 20 }}>🔒</div>
          <div style={{ fontSize: 12, color: 'var(--ink-2)', fontFamily: 'var(--font-display)' }}>
            {entry.unlockHint}
          </div>
        </div>
      </div>
    );
  }

  const borderColor = isRare ? '#ccc9f0' : 'var(--rule)';

  return (
    <div style={{
      background: '#fff', borderRadius: 14,
      border: `0.5px solid ${borderColor}`,
      padding: '16px 20px 14px',
    }}>
      {/* meta row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>#{entry.no}</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-display)', whiteSpace: 'nowrap' }}>{entry.label}</span>
          {entry.pot && (
            <span style={{ fontSize: 12, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>
              · {entry.pot.emoji} {entry.pot.name} 화분 {entry.pot.round}회차
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Pill tone={isRare ? 'navy' : 'green'}>{isRare ? '✦ 희귀종' : '일반종'}</Pill>
          {isHarvested
            ? <Pill tone="navy">수확 완료</Pill>
            : <Pill tone="green">{speciesInfo?.stages[entry.currentStage]?.stage} 중</Pill>
          }
        </div>
      </div>

      {/* evolution chain */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, alignItems: 'flex-end' }}>
        {stages.map((s, i) => {
          const passed = i <= reachedIdx;
          const isCurrent = i === reachedIdx && !isHarvested;
          const date = entry.levels[stageOrder[i]];
          const stageName = speciesInfo?.stages[s]?.name || stageOrder[i];

          let bg = '#f7f9f7', border = '0.5px solid var(--rule)';
          if (passed) {
            bg = isRare ? '#eef2fa' : (isHarvested ? '#e6f1fb' : '#eaf3de');
            border = isRare ? '0.5px solid #afa9ec' : (isHarvested ? '0.5px solid #185fa5' : '0.5px solid #c8e0a8');
          }
          if (isCurrent) {
            bg = isRare ? '#eef2fa' : '#e1f5ee';
            border = isRare ? '1.5px solid #534ab7' : '1.5px solid #0f6e56';
          }

          return (
            <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, position: 'relative' }}>
              {i < 4 && (
                <div style={{
                  position: 'absolute', right: -6, top: 22,
                  fontSize: 14, color: 'var(--ink-3)', zIndex: 1,
                }}>›</div>
              )}
              <div style={{
                width: 56, height: 56, borderRadius: 6,
                background: bg, border, position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <PixelPlant species={entry.species} stage={s} size={42} locked={!passed} />
              </div>
              <div style={{ fontSize: 10, color: passed ? 'var(--ink)' : 'var(--ink-3)', fontWeight: passed ? 500 : 400 }}>
                {stageName}
              </div>
              {date && (
                <div style={{ fontSize: 9, color: isHarvested ? '#185fa5' : '#0f6e56', fontFamily: 'var(--font-mono)' }}>
                  {date}
                </div>
              )}
              <div style={{ fontSize: 9, color: 'var(--ink-3)' }}>
                {stageOrder[i]} {isCurrent && '←'}
              </div>
            </div>
          );
        })}
      </div>

      {/* footer */}
      <div style={{ display: 'flex', gap: 18, marginTop: 12, paddingTop: 10, borderTop: '0.5px solid var(--rule)', fontSize: 11, color: 'var(--ink-3)' }}>
        {!isHarvested && (
          <span>현재 단계 <b style={{ color: 'var(--ink)' }}>{speciesInfo?.stages[entry.currentStage]?.stage} ({reachedIdx + 1}/5)</b></span>
        )}
        <span>화분 레벨 <b style={{ color: 'var(--ink)' }}>Lv.{entry.potLevel}</b></span>
        <span>시작일 <b style={{ color: 'var(--ink)' }}>{entry.startedAt}</b></span>
        {isHarvested && <span>수확일 <b style={{ color: 'var(--ink)' }}>{entry.harvestedAt}</b></span>}
      </div>
    </div>
  );
}

function PlantCard({ plant }) {
  const isRare = plant.rarity === '희귀';
  const collectedDate = plant.collectedAt
    ? new Date(plant.collectedAt).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }).replace('. ', '.').slice(0, 5)
    : null;

  if (!plant.isCollected) {
    return (
      <div style={{
        padding: '16px 20px', borderRadius: 14,
        border: '0.5px solid var(--rule)', background: '#fff',
        opacity: 0.75, display: 'flex', alignItems: 'center', gap: 14, position: 'relative',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 10,
          background: '#f7f9f7', border: '0.5px solid var(--rule)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, filter: 'grayscale(1) opacity(0.3)',
        }}>🌱</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-2)', fontFamily: 'var(--font-display)' }}>{plant.plantType}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 3 }}>{isRare ? '✦ 희귀종' : '일반종'} · 미수집</div>
        </div>
        <div style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', fontSize: 18 }}>🔒</div>
      </div>
    );
  }

  return (
    <div style={{
      padding: '16px 20px', borderRadius: 14,
      border: isRare ? '0.5px solid #ccc9f0' : '0.5px solid var(--rule)', background: '#fff',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 10, flexShrink: 0,
        background: isRare ? '#eef2fa' : '#eaf3de',
        border: isRare ? '0.5px solid #afa9ec' : '0.5px solid #c8e0a8',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {plant.imageUrl
          ? <img src={plant.imageUrl} alt={plant.plantType} style={{ width: 36, height: 36, objectFit: 'contain' }} />
          : <span style={{ fontSize: 24 }}>🌸</span>
        }
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>{plant.plantType}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 3 }}>
          {isRare ? '✦ 희귀종' : '일반종'} · 수확 완료
        </div>
      </div>
      {collectedDate && (
        <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginRight: 8 }}>
          {collectedDate}
        </span>
      )}
      <Pill tone={isRare ? 'navy' : 'green'}>수확 완료</Pill>
    </div>
  );
}

function CollectionScreen() {
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPlants()
      .then(data => setPlants(data?.plants ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const collected = plants.filter(p => p.isCollected);
  const locked    = plants.filter(p => !p.isCollected);

  return (
    <div style={{ padding: 32, maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 320px' }}>
          <div className="eyebrow" style={{ color: 'var(--moss-2)' }}>식물 도감</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--ink)', marginTop: 6, letterSpacing: '-0.02em' }}>
            직접 키워낸 식물의 진화 기록
          </h2>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 6 }}>
            화분에서 수확 완료한 식물이 도감에 기록돼요.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ background: '#fff', border: '0.5px solid var(--rule)', borderRadius: 10, padding: '10px 18px', textAlign: 'center', minWidth: 80 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--ink)' }}>{collected.length}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>수확 완료</div>
          </div>
          <div style={{ background: '#fff', border: '0.5px solid var(--rule)', borderRadius: 10, padding: '10px 18px', textAlign: 'center', minWidth: 80 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: '#3b6d11' }}>{collected.length} / {plants.length}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>종 해금</div>
          </div>
        </div>
      </div>

      {loading && (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>도감을 불러오는 중...</div>
      )}

      {!loading && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, marginTop: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--ink-2)', fontFamily: 'var(--font-display)', fontWeight: 500 }}>🏆 수확 완료</span>
            <Pill tone="navy">{collected.length}종</Pill>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 30 }}>
            {collected.length === 0
              ? <div style={{ fontSize: 12.5, color: 'var(--ink-3)', padding: '16px 0' }}>아직 수확 완료한 식물이 없어요.</div>
              : collected.map((p, i) => <PlantCard key={i} plant={p} />)
            }
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--ink-2)', fontFamily: 'var(--font-display)', fontWeight: 500 }}>🔒 미수집</span>
            <Pill tone="pink">{locked.length}종</Pill>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {locked.map((p, i) => <PlantCard key={i} plant={p} />)}
          </div>
        </>
      )}
    </div>
  );
}

// === AI Screen ===

function PotCard({ pot, selected, onClick }) {
  // BE 응답에 emoji 필드가 없으므로 growthStage 기반 폴백 사용
  const GROWTH_EMOJI = {
    SEED: '🌱', SPROUT: '🌿', MATURE: '🍃', BLOOM: '🌸', FULL_BLOOM: '🌺',
  };
  const emoji = pot.emoji ?? GROWTH_EMOJI[pot.growthStage] ?? '🌱';

  // levelProgress: BE는 totalExp만 제공하므로 없을 경우 0 폴백
  const levelProgress = pot.levelProgress ?? 0;

  // TIL 개수: BE 응답의 tilCount 필드 사용, 없으면 미표시
  const tilCount = pot.tilCount ?? null;

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', borderRadius: 10, textAlign: 'left', width: '100%',
        background: selected ? 'var(--paper-2)' : '#fff',
        border: selected ? '1.5px solid var(--moss)' : '0.5px solid var(--rule)',
        position: 'relative',
        transition: 'border-color 0.12s, background 0.12s',
      }}
    >
      {/* 이모지 + 배경 */}
      <div style={{
        width: 44, height: 44, borderRadius: 10, flexShrink: 0,
        background: selected ? 'var(--paper)' : '#f7f9f7',
        border: '0.5px solid var(--rule)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22,
      }}>
        {emoji}
      </div>

      {/* 텍스트 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>{pot.title}</span>
          <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>Lv.{pot.level}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          {tilCount !== null && (
            <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>TIL {tilCount}개</span>
          )}
          {/* 레벨 진행 바 */}
          <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'var(--rule)', overflow: 'hidden' }}>
            <div style={{ width: `${levelProgress * 100}%`, height: '100%', background: selected ? 'var(--moss)' : 'var(--leaf)', borderRadius: 2, transition: 'width 0.2s' }} />
          </div>
          <span style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{Math.round(levelProgress * 100)}%</span>
        </div>
      </div>

      {/* 선택 체크 배지 */}
      {selected && (
        <div style={{
          width: 20, height: 20, borderRadius: '50%',
          background: 'var(--moss)', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff',
        }}>
          {Icon.check}
        </div>
      )}
    </button>
  );
}

function AIScreen() {
  const { user } = useUser();
  const [mode, setMode] = useState('quiz'); // quiz | summary — 입력 UI 탭 선택
  const [resultMode, setResultMode] = useState('quiz'); // quiz | summary — 현재 표시 중인 결과 타입
  const [potId, setPotId] = useState(null);
  const [quizCount, setQuizCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  // API 응답 원문 (QuizResult / SummaryResult에 전달)
  const [aiResult, setAiResult] = useState(null);
  // 에러 메시지 (null이면 에러 없음)
  const [error, setError] = useState(null);
  // 포인트 — Context의 user.points로 초기화, AI 응답의 remainPoint로 즉시 갱신
  const [remainPoint, setRemainPoint] = useState(user?.points ?? 0);

  // 화분 목록 — 진입 시 getPots()로 로딩
  const [pots, setPots] = useState([]);
  const [potsLoading, setPotsLoading] = useState(true);

  // 보관함 목록
  const [savedResults, setSavedResults] = useState([]);

  // 저장 완료 피드백용
  const [saved, setSaved] = useState(false);

  const selectedPot = pots.find(p => p.id === potId) ?? null;

  // 페이지 진입 시 화분 목록 + 사용자 포인트 로딩
  useEffect(() => {
    // 화분 목록 로딩 — 첫 번째 화분 자동 선택
    getPots()
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setPots(list);
        if (list.length > 0) {
          setPotId(list[0].id);
        }
      })
      .catch(() => {
        // 화분 목록 로딩 실패 시 빈 목록 유지
      })
      .finally(() => {
        setPotsLoading(false);
      });

    // 보유 포인트 — UserContext에서 초기화됨 (별도 getMe() 호출 불필요)
  }, []);

  // 페이지 진입 시 보관함 목록 로딩
  useEffect(() => {
    fetchResults()
      .then(data => {
        const list = Array.isArray(data) ? data : (data.results ?? []);
        const items = list.map(r => {
          const content = typeof r.content === 'string'
            ? (() => { try { return JSON.parse(r.content); } catch { return null; } })()
            : r.content;
          return {
            id: r.resultId,
            type: r.type.toLowerCase(),   // 'QUIZ' → 'quiz'
            potId: r.potId,
            pot: pots.find(p => p.id === r.potId) ?? null,
            content,
            title: r.type === 'QUIZ'
              ? `${pots.find(p => p.id === r.potId)?.title ?? r.potId} 화분 복습 문제`
              : `${pots.find(p => p.id === r.potId)?.title ?? r.potId} 화분 요약본`,
            date: new Date(r.createdAt).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }).replace('. ', '.').replace('.', '').slice(0, 5),
            quizCount: r.type === 'QUIZ' ? content?.quizzes?.length : undefined,
          };
        });
        setSavedResults(items);
      })
      .catch(() => {
        // 보관함 로딩 실패는 조용히 무시 (빈 목록 유지)
      });
  }, [pots]);

  // 보관함 항목 클릭 — 결과창에 바인딩
  const handleSelectSavedItem = (item) => {
    setMode(item.type);
    setResultMode(item.type);
    if (item.pot) setPotId(item.pot.id);
    if (item.quizCount) setQuizCount(item.quizCount);
    setAiResult(item.content ?? null);
    setGenerated(true);
    setError(null);
  };

  // 생성 버튼 — mode에 따라 summary/quiz API 호출
  const handleGenerate = async () => {
    if (!potId) return;
    setGenerating(true);
    setGenerated(false);
    setAiResult(null);
    setError(null);

    try {
      const data = mode === 'summary'
        ? await generateSummary(potId)
        : await generateQuiz(potId, quizCount);

      setAiResult(data);
      setRemainPoint(data.remainPoint);
      setResultMode(mode);
      setGenerated(true);
    } catch (err) {
      if (err.status === 402) {
        setError('포인트가 부족해요. 활동으로 포인트를 적립해 보세요.');
      } else {
        setError('생성에 실패했어요. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handlePotChange = (id) => {
    setPotId(id);
  };

  // 결과 저장 버튼 — POST /ai/results
  const handleSave = async () => {
    if (!generated || !selectedPot || !aiResult) return;

    try {
      const apiType = resultMode === 'quiz' ? 'QUIZ' : 'SUMMARY';
      const saved_res = await saveResult(apiType, potId, aiResult);

      const now = new Date();
      const date = `${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
      const title = resultMode === 'quiz'
        ? `${selectedPot.title} 화분 복습 문제 (${quizCount}문항)`
        : `${selectedPot.title} 화분 요약본`;

      setSavedResults(prev => [
        {
          id: saved_res.resultId,
          type: resultMode,
          title,
          date,
          quizCount: mode === 'quiz' ? quizCount : undefined,
          pot: selectedPot,
          content: aiResult,
        },
        ...prev,
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError('저장에 실패했어요. 잠시 후 다시 시도해 주세요.');
    }
  };

  // 보관함 항목 삭제 — DELETE /ai/results/{resultId}
  const handleDelete = async (e, resultId) => {
    e.stopPropagation(); // 클릭이 상위 handleSelectSavedItem으로 전파되지 않도록
    try {
      await deleteResult(resultId);
      setSavedResults(prev => prev.filter(r => r.id !== resultId));
    } catch {
      setError('삭제에 실패했어요. 잠시 후 다시 시도해 주세요.');
    }
  };

  return (
    <div style={{ padding: 32, display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, maxWidth: 1280, margin: '0 auto' }}>

      {/* Left — source picker */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <SectionHeader eyebrow="입력" title="학습 소스 선택" />
        <Card padding={18} style={{ marginBottom: 16 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>목적</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setMode('quiz')} style={{
              flex: 1, padding: '12px 10px', borderRadius: 10,
              background: mode === 'quiz' ? 'var(--ink)' : '#fff',
              color: mode === 'quiz' ? '#fff' : 'var(--ink-2)',
              border: '0.5px solid ' + (mode === 'quiz' ? 'var(--ink)' : 'var(--rule-2)'),
              fontSize: 12.5, fontWeight: 500, textAlign: 'left',
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: 4 }}>📝 복습 문제 생성</div>
              <div style={{ fontSize: 10.5, opacity: 0.7, lineHeight: 1.5 }}>TIL에서 {quizCount}문제 자동 생성</div>
            </button>
            <button onClick={() => setMode('summary')} style={{
              flex: 1, padding: '12px 10px', borderRadius: 10,
              background: mode === 'summary' ? 'var(--ink)' : '#fff',
              color: mode === 'summary' ? '#fff' : 'var(--ink-2)',
              border: '0.5px solid ' + (mode === 'summary' ? 'var(--ink)' : 'var(--rule-2)'),
              fontSize: 12.5, fontWeight: 500, textAlign: 'left',
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: 4 }}>✨ TIL 요약</div>
              <div style={{ fontSize: 10.5, opacity: 0.7, lineHeight: 1.5 }}>핵심 개념을 한 문서로</div>
            </button>
          </div>
          {mode === 'quiz' && (
            <div style={{
              marginTop: 12, paddingTop: 12,
              borderTop: '0.5px solid var(--rule)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>문제 수량</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => setQuizCount(c => Math.max(1, c - 1))}
                  style={{
                    width: 28, height: 28, borderRadius: 7,
                    border: '0.5px solid var(--rule-2)', background: '#fff',
                    fontSize: 15, color: 'var(--ink-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >−</button>
                <span style={{
                  width: 28, textAlign: 'center',
                  fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: 'var(--ink)',
                }}>{quizCount}</span>
                <button
                  onClick={() => setQuizCount(c => Math.min(10, c + 1))}
                  style={{
                    width: 28, height: 28, borderRadius: 7,
                    border: '0.5px solid var(--rule-2)', background: '#fff',
                    fontSize: 15, color: 'var(--ink-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >+</button>
                <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>최대 10문제</span>
              </div>
            </div>
          )}
        </Card>

        <Card padding={18}>
          <div style={{ marginBottom: 12 }}>
            <div className="eyebrow">화분 선택</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 4 }}>
              학습할 화분을 하나 선택하세요
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflow: 'auto', paddingRight: 4 }} className="scrollbar">
            {potsLoading ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 12.5 }}>
                화분 목록을 불러오는 중...
              </div>
            ) : pots.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 12.5 }}>
                화분이 없어요. 화분을 먼저 만들어 보세요.
              </div>
            ) : (
              pots.map(p => (
                <PotCard
                  key={p.id}
                  pot={p}
                  selected={potId === p.id}
                  onClick={() => handlePotChange(p.id)}
                />
              ))
            )}
          </div>

          <Btn
            variant="green" size="lg"
            style={{ width: '100%', marginTop: 14, opacity: potId ? 1 : 0.45, cursor: potId ? 'pointer' : 'not-allowed' }}
            onClick={handleGenerate}
          >
            {generating ? '생성 중...' : (mode === 'quiz' ? `🌱 복습 문제 ${quizCount}개 만들기` : '✨ 요약 생성하기')} · {mode === 'quiz' ? quizCount * 10 : 50} 포인트 사용
          </Btn>
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--ink-3)', textAlign: 'center' }}>
            현재 보유: <b style={{ color: 'var(--ink)' }}>{remainPoint}P</b> · 포인트는 활동으로 적립돼요
          </div>
          {error && (
            <div style={{
              marginTop: 8, padding: '10px 14px', borderRadius: 8,
              background: '#fff3f5', border: '0.5px solid #f7c1c1',
              fontSize: 12, color: '#b8536a', textAlign: 'center',
            }}>
              {error}
            </div>
          )}
        </Card>
      </div>

        {/* ➕ 추가: 저장된 AI 결과 목록(보관함) UI 신규 배치 */}
        <div>
          <SectionHeader eyebrow="보관함" title="저장된 AI 결과" />
          <Card padding={14} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {savedResults.length === 0 ? (
                <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 12, color: 'var(--ink-3)' }}>
                  저장된 결과지가 없습니다.
                </div>
            ) : (
                savedResults.map(item => (
                    <div
                        key={item.id}
                        onClick={() => handleSelectSavedItem(item)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 12px', borderRadius: 8, background: '#fcfdfb',
                          border: '0.5px solid var(--rule)', cursor: 'pointer'
                        }}
                    >
                  <span style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                    {item.type === 'quiz' ? '📝 ' : '✨ '} {item.title}
                  </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{item.date}</span>
                        <button
                          onClick={(e) => handleDelete(e, item.id)}
                          aria-label="삭제"
                          style={{
                            width: 20, height: 20, borderRadius: 5,
                            border: '0.5px solid var(--rule-2)', background: '#fff',
                            fontSize: 11, color: 'var(--ink-3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >✕</button>
                      </div>
                    </div>
                ))
            )}
          </Card>
        </div>

      </div>

      {/* Right — output */}
      <div>
        <SectionHeader
          eyebrow="AI 결과지"
          title={resultMode === 'quiz' ? `복습 문제 (${quizCount}문항)` : 'TIL 요약 결과지'}
          action={generated ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="secondary" size="sm" onClick={handleGenerate}>다시 생성</Btn>
              <Btn variant="primary" size="sm" onClick={handleSave}>
                {saved ? '✓ 저장됨' : '결과 저장'}
              </Btn>
            </div>
          ) : null}
        />

        <Card padding={28}>
          {generating ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '60px 0', color: 'var(--ink-3)' }}>
              <div style={{ fontSize: 32 }}>🌱</div>
              <div style={{ fontSize: 13.5, color: 'var(--ink-2)', fontFamily: 'var(--font-display)' }}>AI가 TIL을 분석하고 있어요...</div>
            </div>
          ) : !generated ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '60px 0' }}>
              <div style={{ fontSize: 40, opacity: 0.35 }}>{mode === 'quiz' ? '📝' : '✨'}</div>
              <div style={{ fontSize: 13.5, color: 'var(--ink-3)', fontFamily: 'var(--font-display)' }}>
                화분을 선택하고 생성 버튼을 눌러주세요
              </div>
            </div>
          ) : resultMode === 'quiz' ? (
            <QuizResult pot={selectedPot} quizCount={quizCount} quizzes={aiResult?.quizzes ?? null} />
          ) : (
            <SummaryResult pot={selectedPot} summary={aiResult?.summary ?? null} keyPoints={aiResult?.keyPoints ?? null} />
          )}
        </Card>
      </div>
    </div>
  );
}

function QuizResult({ pot, quizCount, quizzes }) {
  const list = quizzes ?? [];
  // { [index]: choiceText }
  const [selected, setSelected] = useState({});
  const [graded, setGraded] = useState(false);

  const allAnswered = list.length > 0 && Object.keys(selected).length === list.length;
  const correctCount = graded
    ? list.filter((q, i) => selected[i] === q.answer).length
    : 0;

  function handleSelect(idx, choice) {
    if (graded) return;
    setSelected(prev => ({ ...prev, [idx]: choice }));
  }

  function handleGrade() {
    setGraded(true);
  }

  function getChoiceStyle(q, i, choice) {
    const base = {
      width: '100%', textAlign: 'left',
      padding: '10px 14px', borderRadius: 9,
      fontSize: 13, cursor: graded ? 'default' : 'pointer',
      transition: 'background 0.15s',
    };
    if (!graded) {
      const isSelected = selected[i] === choice;
      return {
        ...base,
        background: isSelected ? 'var(--moss)' : 'var(--paper-2)',
        color: isSelected ? '#fff' : 'var(--ink)',
        border: isSelected ? '0.5px solid var(--moss)' : '0.5px solid var(--rule)',
        fontWeight: isSelected ? 600 : 400,
      };
    }
    // 채점 후
    const isCorrect = choice === q.answer;
    const isSelected = selected[i] === choice;
    if (isCorrect) return { ...base, background: '#e8f5e9', color: '#2e7d32', border: '0.5px solid #81c784', fontWeight: 600 };
    if (isSelected) return { ...base, background: '#ffebee', color: '#c62828', border: '0.5px solid #e57373' };
    return { ...base, background: 'var(--paper-2)', color: 'var(--ink-3)', border: '0.5px solid var(--rule)' };
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{
        padding: 16, background: 'var(--paper-2)', borderRadius: 10,
        fontSize: 12.5, color: 'var(--ink-2)', borderLeft: '2px solid var(--moss)',
      }}>
        💡 {pot?.emoji} {pot?.name} 화분의 TIL에서 핵심 개념 {quizCount}문항을 추출했어요. 보기를 선택하고 채점해보세요.
      </div>

      {list.map((q, i) => (
        <div key={i}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--moss-2)' }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.6, flex: 1 }}>{q.question}</span>
          </div>
          {q.hint && (
            <div style={{ paddingLeft: 28, marginTop: 6, fontSize: 11.5, color: 'var(--ink-3)', fontStyle: 'italic' }}>
              힌트: {q.hint}
            </div>
          )}
          <div style={{ paddingLeft: 28, marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(q.choices ?? []).map((choice, ci) => (
              <button
                key={ci}
                onClick={() => handleSelect(i, choice)}
                style={getChoiceStyle(q, i, choice)}
              >
                <span style={{ marginRight: 8, opacity: 0.5 }}>{['①', '②', '③', '④'][ci]}</span>
                {choice}
              </button>
            ))}
          </div>
        </div>
      ))}

      {list.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginTop: 8 }}>
          {graded && (
            <div style={{
              padding: '14px 24px', borderRadius: 12, textAlign: 'center',
              background: correctCount === list.length ? '#e8f5e9' : '#fff8e1',
              border: `1px solid ${correctCount === list.length ? '#81c784' : '#ffd54f'}`,
              fontSize: 14, fontWeight: 600,
              color: correctCount === list.length ? '#2e7d32' : '#f57f17',
            }}>
              {correctCount === list.length
                ? `🎉 전체 정답! ${list.length}문제 모두 맞혔어요.`
                : `${list.length}문제 중 ${correctCount}개 정답이에요.`}
            </div>
          )}
          <button
            onClick={handleGrade}
            disabled={!allAnswered || graded}
            style={{
              padding: '12px 32px', borderRadius: 10,
              background: allAnswered && !graded ? 'var(--moss)' : 'var(--rule)',
              color: allAnswered && !graded ? '#fff' : 'var(--ink-3)',
              border: 'none', fontSize: 14, fontWeight: 600,
              cursor: allAnswered && !graded ? 'pointer' : 'not-allowed',
              transition: 'background 0.15s',
            }}
          >
            {graded ? '채점 완료' : '채점하기'}
          </button>
        </div>
      )}
    </div>
  );
}

function SummaryResult({ pot, summary, keyPoints }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{
        padding: 16, background: 'var(--paper-2)', borderRadius: 10,
        fontSize: 12.5, color: 'var(--ink-2)', borderLeft: '2px solid var(--moss)',
      }}>
        🌿 {pot ? `${pot.emoji} ${pot.name} 화분의 TIL 핵심을 한 문서로 묶었어요.` : 'TIL 핵심을 한 문서로 묶었어요.'}
      </div>

      {summary && (
        <div>
          <div style={{ fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.85, whiteSpace: 'pre-wrap' }}>
            {summary}
          </div>
        </div>
      )}

      {keyPoints && keyPoints.length > 0 && (
        <div style={{ padding: 16, borderRadius: 10, background: 'var(--paper-2)' }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>핵심 포인트</div>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {keyPoints.map((point, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, color: 'var(--ink)' }}>
                <span style={{ width: 4, height: 4, borderRadius: 2, background: 'var(--moss)', marginTop: 6, flexShrink: 0 }} />
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// === Profile Screen ===

function ProfileScreen() {
  const { user } = useUser();
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState(user?.name ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');

  return (
    <div style={{ padding: 32, maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>

      <Card padding={28}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 92, height: 92, borderRadius: '50%',
              background: 'linear-gradient(135deg, #a8d5b5, #3d8b5e)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 36, fontFamily: 'var(--font-display)', fontWeight: 600,
            }}>소</div>
            {editing && (
              <button style={{
                position: 'absolute', bottom: -2, right: -2,
                width: 30, height: 30, borderRadius: '50%',
                background: '#fff', border: '1px solid var(--rule-2)',
                fontSize: 13,
              }}>📷</button>
            )}
          </div>

          <div style={{ flex: 1 }}>
            {editing ? (
              <>
                <input value={nickname} onChange={e => setNickname(e.target.value)} style={{
                  fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--ink)',
                  border: '0.5px solid var(--rule-2)', borderRadius: 8, padding: '6px 10px', width: 280, marginBottom: 8,
                }} />
                <textarea value={bio} onChange={e => setBio(e.target.value)} style={{
                  width: '100%', maxWidth: 480, minHeight: 50, padding: '8px 12px',
                  border: '0.5px solid var(--rule-2)', borderRadius: 8,
                  fontSize: 13, color: 'var(--ink-2)', outline: 'none', resize: 'none',
                  fontFamily: 'var(--font-body)',
                }} />
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--ink)' }}>{nickname}</h2>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-3)', fontSize: 13 }}>@{user?.handle ?? ''}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 6 }}>{bio}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginTop: 8 }}>
                  {user?.joinedAt ?? ''}부터 Rootin과 함께
                </div>
              </>
            )}
          </div>

          <Btn variant={editing ? 'green' : 'secondary'} onClick={() => setEditing(!editing)}>
            {editing ? '저장' : '프로필 수정'}
          </Btn>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, marginTop: 24, paddingTop: 22, borderTop: '0.5px solid var(--rule)' }}>
          {[
            { label: '누적 TIL', value: (user?.totalTil ?? 0) + '개' },
            { label: '연속 기록', value: (user?.streak ?? 0) + '일' },
            { label: '수확한 식물', value: '5종' },
            { label: '보유 포인트', value: (user?.points ?? 0) + 'P' },
          ].map((s, i) => (
            <div key={i} style={{
              borderRight: i < 3 ? '0.5px solid var(--rule)' : 'none',
              paddingLeft: i > 0 ? 22 : 0,
            }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-display)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{s.label}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginTop: 4 }}>{s.value}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Account settings */}
      <Card padding={24}>
        <SectionHeader eyebrow="계정 관리" title="설정" />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {[
            { label: '이메일', value: user?.email ?? '', sub: '구글 계정 연동됨' },
            { label: '비밀번호', value: '••••••••', action: '변경' },
            { label: '연결된 SNS', value: '🟢 Google · 🟡 Kakao (예정)' },
            { label: '알림', value: '데일리 리마인드 22:00', action: '설정' },
            { label: '데이터 내보내기', value: 'JSON · Markdown', action: '내보내기' },
          ].map((row, i, arr) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 20,
              padding: '14px 0',
              borderBottom: i < arr.length - 1 ? '0.5px solid var(--rule)' : 'none',
            }}>
              <div style={{ width: 140, fontSize: 12.5, color: 'var(--ink-3)' }}>{row.label}</div>
              <div style={{ flex: 1, fontSize: 13.5, color: 'var(--ink)' }}>{row.value}</div>
              {row.sub && <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{row.sub}</div>}
              {row.action && <Btn variant="secondary" size="sm">{row.action}</Btn>}
            </div>
          ))}
        </div>
      </Card>

      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px' }}>
        <button style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>로그아웃</button>
        <button style={{ fontSize: 12.5, color: '#b8536a' }}>회원 탈퇴</button>
      </div>
    </div>
  );
}

// === Auth Screen ===

// 클라이언트 유효성 검사
function validate({ mode, email, password, nickname }) {
  if (mode === 'signup' && !nickname.trim()) return '닉네임을 입력해주세요.';
  if (!email.trim()) return '이메일을 입력해주세요.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '올바른 이메일 형식이 아닙니다.';
  if (!password) return '비밀번호를 입력해주세요.';
  if (password.length < 8) return '비밀번호는 8자 이상이어야 합니다.';
  return null;
}

// API 에러 → 사용자 메시지 변환
function parseApiError(err) {
  if (err?.status === 401) return '비밀번호가 올바르지 않습니다.';
  if (err?.status === 409) return '이미 사용 중인 이메일입니다.';
  if (err?.status === 404) return '등록되지 않은 이메일입니다.';
  return err?.body?.message ?? '오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login'); // login | signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Google SDK 초기화
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const scriptId = 'google-gsi-script';
    if (document.getElementById(scriptId)) return;
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, []);

  async function handleGoogleLogin() {
    if (!GOOGLE_CLIENT_ID || !window.google) return;
    setError(null);
    setLoading(true);
    try {
      const idToken = await new Promise((resolve, reject) => {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: ({ credential }) => resolve(credential),
          error_callback: reject,
        });
        window.google.accounts.id.prompt(notification => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            reject(new Error('Google 로그인 창을 열 수 없습니다.'));
          }
        });
      });
      const { googleLogin, googleLogin: _g } = await import('./api/auth.js');
      const result = await googleLogin({ idToken });
      const { getMe } = await import('./api/user.js');
      const userData = await getMe();
      onAuth(userData);
    } catch (err) {
      setError(err?.message ?? parseApiError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    setError(null);
    const validationError = validate({ mode, email, password, nickname });
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    try {
      if (mode === 'login') {
        const { login } = await import('./api/auth.js');
        await login({ email, password });
        const { getMe } = await import('./api/user.js');
        const userData = await getMe();
        onAuth(userData);
      } else {
        const { signup } = await import('./api/auth.js');
        await signup({ email, password, nickname });
        const { getMe } = await import('./api/user.js');
        const userData = await getMe();
        onAuth(userData);
      }
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setError(null);
    setEmail('');
    setPassword('');
    setNickname('');
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1.1fr 1fr', background: 'var(--paper)' }}>

      {/* Left visual */}
      <div style={{
        background: 'linear-gradient(135deg, #1a3a5c 0%, #2a5a8c 60%, #3d8b5e 130%)',
        color: '#fff',
        padding: '60px 60px 40px',
        display: 'flex', flexDirection: 'column',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, zIndex: 2 }}>
          <RootinLogo size={40} />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>Rootin</div>
            <div style={{ fontSize: 11, color: '#a8d5b5', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', marginTop: 2 }}>루틴처럼, 뿌리처럼</div>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', zIndex: 2 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 600, lineHeight: 1.3, letterSpacing: '-0.02em' }}>
            매일의 기록이<br />
            <span style={{ color: '#a8d5b5' }}>뿌리가 되어</span><br />
            꽃을 피웁니다.
          </div>
          <div style={{ fontSize: 14, color: 'rgba(232, 245, 236, 0.7)', marginTop: 22, lineHeight: 1.7, maxWidth: 380 }}>
            오늘 배운 한 줄을 화분에 심으면, 식물이 자랍니다.<br />
            기록이 쌓일수록 정원도 깊어져요.
          </div>
        </div>

        {/* decorative plant illustrations */}
        <div style={{ position: 'absolute', bottom: 32, left: 60, right: 60, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', opacity: 0.95, zIndex: 1 }}>
          {['seed','sprout','leaf','bloom','full'].map((s, i) => (
            <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <Plant stage={s} size={62} color="#ffd0e0" />
              <div style={{ fontSize: 10, color: '#a8d5b5', fontFamily: 'var(--font-display)', letterSpacing: '0.06em' }}>{STAGE_META[s].label}</div>
            </div>
          ))}
        </div>

        {/* subtle bg pattern */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.05, backgroundImage: 'radial-gradient(circle at 20% 80%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 20%, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      {/* Right form */}
      <div style={{ padding: '60px 80px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div className="eyebrow" style={{ color: 'var(--moss-2)' }}>{mode === 'login' ? 'Welcome back' : 'Start growing'}</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: 'var(--ink)', marginTop: 8, letterSpacing: '-0.02em' }}>
          {mode === 'login' ? '다시 만나서 반가워요' : '새로운 정원 시작하기'}
        </h1>
        <div style={{ fontSize: 13.5, color: 'var(--ink-2)', marginTop: 8 }}>
          {mode === 'login' ? '오늘의 한 줄을 기록할 시간이에요.' : '이메일만 있으면 바로 첫 화분을 받아요.'}
        </div>

        {/* Social */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 28 }}>
          <button
            onClick={handleGoogleLogin}
            disabled={loading || !GOOGLE_CLIENT_ID}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '12px 16px', borderRadius: 10,
              background: '#fff', border: '1px solid var(--rule-2)',
              fontSize: 13.5, fontWeight: 500, color: 'var(--ink)',
              opacity: (!GOOGLE_CLIENT_ID || loading) ? 0.5 : 1,
              cursor: (!GOOGLE_CLIENT_ID || loading) ? 'not-allowed' : 'pointer',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.09-1.8 2.73v2.27h2.92c1.7-1.57 2.68-3.88 2.68-6.64z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.92-2.27c-.81.54-1.84.87-3.04.87-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A8.99 8.99 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.97 10.71A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.18.29-1.71V4.96H.96A8.99 8.99 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3.01-2.33z" fill="#FBBC05"/>
              <path d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A8.99 8.99 0 0 0 .96 4.96L3.97 7.3C4.68 5.16 6.66 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Google로 계속하기{!GOOGLE_CLIENT_ID && <span style={{ fontSize: 10.5, color: '#888', marginLeft: 4 }}>(미설정)</span>}
          </button>
          <button style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '12px 16px', borderRadius: 10,
            background: '#fee500', border: 'none',
            fontSize: 13.5, fontWeight: 500, color: '#191919',
            opacity: 0.6, cursor: 'not-allowed',
          }}>
            💬 Kakao로 계속하기 <span style={{ fontSize: 10.5, color: '#666', marginLeft: 4 }}>(예정)</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0', color: 'var(--ink-3)', fontSize: 11, fontFamily: 'var(--font-display)' }}>
          <div style={{ flex: 1, height: 0.5, background: 'var(--rule-2)' }} />
          <span>또는 이메일로</span>
          <div style={{ flex: 1, height: 0.5, background: 'var(--rule-2)' }} />
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'signup' && (
            <div>
              <label style={{ fontSize: 11.5, color: 'var(--ink-3)', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>닉네임</label>
              <input
                placeholder="정원에서 불릴 이름"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%', padding: '12px 14px', marginTop: 6,
                  borderRadius: 10, border: '0.5px solid var(--rule-2)',
                  fontSize: 14, outline: 'none', background: '#fff',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}
          <div>
            <label style={{ fontSize: 11.5, color: 'var(--ink-3)', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>이메일</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
              style={{
                width: '100%', padding: '12px 14px', marginTop: 6,
                borderRadius: 10, border: '0.5px solid var(--rule-2)',
                fontSize: 14, outline: 'none', background: '#fff',
                boxSizing: 'border-box',
              }}
            />
            {mode === 'signup' && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>해당 이메일로 인증메일을 전송합니다.</div>}
          </div>
          <div>
            <label style={{ fontSize: 11.5, color: 'var(--ink-3)', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>비밀번호</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              style={{
                width: '100%', padding: '12px 14px', marginTop: 6,
                borderRadius: 10, border: '0.5px solid var(--rule-2)',
                fontSize: 14, outline: 'none', background: '#fff',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div style={{
            marginTop: 14,
            padding: '10px 14px',
            borderRadius: 8,
            background: '#fef2f2',
            border: '0.5px solid #fca5a5',
            fontSize: 12.5,
            color: '#b91c1c',
          }}>
            {error}
          </div>
        )}

        <Btn
          variant="primary"
          size="lg"
          style={{ width: '100%', marginTop: 16, opacity: loading ? 0.7 : 1 }}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? '처리 중…' : mode === 'login' ? '정원으로 들어가기 →' : '첫 화분 받기 →'}
        </Btn>

        <div style={{ textAlign: 'center', marginTop: 18, fontSize: 12.5, color: 'var(--ink-3)' }}>
          {mode === 'login' ? '아직 계정이 없으세요? ' : '이미 계정이 있으세요? '}
          <button onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')} style={{ color: 'var(--moss-2)', fontWeight: 500 }}>
            {mode === 'login' ? '회원가입' : '로그인'}
          </button>
        </div>
      </div>
    </div>
  );
}

export { CollectionScreen, AIScreen, ProfileScreen, AuthScreen };
