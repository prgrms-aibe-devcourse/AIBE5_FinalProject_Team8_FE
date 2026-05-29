import { useState, useEffect } from 'react';
import { Card, Pill, Btn, StatTile, SectionHeader, Icon } from './ui.jsx';
import { Plant } from './plants.jsx';
import { getSummary, getGrass, getWeekly, getDistribution, getInterests, getQuests } from './api/dashboard.js';
import { getPointSummary } from './api/points.js';

// ─── 변환 유틸 ────────────────────────────────────────────────

// BE cells([{date, tilCount, charCount, level}]) → 13주×7일 2D 배열 (0~4)
function buildGrassGrid(cells = []) {
  const levelMap = {};
  cells.forEach(c => { levelMap[c.date] = c.level; });

  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay() - 12 * 7); // 13주 전 일요일

  return Array.from({ length: 13 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const dt = new Date(start);
      dt.setDate(start.getDate() + w * 7 + d);
      return levelMap[dt.toISOString().split('T')[0]] ?? 0;
    })
  );
}

// BE weeklyData([{date, tilCount}]) → [{day:'월', count:2}, ...]
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
function transformWeekly(weeklyData = []) {
  return weeklyData.map(d => ({
    day: DAY_LABELS[new Date(d.date + 'T00:00:00').getDay()],
    count: d.tilCount,
  }));
}

// ─── 컴포넌트 ──────────────────────────────────────────────────

function GrassGraph({ data }) {
  const colors = ['#eef2ee', '#cfe8d6', '#9dd0b0', '#5fb088', '#2e6b48'];
  const weekDays = ['', '월', '', '수', '', '금', ''];
  const cellSize = 12;
  const gap = 3;
  return (
    <div>
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap, fontFamily: 'var(--font-display)', fontSize: 9, color: 'var(--ink-3)', marginTop: 1 }}>
          {weekDays.map((d, i) => (
            <div key={i} style={{ width: 14, height: cellSize, lineHeight: `${cellSize}px` }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'flex', gap }}>
          {data.map((week, wi) => (
            <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap }}>
              {week.map((v, di) => (
                <div key={di} style={{
                  width: cellSize, height: cellSize, borderRadius: 3,
                  background: colors[v],
                  border: v === 0 ? '0.5px solid var(--rule)' : 'none',
                }} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14, fontFamily: 'var(--font-display)', fontSize: 10.5, color: 'var(--ink-3)' }}>
        <span>적음</span>
        {colors.map((c, i) => (
          <div key={i} style={{ width: 11, height: 11, borderRadius: 2.5, background: c, border: i === 0 ? '0.5px solid var(--rule)' : 'none' }} />
        ))}
        <span>많음</span>
        <span style={{ marginLeft: 'auto', color: 'var(--ink-2)' }}>글자수로 농도 표현</span>
      </div>
    </div>
  );
}

function StreakChart() {
  const days = [];
  for (let i = 0; i < 21; i++) {
    const active = i >= 9;
    days.push({ active, h: active ? 18 + Math.sin(i * 0.8) * 6 + ((i * 7 + 3) % 8) : 0 });
  }
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60 }}>
      {days.map((d, i) => (
        <div key={i} style={{
          flex: 1, height: d.active ? `${d.h + 18}px` : '4px',
          background: d.active ? 'linear-gradient(180deg, #3d8b5e, #2e6b48)' : 'var(--rule)',
          borderRadius: 3, opacity: d.active ? 1 : 0.6,
        }} />
      ))}
    </div>
  );
}

function WeeklyBar({ weekly }) {
  const max = Math.max(...weekly.map(w => w.count), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, height: 130 }}>
      {weekly.map((w, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%' }}>
          <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
            <div style={{
              width: '100%',
              height: `${(w.count / max) * 100}%`,
              minHeight: 4,
              background: w.count > 0 ? 'var(--moss)' : 'var(--rule)',
              borderRadius: '6px 6px 2px 2px',
              position: 'relative',
            }}>
              {w.count > 0 && (
                <div style={{ position: 'absolute', top: -18, left: 0, right: 0, textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600, color: 'var(--ink)' }}>
                  {w.count}
                </div>
              )}
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-body)' }}>{w.day}</div>
        </div>
      ))}
    </div>
  );
}

