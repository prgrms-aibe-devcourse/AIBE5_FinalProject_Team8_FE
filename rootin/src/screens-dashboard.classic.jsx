import { useState, useEffect, useMemo } from 'react';
import { Card, Pill, Btn, StatTile, SectionHeader, ProgressBar, Icon } from './ui.jsx';
import { Plant } from './plants.jsx';
import { getSummary, getGrass, getWeekly, getDistribution, getInterests, getQuests } from './api/dashboard.js';
import { getPointSummary } from './api/points.js';
import { DAY_LABELS, buildGrassState, buildRecentStreakDays, calculateCurrentStreakFromCells, transformWeekly } from './screens-dashboard.logic.js';
import { GrassGraph, StreakActivityChart, WeeklyBar, PotDistribution, InterestStackedAreaChart } from './screens-dashboard.charts.jsx';

// 섹션 카드 공통 — 은은한 상단 채광 sheen + 떠 있는 그림자(온실 깊이감)
const CARD_SHEEN = { background: 'var(--grad-sheen)', boxShadow: 'var(--shadow-md)' };

function GoalRow({ goal }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px', borderRadius: 10,
      background: goal.done ? 'var(--paper-2)' : 'var(--paper)',
      border: '0.5px solid var(--rule)',
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: 7,
        background: goal.done ? 'var(--moss)' : 'var(--card)',
        border: goal.done ? 'none' : '1px solid var(--rule-2)',
        color: 'var(--on-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {goal.done && Icon.check}
      </div>
      <div style={{ flex: 1, fontSize: 13.5, color: 'var(--ink)', textDecoration: goal.done ? 'line-through' : 'none', opacity: goal.done ? 0.6 : 1 }}>
        {goal.label}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 11.5, fontWeight: 700, color: goal.done ? 'var(--moss-2)' : 'var(--gold-ink)' }}>
        +{goal.point}P
      </div>
    </div>
  );
}

