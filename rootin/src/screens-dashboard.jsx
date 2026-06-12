import { useState, useEffect, useMemo } from 'react';
import { Card, Pill, Btn, StatTile, SectionHeader, Icon } from './ui.jsx';
import { Plant } from './plants.jsx';
import { getSummary, getGrass, getWeekly, getDistribution, getInterests, getQuests } from './api/dashboard.js';
import { getPointSummary } from './api/points.js';

// ─── 변환 유틸 ────────────────────────────────────────────────

const GRASS_WEEKS = 52;
const STREAK_CHAR_COUNT_CAP = 1200;
const STREAK_MAX_BAR_HEIGHT = 82;

function getGrassStartDate(referenceDate = new Date(), weeks = GRASS_WEEKS) {
  const start = new Date(referenceDate);
  start.setDate(referenceDate.getDate() - referenceDate.getDay() - (weeks - 1) * 7);
  return start;
}

function buildGrassState(cells = []) {
  const startDate = getGrassStartDate();
  return {
    grid: buildGrassGrid(cells, startDate),
    startDate,
  };
}

// BE cells([{date, tilCount, charCount, level}]) → 52주×7일 2D 배열 (0~4) — 항상 1년 고정
function buildGrassGrid(cells = [], startDate = getGrassStartDate()) {
  const levelMap = {};
  cells.forEach(c => {
    levelMap[String(c.date ?? '').slice(0, 10)] = c.level;
  });

  return Array.from({ length: GRASS_WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const dt = new Date(startDate);
      dt.setDate(startDate.getDate() + w * 7 + d);
      return levelMap[formatDateKey(dt)] ?? 0;
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

function GrassGraph({ data, startDate }) {
  const colors = ['#eef2ee', '#cfe8d6', '#9dd0b0', '#5fb088', '#2e6b48'];
  const weekDays = ['', '월', '', '수', '', '금', ''];
  const cellSize = 14;
  const gap = 4;

  // 각 주(column)의 시작일로 월 레이블 계산
  const start = new Date(startDate ?? getGrassStartDate(new Date(), data.length || GRASS_WEEKS));
  const monthLabels = data.map((_, w) => {
    const cur = new Date(start);
    cur.setDate(start.getDate() + w * 7);
    if (w === 0) return (cur.getMonth() + 1) + '월';
    const prev = new Date(start);
    prev.setDate(start.getDate() + (w - 1) * 7);
    return cur.getMonth() !== prev.getMonth() ? (cur.getMonth() + 1) + '월' : null;
  });

  return (
    <div>
      <div style={{ display: 'flex', gap: 8 }}>
        {/* 요일 레이블 — 월 레이블 행 높이(20px)만큼 상단 패딩 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap, fontFamily: 'var(--font-body)', fontSize: 10.5, fontWeight: 500, color: 'var(--ink-3)', paddingTop: 20 }}>
          {weekDays.map((d, i) => (
            <div key={i} style={{ width: 16, height: cellSize, lineHeight: `${cellSize}px` }}>{d}</div>
          ))}
        </div>
        <div>
          {/* 월 레이블 행 */}
          <div style={{ display: 'flex', gap, marginBottom: 5 }}>
            {monthLabels.map((label, wi) => (
              <div key={wi} style={{ width: cellSize, fontSize: 10.5, fontFamily: 'var(--font-body)', fontWeight: 500, color: 'var(--ink-2)', overflow: 'visible', whiteSpace: 'nowrap' }}>
                {label}
              </div>
            ))}
          </div>
          {/* 잔디 그리드 */}
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
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14, fontFamily: 'var(--font-body)', fontSize: 11.5, fontWeight: 500, color: 'var(--ink-2)' }}>
        <span>적음</span>
        {colors.map((c, i) => (
          <div key={i} style={{ width: 12, height: 12, borderRadius: 3, background: c, border: i === 0 ? '0.5px solid var(--rule)' : 'none' }} />
        ))}
        <span>많음</span>
        <span style={{ marginLeft: 'auto', color: 'var(--ink-2)' }}>글자수로 농도 표현</span>
      </div>
    </div>
  );
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatShortDate(dateKey) {
  const [, month, day] = dateKey.split('-');
  return `${month}.${day}`;
}

function buildRecentStreakDays(cells = [], maxDays = 30) {
  const cellMap = new Map(
    cells.map(cell => [String(cell.date ?? '').slice(0, 10), {
      tilCount: Number(cell.tilCount) || 0,
      charCount: Number(cell.charCount) || 0,
      level: Number(cell.level) || 0,
    }])
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: maxDays }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (maxDays - 1 - index));
    const dateKey = formatDateKey(date);
    const record = cellMap.get(dateKey) ?? { tilCount: 0, charCount: 0 };

    return {
      date: dateKey,
      tilCount: record.tilCount,
      charCount: record.charCount,
      active: record.level > 0 || record.tilCount > 0 || record.charCount > 0,
    };
  });
}