function PotDistribution({ distribution }) {
  if (!distribution || distribution.length === 0) {
    return <div style={{ textAlign: 'center', color: 'var(--ink-3)', padding: '20px 0', fontSize: 12 }}>TIL 데이터가 없습니다.</div>;
  }
  const total = distribution.reduce((s, p) => s + p.tilCount, 0);
  let acc = 0;
  const segs = distribution.map(p => {
    const pct = total > 0 ? p.tilCount / total : 0;
    const start = acc;
    acc += pct;
    return { ...p, pct, start };
  });
  const R = 56;
  const circumference = 2 * Math.PI * R;
  const colors = ['var(--ink)', 'var(--moss)', 'var(--amber)', 'var(--leaf)'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={R} fill="none" stroke="var(--rule)" strokeWidth="14" />
        {segs.map((s, i) => {
          const len = s.pct * circumference;
          const dash = `${len} ${circumference - len}`;
          const offset = -s.start * circumference;
          return (
            <circle key={s.potId} cx="70" cy="70" r={R} fill="none"
              stroke={colors[i % 4]} strokeWidth="14"
              strokeDasharray={dash} strokeDashoffset={offset}
              transform="rotate(-90 70 70)" strokeLinecap="butt"
            />
          );
        })}
        <text x="70" y="68" textAnchor="middle" style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, fill: 'var(--ink)' }}>{total}</text>
        <text x="70" y="84" textAnchor="middle" style={{ fontFamily: 'var(--font-body)', fontSize: 10, fill: 'var(--ink-3)' }}>총 TIL</text>
      </svg>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {segs.map((s, i) => (
          <div key={s.potId} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: colors[i % 4] }} />
            <span style={{ color: 'var(--ink)' }}>{s.potName}</span>
            <span style={{ marginLeft: 'auto', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
              {s.tilCount}개 · {s.ratio}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InterestFlow({ interests }) {
  if (!interests || interests.length === 0) {
    return <div style={{ textAlign: 'center', color: 'var(--ink-3)', padding: '20px 0', fontSize: 12 }}>관심사 데이터가 없습니다.</div>;
  }

  const tagTotals = {};
  interests.forEach(m => m.topTags.forEach(t => {
    tagTotals[t.tag] = (tagTotals[t.tag] ?? 0) + t.count;
  }));
  const topTags = Object.entries(tagTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([tag]) => tag);

  const colorKeys = ['var(--ink)', 'var(--moss)', 'var(--amber)', 'var(--leaf)'];
  const tagColors = Object.fromEntries(topTags.map((tag, i) => [tag, colorKeys[i]]));

  const chartData = interests.map(m => {
    const row = Object.fromEntries(topTags.map(t => [t, 0]));
    m.topTags.forEach(t => { if (row[t.tag] !== undefined) row[t.tag] = t.count; });
    return row;
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 140, paddingTop: 12 }}>
        {chartData.map((m, i) => {
          const total = topTags.reduce((s, t) => s + (m[t] ?? 0), 0);
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%' }}>
              <div style={{ flex: 1, width: '70%', display: 'flex', flexDirection: 'column-reverse', borderRadius: '6px 6px 2px 2px', overflow: 'hidden' }}>
                {total > 0 && topTags.map(tag => (
                  m[tag] > 0 && <div key={tag} style={{ height: `${(m[tag] / total) * 100}%`, background: tagColors[tag] }} />
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{interests[i].month}</div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
        {topTags.map((tag, i) => (
          <div key={tag} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--ink-2)' }}>
            <div style={{ width: 9, height: 9, borderRadius: 2, background: colorKeys[i] }} />
            {tag}
          </div>
        ))}
      </div>
    </div>
  );
}

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
        background: goal.done ? 'var(--moss)' : '#fff',
        border: goal.done ? 'none' : '1px solid var(--rule-2)',
        color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {goal.done && Icon.check}
      </div>
      <div style={{ flex: 1, fontSize: 13.5, color: 'var(--ink)', textDecoration: goal.done ? 'line-through' : 'none', opacity: goal.done ? 0.6 : 1 }}>
        {goal.label}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 11.5, fontWeight: 600, color: goal.done ? 'var(--moss-2)' : 'var(--ink-3)' }}>
        +{goal.point}P
      </div>
    </div>
  );
}

function DashboardScreen({ onNav }) {
  const [summary, setSummary]           = useState(null);
  const [grassGrid, setGrassGrid]       = useState(buildGrassGrid([]));
  const [weekly, setWeekly]             = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [interests, setInterests]       = useState([]);
  const [quests, setQuests]             = useState(null);
  const [currentPoint, setCurrentPoint] = useState(0);

  useEffect(() => {
    Promise.allSettled([
      getSummary(),
      getGrass(),
      getWeekly(),
      getDistribution(),
      getInterests(),
      getQuests(),
      getPointSummary(),
    ]).then(([sumRes, grassRes, weekRes, distRes, intRes, questRes, pointRes]) => {
      if (sumRes.status === 'fulfilled')   setSummary(sumRes.value);
      if (grassRes.status === 'fulfilled') setGrassGrid(buildGrassGrid(grassRes.value?.cells ?? []));
      if (weekRes.status === 'fulfilled')  setWeekly(transformWeekly(weekRes.value?.weeklyData ?? []));
      if (distRes.status === 'fulfilled')  setDistribution(distRes.value?.distribution ?? []);
      if (intRes.status === 'fulfilled')   setInterests(intRes.value?.interests ?? []);
      if (questRes.status === 'fulfilled') setQuests(questRes.value);
      if (pointRes.status === 'fulfilled') setCurrentPoint(pointRes.value?.currentPoint ?? 0);
    });
  }, []);

  const streak     = summary?.currentStreak  ?? 0;
  const bestStreak = summary?.longestStreak  ?? 0;
  const totalTil   = summary?.totalTilCount  ?? 0;
  const totalChar  = summary?.totalCharCount ?? 0;

  const goalList    = quests?.quests      ?? [];
  const earnedToday = quests?.earnedToday ?? 0;
  const totalToday  = quests?.totalToday  ?? 0;

  return (
    <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1280, margin: '0 auto' }}>

      {/* Greeting card */}
      <Card padding={24} style={{ background: 'linear-gradient(120deg, #ebf5ef 0%, #f5f7f5 50%, #f9f6ed 100%)', border: '0.5px solid var(--leaf)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <Plant stage="bloom" size={86} />
          <div style={{ flex: 1 }}>
            <div className="eyebrow" style={{ color: 'var(--moss-2)' }}>오늘의 한 줄</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--ink)', marginTop: 6, letterSpacing: '-0.01em' }}>
              "매일의 기록이 뿌리가 되어 꽃을 피웁니다"
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 6 }}>
              연속 <b style={{ color: 'var(--moss-2)' }}>{streak}일</b> 기록 중
            </div>
          </div>
          <Btn variant="green" size="lg" icon={Icon.edit} onClick={() => onNav('editor')}>
            오늘 기록하기
          </Btn>
        </div>
      </Card>

      {/* Stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatTile label="누적 TIL"    value={totalTil}                   suffix="개" sub="누적 작성 수" />
        <StatTile label="연속 기록"   value={streak}                     suffix="일" sub={`최고 ${bestStreak}일`} tone="green" />
        <StatTile label="누적 글자수" value={totalChar.toLocaleString()} suffix="자" sub="총 작성 글자 수" />
        <StatTile label="포인트"      value={currentPoint}               suffix="P"  sub="AI 토큰으로 사용 가능" tone="brown" />
      </div>

      {/* Grass + Today goals */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
        <Card padding={22}>
          <SectionHeader eyebrow="활동" title="잔디 그래프" />
          <GrassGraph data={grassGrid} />
        </Card>

        <Card padding={22}>
          <SectionHeader
            eyebrow={`오늘 · ${new Date().toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }).replace('. ', '.').slice(0, 5)}`}
            title="오늘의 목표"
            action={
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 11.5, color: 'var(--moss-2)', fontWeight: 600 }}>
                {earnedToday} / {totalToday}P
              </span>
            }
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {goalList.map(g => <GoalRow key={g.id} goal={g} />)}
          </div>
        </Card>
      </div>

      {/* 3 column stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <Card padding={22}>
          <SectionHeader eyebrow="연속 기록" title="Streak" action={<Pill tone="green">최고 {bestStreak}일</Pill>} />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 700, color: 'var(--moss-2)', letterSpacing: '-0.03em' }}>{streak}</span>
            <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>일째</span>
          </div>
          <StreakChart />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
            <span>−21d</span><span>오늘</span>
          </div>
        </Card>

        <Card padding={22}>
          <SectionHeader eyebrow="화분별 분포" title="주제 비율" />
          <PotDistribution distribution={distribution} />
        </Card>

        <Card padding={22}>
          <SectionHeader eyebrow="이번 주" title="요일별 작성" />
          <WeeklyBar weekly={weekly.length > 0 ? weekly : DAY_LABELS.map(d => ({ day: d, count: 0 }))} />
        </Card>
      </div>

      {/* Interest flow */}
      <Card padding={22}>
        <SectionHeader eyebrow="관심사 변화" title="시기별 학습 주제 흐름" action={
          <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>지난 6개월 · 태그 기준</span>
        } />
        <InterestFlow interests={interests} />
      </Card>

    </div>
  );
}

export { DashboardScreen, GrassGraph };