function DashboardScreen({ onNav }) {
  const [summary, setSummary]           = useState(null);
  const [grassState, setGrassState]     = useState(() => buildGrassState([]));
  const [grassCells, setGrassCells]     = useState([]);
  const [weekly, setWeekly]             = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [interests, setInterests]           = useState([]);
  const [interestMonths, setInterestMonths] = useState(6);
  const [quests, setQuests]                 = useState(null);
  const [currentPoint, setCurrentPoint]     = useState(0);

  // 잔디 — 항상 1년치 데이터
  useEffect(() => {
    let active = true;
    getGrass(12).then(data => {
      if (!active) return;
      const cells = data?.cells ?? [];
      setGrassState(buildGrassState(cells));
      setGrassCells(cells);
    }).catch(error => {
      console.error('잔디 그래프 조회 중 오류 발생:', error);
    });
    return () => { active = false; };
  }, []);

  // 관심사 기간 변경 시 재요청
  useEffect(() => {
    let active = true;
    getInterests(interestMonths).then(data => {
      if (!active) return;
      setInterests(data?.interests ?? []);
    }).catch(error => {
      console.error('시기별 학습 주제 흐름 조회 중 오류 발생:', error);
    });
    return () => { active = false; };
  }, [interestMonths]);

  useEffect(() => {
    // getQuests()는 포인트 적립을 수행하므로, 완료 후 포인트를 재조회한다 (성공/실패 무관)
    let active = true;
    const questsP = getQuests();

    Promise.allSettled([
      getSummary(),
      getWeekly(),
      getDistribution(),
      questsP,
    ]).then(([sumRes, weekRes, distRes, questRes]) => {
      if (!active) return;
      if (sumRes.status === 'fulfilled')   setSummary(sumRes.value);
      if (weekRes.status === 'fulfilled')  setWeekly(transformWeekly(weekRes.value?.weeklyData ?? []));
      if (distRes.status === 'fulfilled')  setDistribution(distRes.value?.distribution ?? []);
      if (questRes.status === 'fulfilled') setQuests(questRes.value);
    // allSettled 자체는 reject되지 않음. then() 내부 동기 오류만 여기서 잡힘
    }).catch(error => {
      console.error('상태 업데이트 중 오류:', error);
    });

    // 퀘스트 완료 여부와 무관하게 포인트 잔액 갱신
    questsP
      .catch(error => {
        console.error('퀘스트 조회 중 오류 발생:', error);
        return null;
      })
      .finally(() => {
        if (!active) return;
        getPointSummary()
          .then(pointRes => {
            if (active && pointRes != null) setCurrentPoint(pointRes.currentPoint ?? 0);
          })
          .catch(error => {
            console.error('포인트 조회 중 오류 발생:', error);
          });
      });

    return () => { active = false; };
  }, []);

  const recentStreakDays = useMemo(() => buildRecentStreakDays(grassCells, 30), [grassCells]);
  const fallbackStreak = useMemo(() => calculateCurrentStreakFromCells(grassCells), [grassCells]);
  const apiStreak  = summary?.currentStreak  ?? 0;
  // API 캐시가 늦게 갱신될 수 있어 잔디 셀 기반 로컬 계산값으로 현재 스트릭을 보정합니다.
  const streak     = Math.max(apiStreak, fallbackStreak);
  const bestStreak = summary?.longestStreak  ?? 0;
  const totalTil   = summary?.totalTilCount  ?? 0;
  const totalChar  = summary?.totalCharCount ?? 0;

  const goalList    = quests?.quests      ?? [];
  const earnedToday = quests?.earnedToday ?? 0;
  const totalToday  = quests?.totalToday  ?? 0;

  const dynamicGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return { text: "싱그러운 아침, 새로운 성장을 기록해 볼까요?", grad: "var(--greet-morning)" };
    if (hour >= 11 && hour < 17) return { text: "활기찬 오후, 오늘의 배움을 단단하게 다져보세요.", grad: "var(--greet-afternoon)" };
    if (hour >= 17 && hour < 22) return { text: "차분한 저녁, 하루 동안 모은 지식을 정리할 시간이에요.", grad: "var(--greet-evening)" };
    return { text: "고요한 밤, 내일을 위한 작은 씨앗을 심어주세요.", grad: "var(--greet-night)" };
  }, []);

  return (
    <div style={{ padding: 32, width: '100%', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1600, margin: '0 auto', fontFamily: 'var(--font-body)' }}>

      {/* Greeting card */}
      <Card className="guide-dashboard-greeting" padding={24} style={{
        background: 'radial-gradient(135% 130% at 90% -25%, color-mix(in oklch, var(--amber) 26%, transparent) 0%, transparent 48%), linear-gradient(120deg, var(--primary-weak) 0%, var(--primary-weak2) 55%, var(--honey-weak) 100%)',
        border: '0.5px solid var(--leaf)',
        boxShadow: 'var(--shadow-md), inset 0 1px 0 color-mix(in oklch, white 55%, transparent)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <div className="til-plant-float" style={{ flexShrink: 0 }}>
            <Plant stage="bloom" size={86} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 23,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              background: dynamicGreeting.grad,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'inline-block'
            }}>
              {dynamicGreeting.text}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--ink-2)', marginTop: 8 }}>
              <span style={{ color: 'var(--coral)', display: 'inline-flex' }}>{Icon.flame}</span>
              <span>연속 <b style={{ color: 'var(--moss-2)' }}>{streak}일</b> 기록 중</span>
            </div>
          </div>
          <Btn variant="green" size="lg" icon={Icon.edit} onClick={() => onNav('garden')}>
            화분 선택하기
          </Btn>
        </div>
      </Card>

      {/* Stat tiles */}
      <div className="guide-dashboard-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatTile label="누적 TIL"    value={totalTil}                   suffix="개" sub="누적 작성 수"      icon={Icon.edit}  accent="moss" />
        <StatTile label="연속 기록"   value={streak}                     suffix="일" sub={`최고 ${bestStreak}일`} icon={Icon.flame} accent="coral" />
        <StatTile label="누적 글자수" value={totalChar.toLocaleString()} suffix="자" sub="총 작성 글자 수"    icon={Icon.book}  accent="ink" />
        <StatTile label="포인트"      value={currentPoint}               suffix="P"  sub="AI 토큰으로 사용 가능" icon={Icon.coin}  accent="amber" highlight />
      </div>

      {/* 📊 하단 활동 분석 및 그래프 영역 전체를 가이드 타겟으로 설정합니다 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Grass + Today goals */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
          <Card className="guide-dashboard-grass" padding={22} style={{ minWidth: 0, ...CARD_SHEEN }}>
            <SectionHeader eyebrow="활동" title="잔디 그래프" accent="var(--moss)" />
            <GrassGraph data={grassState.grid} startDate={grassState.startDate} />
          </Card>

          <Card className="guide-dashboard-goals" padding={22} style={CARD_SHEEN}>
            <SectionHeader
              eyebrow={`오늘 · ${new Date().toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }).replace('. ', '.').slice(0, 5)}`}
              title="오늘의 목표"
              accent="var(--amber)"
              action={
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 11.5, color: 'var(--gold-ink)', fontWeight: 700 }}>
                  {earnedToday} / {totalToday}P
                </span>
              }
            />
            <div style={{ marginBottom: 14 }}>
              <ProgressBar
                value={totalToday > 0 ? earnedToday / totalToday : 0}
                color="var(--amber)"
                bg="var(--amber-soft)"
                height={6}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {goalList.map(g => <GoalRow key={g.id} goal={g} />)}
            </div>
          </Card>
        </div>

        {/* 3 column stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <Card className="guide-dashboard-streak" padding={22} style={CARD_SHEEN}>
            <SectionHeader eyebrow="연속 기록" title="Streak" accent="var(--coral)" action={
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <Pill tone="green">현재 {streak}일째</Pill>
                <Pill tone="green">최고 {bestStreak}일</Pill>
              </div>
            } />
            <StreakActivityChart days={recentStreakDays} />
          </Card>

          <Card className="guide-dashboard-distribution" padding={22} style={CARD_SHEEN}>
            <SectionHeader eyebrow="화분별 분포" title="주제 비율" accent="var(--moss)" />
            <PotDistribution distribution={distribution} />
          </Card>

          <Card className="guide-dashboard-weekly" padding={22} style={{ display: 'flex', flexDirection: 'column', ...CARD_SHEEN }}>
            <SectionHeader eyebrow="이번 주" title="요일별 작성" accent="var(--moss)" />
            <WeeklyBar weekly={weekly.length > 0 ? weekly : DAY_LABELS.map(d => ({ day: d, count: 0 }))} />
          </Card>
        </div>

        {/* Interest line chart */}
        <Card className="guide-dashboard-interests" padding={22} style={CARD_SHEEN}>
          <SectionHeader eyebrow="관심사 변화" title="시기별 학습 주제 흐름" accent="var(--moss)" action={
            <div style={{ display: 'flex', gap: 4 }}>
              {[['6개월', 6], ['12개월', 12]].map(([label, m]) => (
                <button key={m} onClick={() => setInterestMonths(m)} style={{
                  padding: '5px 10px', fontSize: 11.5, borderRadius: 7,
                  background: interestMonths === m ? 'var(--coral)' : 'transparent',
                  color: interestMonths === m ? '#fff' : 'var(--ink-2)',
                  border: interestMonths === m ? 'none' : '0.5px solid var(--rule-2)',
                  fontFamily: 'var(--font-display)', fontWeight: 500, cursor: 'pointer',
                }}>{label}</button>
              ))}
            </div>
          } />
          <InterestStackedAreaChart interests={interests} />
        </Card>
      </div>
    </div>
  );
}

export { DashboardScreen, GrassGraph };