function calculateCurrentStreakFromCells(cells = []) {
  const activeDates = new Set(
    cells
      .filter(cell =>
        (Number(cell.level) || 0) > 0 ||
        (Number(cell.tilCount) || 0) > 0 ||
        (Number(cell.charCount) || 0) > 0
      )
      .map(cell => String(cell.date ?? '').slice(0, 10))
      .filter(Boolean)
  );

  if (activeDates.size === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cursor = new Date(today);

  if (!activeDates.has(formatDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let count = 0;

  while (activeDates.has(formatDateKey(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return count;
}

function StreakActivityChart({ days }) {
  const maxCharCount = Math.max(...days.map(day => Math.min(day.charCount, STREAK_CHAR_COUNT_CAP)), 1);
  const todayKey = formatDateKey(new Date());
  const minActiveBarHeight = 9;

  return (
    <div style={{
      marginTop: 14,
      padding: '13px 12px 9px',
      borderRadius: 16,
      background: 'linear-gradient(180deg, #fbfaf6 0%, #f4f7f0 100%)',
      border: '0.5px solid var(--rule)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 11.5, color: 'var(--ink-2)', fontWeight: 600 }}>최근 30일 작성량</span>
        <span style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>글자수 기준</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 104 }}>
        {days.map(day => {
          const cappedCharCount = Math.min(day.charCount, STREAK_CHAR_COUNT_CAP);
          const ratio = cappedCharCount / maxCharCount;
          const height = day.active
            ? Math.max(minActiveBarHeight, Math.round(Math.sqrt(ratio) * STREAK_MAX_BAR_HEIGHT))
            : 4;
          const isToday = day.date === todayKey;

          return (
            <div
              key={day.date}
              title={`${formatShortDate(day.date)} · ${day.charCount.toLocaleString()}자`}
              style={{
                flex: 1,
                height,
                minWidth: 0,
                borderRadius: day.active ? '5px 5px 2px 2px' : 3,
                background: day.active ? 'linear-gradient(180deg, #3d8b5e, #2e6b48)' : 'var(--rule)',
                opacity: day.active ? 1 : 0.65,
                outline: isToday && day.active ? '1px solid rgba(46, 107, 72, 0.28)' : 'none',
                outlineOffset: 2,
              }}
            />
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 10.5, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
        <span>30일 전</span>
        <span>오늘</span>
      </div>
    </div>
  );
}

function WeeklyBar({ weekly }) {
  const max = Math.max(...weekly.map(w => w.count), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, height: 166, marginTop: 'auto', paddingTop: 14 }}>
      {weekly.map(w => (
        <div key={w.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%' }}>
          <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', borderBottom: '1px solid var(--rule)' }}>
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
  const emptyState = (
    <div style={{
      minHeight: 150,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      border: '0.5px dashed var(--rule-2)',
      borderRadius: 14,
      background: 'linear-gradient(180deg, #fbfaf6 0%, #f6f4ed 100%)',
      color: 'var(--ink-3)',
      padding: '22px 18px',
    }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>🌱</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--ink-2)' }}>
        아직 주제 비율이 없어요
      </div>
      <div style={{ marginTop: 6, fontSize: 12.5, lineHeight: 1.5 }}>
        화분에 TIL을 작성하면<br />주제별 비율이 이곳에 표시됩니다.
      </div>
    </div>
  );

  if (!distribution || distribution.length === 0) {
    return emptyState;
  }

  const normalizePotName = name => {
    const value = String(name ?? '').trim();
    if (!value || value === 'undefined' || value === 'null') return '이름 없는 화분';
    return value;
  };

  const positiveDistribution = distribution
    .map(p => ({
      ...p,
      potName: normalizePotName(p.potName),
      tilCount: Number(p.tilCount) || 0,
      ratio: Number(p.ratio) || 0,
    }))
    .filter(p => p.tilCount > 0)
    .sort((a, b) => b.tilCount - a.tilCount || b.ratio - a.ratio);

  if (positiveDistribution.length === 0) {
    return emptyState;
  }

  const visiblePots = positiveDistribution.slice(0, 5);
  const hiddenPots = positiveDistribution.slice(5);
  const total = positiveDistribution.reduce((s, p) => s + p.tilCount, 0);
  const hiddenTilCount = hiddenPots.reduce((s, p) => s + p.tilCount, 0);
  const formatRatio = count => {
    const ratio = total > 0 ? (count / total) * 100 : 0;
    return Number.isInteger(ratio) ? String(ratio) : ratio.toFixed(1).replace(/\.0$/, '');
  };
  const displayDistribution = hiddenTilCount > 0
    ? [
        ...visiblePots,
        {
          potId: '__others__',
          potName: '기타',
          tilCount: hiddenTilCount,
        },
      ]
    : visiblePots;

  let acc = 0;
  const segs = displayDistribution.map(p => {
    const pct = total > 0 ? p.tilCount / total : 0;
    const start = acc;
    acc += pct;
    return { ...p, ratio: formatRatio(p.tilCount), pct, start };
  });
  const R = 56;
  const circumference = 2 * Math.PI * R;
  const hasHiddenItems = hiddenPots.length > 0;
  const colors = ['#1f4f3a', '#2563eb', '#d97706', '#7c3aed', '#db2777', '#9ca3af'];
  const getSegmentKey = (segment, index) => segment.potId ?? `${segment.potName}-${index}`;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
      <svg width="144" height="144" viewBox="0 0 140 140" style={{ flex: '0 0 144px' }}>
        <circle cx="70" cy="70" r={R} fill="none" stroke="var(--rule)" strokeWidth="14" />
        {segs.map((s, i) => {
          const len = s.pct * circumference;
          const dash = `${len} ${circumference - len}`;
          const offset = -s.start * circumference;
          return (
            <circle key={getSegmentKey(s, i)} cx="70" cy="70" r={R} fill="none"
              stroke={colors[i % colors.length]} strokeWidth="14"
              strokeDasharray={dash} strokeDashoffset={offset}
              transform="rotate(-90 70 70)" strokeLinecap="butt"
            />
          );
        })}
        <text x="70" y="68" textAnchor="middle" style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, fill: 'var(--ink)' }}>{total}</text>
        <text x="70" y="84" textAnchor="middle" style={{ fontFamily: 'var(--font-body)', fontSize: 10, fill: 'var(--ink-3)' }}>{hasHiddenItems ? 'TOP 5+' : '총 TIL'}</text>
      </svg>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {segs.map((s, i) => (
          <div key={getSegmentKey(s, i)} style={{ display: 'grid', gridTemplateColumns: '12px minmax(0, 1fr) auto', alignItems: 'center', gap: 10, fontSize: 14 }}>
            <div style={{ width: 11, height: 11, borderRadius: 3, background: colors[i % colors.length] }} />
            <span title={s.potName} style={{
              color: 'var(--ink)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
            }}>
              {s.potName}
            </span>
            <span style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontSize: 12.5, whiteSpace: 'nowrap' }}>
              {s.tilCount}개 · {s.ratio}%
            </span>
          </div>
        ))}
        {hasHiddenItems && (
          <div style={{ marginTop: 2, fontSize: 11.5, color: 'var(--ink-3)' }}>
            상위 {visiblePots.length}개 화분과 기타 항목을 표시해요.
          </div>
        )}
      </div>
    </div>
  );
}

// ── 관심사 누적 영역 차트 ──────────────────────────

const COLORS = ['#1a3a5c', '#3d8b5e', '#c8733a', '#534ab7', '#c45c8a'];
const W = 700, H = 220;
const PAD = { top: 14, right: 16, bottom: 36, left: 40 };
const normalizeTag = tag => String(tag ?? '').trim();

function InterestStackedAreaChart({ interests }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [hiddenTags, setHiddenTags] = useState(new Set());

  const emptyState = (title, description) => (
    <div style={{
      minHeight: 278,
      border: '1px solid var(--line)',
      borderRadius: 8,
      background: 'linear-gradient(180deg, rgba(233, 245, 235, 0.8), rgba(255, 255, 255, 0.9))',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: 28,
    }}>
      <div>
        <div style={{ fontSize: 30, marginBottom: 10 }}>🌱</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
          {title}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.6 }}>
          {description}
        </div>
      </div>
    </div>
  );

  // 데이터가 없거나 1개월뿐이면 변화 추이를 비교할 수 없으므로 같은 안내 화면을 보여줍니다.
  if (!interests || interests.length < 2) {
    return emptyState(
      '아직 흐름을 비교하기엔 기록이 조금 부족해요.',
      <>
        2개월 이상 TIL을 쌓으면<br />
        학습 주제가 어떻게 변했는지 보여드릴게요.
      </>
    );
  }

  const n = interests.length;

  // 1. 상위 5개 태그 추출 및 'undefined' 방어 처리
  const tagTotals = {};
  interests.forEach(m => {
    if (m.topTags && Array.isArray(m.topTags)) {
      m.topTags.forEach(t => {
        const tag = normalizeTag(t.tag);
        const count = Number(t.count) || 0;
        // 태그명이 존재하고, 문자열 'undefined'나 공백이 아닌 경우에만 정상 집계합니다.
        if (tag && tag !== 'undefined') {
          tagTotals[tag] = (tagTotals[tag] ?? 0) + count;
        }
      });
    }
  });

  // 누적 작성 개수가 가장 많은 순서대로 상위 5개 태그를 추출합니다.
  const topTags = Object.entries(tagTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);

  if (topTags.length === 0) {
    return emptyState(
      '아직 흐름을 비교하기엔 기록이 조금 부족해요.',
      <>
        2개월 이상 TIL을 쌓으면<br />
        학습 주제가 어떻게 변했는지 보여드릴게요.
      </>
    );
  }

  // 월별 라벨 추출 (예: '2026-05' -> '05월')
  const monthLabels = interests.map(m => (m.month ? m.month.slice(5) + '월' : ''));

  // 2. 태그별 월별 count 추출
  const tagCounts = {};
  topTags.forEach(tag => {
    tagCounts[tag] = interests.map(m => {
      if (!m.topTags) return 0;
      const f = m.topTags.find(t => normalizeTag(t.tag) === tag);
      return f ? Number(f.count) || 0 : 0;
    });
  });

  // 월별 표시 태그 합계. 툴팁과 요약 카드에서 각 주제의 월별 비율을 계산할 때 사용합니다.
  const monthTotals = interests.map((_, i) =>
    topTags.reduce((sum, tag) => sum + tagCounts[tag][i], 0)
  );

  const getMonthlyRatio = (tag, monthIndex) => {
    const total = monthTotals[monthIndex] || 0;
    if (total === 0) return 0;
    return Math.round((tagCounts[tag][monthIndex] / total) * 100);
  };

  // 현재 숨겨지지 않은(활성화된) 태그 필터링
  const activeTags = topTags.filter(tag => !hiddenTags.has(tag));

  // 3. Y축 누적(Stacking) 데이터 연산
  // stackedCounts[활성태그인덱스][월인덱스] = 누적 높이 값
  const stackedCounts = Array.from({ length: activeTags.length }, () => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    let currentSum = 0;
    for (let ci = 0; ci < activeTags.length; ci++) {
      const tag = activeTags[ci];
      currentSum += tagCounts[tag][i];
      // 하단부터 차례차례 개수를 쌓아 올립니다.
      stackedCounts[ci][i] = currentSum;
    }
  }

  // 숨긴 태그가 있어도 Y축 스케일이 흔들리지 않도록 전체 상위 태그 기준으로 최댓값을 고정합니다.
  const maxCount = Math.max(
    ...Array.from({ length: n }, (_, i) => {
      let sum = 0;
      topTags.forEach(tag => { sum += tagCounts[tag][i]; });
      return sum;
    }),
    1 // 데이터가 없거나 0일 경우의 나눗셈 분모 에러 방지
  );

  const plotWidth = W - PAD.left - PAD.right;

  // SVG 좌표 변환용 비례식 함수. 월 데이터가 1개뿐이면 차트 중앙에 배치합니다.
  const xScale = i => PAD.left + (n <= 1 ? 0.5 : (i / (n - 1))) * plotWidth;
  const yScale = v => PAD.top + (1 - v / maxCount) * (H - PAD.top - PAD.bottom);

  // 4. SVG 누적 영역 패스(Area Path) 빌드 함수
  const getAreaPath = (ci) => {
    if (n === 1) {
      const x = xScale(0);
      const halfWidth = Math.min(56, plotWidth * 0.12);
      const yTop = yScale(stackedCounts[ci][0]);
      const yBottom = yScale(ci === 0 ? 0 : stackedCounts[ci - 1][0]);
      return `M ${x - halfWidth},${yTop} L ${x + halfWidth},${yTop} L ${x + halfWidth},${yBottom} L ${x - halfWidth},${yBottom} Z`;
    }

    const topPoints = [];     // 현재 레이어의 윗선 좌표들
    const bottomPoints = [];  // 현재 레이어의 밑선 좌표들 (이전 레이어의 윗선)

    for (let i = 0; i < n; i++) {
      const x = xScale(i);
      const yTop = yScale(stackedCounts[ci][i]);
      // 첫 번째 활성 태그의 밑선은 바닥 Y좌표(0)이고, 그 외에는 이전 태그의 누적 윗선을 밑선으로 사용합니다.
      const yBottom = yScale(ci === 0 ? 0 : stackedCounts[ci - 1][i]);

      topPoints.push(`${x},${yTop}`);
      // 영역을 완성하기 위해 우측에서 좌측으로 역순으로 좌표를 연결합니다.
      bottomPoints.unshift(`${x},${yBottom}`);
    }

    // M(시작점 이동) -> L(선 연결) -> Z(패스 닫기) 형태로 다각형 영역을 그리는 경로를 완성합니다.
    return `M ${topPoints.join(' L ')} L ${bottomPoints.join(' L ')} Z`;
  };

  const getTopPath = (ci) => {
    if (n === 1) {
      const x = xScale(0);
      const halfWidth = Math.min(56, plotWidth * 0.12);
      const y = yScale(stackedCounts[ci][0]);
      return `M ${x - halfWidth},${y} L ${x + halfWidth},${y}`;
    }

    return `M ${Array.from({ length: n }, (_, i) => `${xScale(i)},${yScale(stackedCounts[ci][i])}`).join(' L ')}`;
  };

  // Y축 눈금선 (5등분). 데이터가 작을 때 같은 숫자가 반복되지 않도록 중복을 제거합니다.
  const yTicks = Array.from(new Set(
    Array.from({ length: 5 }, (_, i) => Math.round((maxCount / 4) * i))
  ));

  // 요약 카드용 연산
  const totals = topTags.map((tag, ci) => ({
    tag, color: COLORS[ci],
    sum: tagCounts[tag].reduce((a, b) => a + b, 0),
    lastCount: tagCounts[tag].at(-1),
    lastRatio: getMonthlyRatio(tag, n - 1),
  })).filter(t => !hiddenTags.has(t.tag));

  const topSum          = [...totals].sort((a, b) => b.sum - a.sum)[0];
  const topThis         = [...totals].sort((a, b) => b.lastCount - a.lastCount || b.lastRatio - a.lastRatio || b.sum - a.sum)[0];
  const topMonthlyRatio = [...totals].sort((a, b) => b.lastRatio - a.lastRatio || b.lastCount - a.lastCount)[0];

  // 범례 클릭 시 활성/비활성 전환 토글 함수
  const toggleTag = tag => {
    setHiddenTags(prev => {
      const next = new Set(prev);
      if (next.has(tag)) { next.delete(tag); }
      else if (next.size < topTags.length - 1) { next.add(tag); }
      return next;
    });
  };

  // 마우스 이동 시 호버 중인 월(Month) 인덱스 계산 핸들러
  const handleMouseMove = e => {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    const svgY = ((e.clientY - rect.top) / rect.height) * H;

    const isInsidePlot =
      svgX >= PAD.left &&
      svgX <= W - PAD.right &&
      svgY >= PAD.top &&
      svgY <= H - PAD.bottom;

    if (!isInsidePlot) {
      setHoveredIdx(null);
      return;
    }

    if (n <= 1) { setHoveredIdx(0); return; }
    let closest = 0;
    let minDist = Infinity;
    for (let i = 0; i < n; i++) {
      const dist = Math.abs(svgX - xScale(i));
      if (dist < minDist) { minDist = dist; closest = i; }
    }
    setHoveredIdx(closest);
  };

  return (
    <div>
      {/* 범례 + 그래프 안내 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {topTags.map((tag, i) => {
            const hidden = hiddenTags.has(tag);
            return (
              <div key={tag} onClick={() => toggleTag(tag)} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 20,
                border: `0.5px solid ${COLORS[i]}50`,
                background: hidden ? 'transparent' : `${COLORS[i]}18`,
                opacity: hidden ? 0.35 : 1,
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
                <div style={{ width: 18, height: 3, borderRadius: 2, background: COLORS[i] }} />
                <span style={{ fontSize: 11.5, color: COLORS[i], fontWeight: 500 }}>{tag}</span>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--ink-3)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="32" height="8"><rect x="0" y="2" width="32" height="5" rx="2.5" fill="#aaa" opacity="0.45"/></svg>
            영역 높이 = 작성량
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="32" height="8"><rect x="0" y="2" width="8" height="5" rx="2.5" fill="#1a3a5c"/><rect x="12" y="2" width="8" height="5" rx="2.5" fill="#3d8b5e"/><rect x="24" y="2" width="8" height="5" rx="2.5" fill="#c8733a"/></svg>
            색상 = 학습 주제
          </span>
        </div>
      </div>

      {/* SVG 차트 */}
      <div style={{ position: 'relative' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`} width="100%" height={H}
          style={{ overflow: 'visible', cursor: 'crosshair', display: 'block', maxWidth: W, margin: '0 auto' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          {/* Y축 가로 눈금선 */}
          {yTicks.map(v => (
            <g key={v}>
              <line x1={PAD.left} y1={yScale(v)} x2={W - PAD.right} y2={yScale(v)}
                stroke="rgba(0,0,0,0.05)" strokeWidth={1} />
              <text x={PAD.left - 6} y={yScale(v) + 4} textAnchor="end"
                fontSize={10} fill="#aaa">{v}개</text>
            </g>
          ))}

          {/* X축 월 라벨 */}
          {monthLabels.map((label, i) => (
            <text key={i} x={xScale(i)} y={H - 6} textAnchor="middle"
              fontSize={10} fill={hoveredIdx === i ? '#1a3a5c' : '#bbb'} fontWeight={hoveredIdx === i ? 600 : 400}>
              {label}
            </text>
          ))}

          {/* 호버 시 세로 점선 가이드라인 */}
          {hoveredIdx !== null && (
            <line x1={xScale(hoveredIdx)} y1={PAD.top} x2={xScale(hoveredIdx)} y2={H - PAD.bottom}
              stroke="#ddd" strokeWidth={1} strokeDasharray="4,3" />
          )}

          {/* 태그별 누적 영역 렌더링 */}
          {activeTags.map((tag, ci) => {
            const originalColorIdx = topTags.indexOf(tag);
            const color = COLORS[originalColorIdx];
            const areaD = getAreaPath(ci);

            return (
              <g key={tag}>
                {/* 1. 누적 영역 채우기 패스 */}
                <path
                  d={areaD}
                  fill={color}
                  opacity={0.35} // 겹치거나 누적된 아래 영역이 은은하게 보이도록 반투명 처리
                />
                {/* 2. 영역 경계를 더 선명하게 보여줄 상단 라인 패스 */}
                <path
                  d={getTopPath(ci)}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  opacity={0.8}
                />
              </g>
            );
          })}

          {/* 호버 툴팁 */}
          {hoveredIdx !== null && (() => {
            const tx = xScale(hoveredIdx);
            const isRight = tx > W * 0.7;
            const bx = isRight ? tx - 144 : tx + 12;
            const visibleTags = topTags.filter(t => !hiddenTags.has(t) && tagCounts[t][hoveredIdx] > 0);
            if (visibleTags.length === 0) return null;
            const bh = 24 + visibleTags.length * 18;
            return (
              <g>
                <rect x={bx} y={PAD.top} width={132} height={bh} rx={6}
                  fill="white" stroke="#e0ece0" strokeWidth={0.5}
                  filter="drop-shadow(0 2px 6px rgba(0,0,0,0.08))" />
                <text x={bx + 10} y={PAD.top + 15} fontSize={10} fill="#aaa">
                  {monthLabels[hoveredIdx]}
                </text>
                {visibleTags.map((tag, i) => {
                  const ci = topTags.indexOf(tag);
                  const ratio = getMonthlyRatio(tag, hoveredIdx);
                  return (
                    <g key={tag}>
                      <rect x={bx + 10} y={PAD.top + 22 + i * 18} width={8} height={8} rx={2} fill={COLORS[ci]} />
                      <text x={bx + 22} y={PAD.top + 30 + i * 18} fontSize={10} fill="#333">
                        {tag}: {tagCounts[tag][hoveredIdx]}개 · {ratio}%
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })()}
        </svg>
      </div>

      {/* 요약 카드 */}
      {totals.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          {[
            { label: '누적 최다 주제',     t: topSum,          sub: `${topSum?.sum ?? 0}개` },
            { label: '이번 달 최다 주제',  t: topThis,         sub: `${topThis?.lastCount ?? 0}개 · ${topThis?.lastRatio ?? 0}%` },
            { label: '이번 달 비중 1위',   t: topMonthlyRatio, sub: `${topMonthlyRatio?.lastRatio ?? 0}% · ${topMonthlyRatio?.lastCount ?? 0}개` },
          ].map(({ label, t, sub }) => t ? (
            <div key={label} style={{
              flex: 1, background: 'var(--paper-2)', borderRadius: 10, padding: '10px 14px',
              borderLeft: `3px solid ${t.color}`,
            }}>
              <div style={{ fontSize: 10.5, color: 'var(--ink-3)', marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: t.color, fontFamily: 'var(--font-display)' }}>{t.tag}</div>
              <div style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 2 }}>{sub}</div>
            </div>
          ) : null)}
        </div>
      )}
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
    getGrass(12).then(data => {
      const cells = data?.cells ?? [];
      setGrassState(buildGrassState(cells));
      setGrassCells(cells);
    }).catch(error => {
      console.error('잔디 그래프 조회 중 오류 발생:', error);
    });
  }, []);

  // 관심사 기간 변경 시 재요청
  useEffect(() => {
    getInterests(interestMonths).then(data => {
      setInterests(data?.interests ?? []);
    }).catch(error => {
      console.error('시기별 학습 주제 흐름 조회 중 오류 발생:', error);
    });
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

  return (
    <div style={{ padding: 32, width: '100%', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1600, margin: '0 auto', fontFamily: 'var(--font-body)' }}>

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
          <GrassGraph data={grassState.grid} startDate={grassState.startDate} />
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
          <SectionHeader eyebrow="연속 기록" title="Streak" action={
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <Pill tone="green">현재 {streak}일째</Pill>
              <Pill tone="green">최고 {bestStreak}일</Pill>
            </div>
          } />
          <StreakActivityChart days={recentStreakDays} />
        </Card>

        <Card padding={22}>
          <SectionHeader eyebrow="화분별 분포" title="주제 비율" />
          <PotDistribution distribution={distribution} />
        </Card>

        <Card padding={22} style={{ display: 'flex', flexDirection: 'column' }}>
          <SectionHeader eyebrow="이번 주" title="요일별 작성" />
          <WeeklyBar weekly={weekly.length > 0 ? weekly : DAY_LABELS.map(d => ({ day: d, count: 0 }))} />
        </Card>
      </div>

      {/* Interest line chart */}
      <Card padding={22}>
        <SectionHeader eyebrow="관심사 변화" title="시기별 학습 주제 흐름" action={
          <div style={{ display: 'flex', gap: 4 }}>
            {[['6개월', 6], ['12개월', 12]].map(([label, m]) => (
              <button key={m} onClick={() => setInterestMonths(m)} style={{
                padding: '5px 10px', fontSize: 11.5, borderRadius: 7,
                background: interestMonths === m ? 'var(--ink)' : 'transparent',
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
  );
}

export { DashboardScreen, GrassGraph };
