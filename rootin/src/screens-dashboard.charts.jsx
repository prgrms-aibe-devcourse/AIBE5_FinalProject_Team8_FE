// 대시보드 차트 컴포넌트 모음 — classic/dark 테마 전용 (게임보이는 screens-dashboard.jsx에 별도 보유).
// 차트 렌더링만 담당하며, 데이터 변환 로직은 screens-dashboard.logic.js 를 공유한다.
// 다크 대응: 데이터 색(CHART_COLORS)은 정체성이라 모드 공통, 격자/축/툴팁 등 '크롬'은 var() 토큰으로 모드 자동 적응.
import { useState } from 'react';
import {
  GRASS_WEEKS,
  STREAK_CHAR_COUNT_CAP,
  formatDateKey,
  formatShortDate,
  getGrassStartDate,
} from './screens-dashboard.logic.js';

// 데이터 카테고리 색 — 도넛(주제 비율)과 누적영역(학습 주제 흐름)이 공유하는 6색 categorical 팔레트.
// moss/amber/coral/blue/purple/gray. 데이터 정체성이라 light/dark 공통으로 유지한다.
export const CHART_COLORS = ['#4F7C52', '#E6B14E', '#E08A6B', '#7FA9B5', '#B79BC9', '#9A9082'];

const STREAK_MAX_BAR_HEIGHT = 82;

// ─── 잔디 그래프 ──────────────────────────────────────────────
export function GrassGraph({ data, startDate }) {
  const colors = ['var(--grass-0)', 'var(--grass-1)', 'var(--grass-2)', 'var(--grass-3)', 'var(--grass-4)'];
  const weekDays = ['', '월', '', '수', '', '금', ''];
  const weeks = data.length || GRASS_WEEKS;

  // viewBox 좌표계 — SVG가 width:100%로 컨테이너에 맞춰 통째로 스케일되므로
  // 셀·레이블이 같은 비율로 줄어 1년치(52주)가 가로 스크롤 없이 한눈에 들어오고,
  // 셀과 요일/월 레이블의 정렬이 어떤 폭에서도 깨지지 않는다.
  const cell = 13, gap = 3, dayLabelW = 18, monthRowH = 14;
  const step = cell + gap;
  const vbW = dayLabelW + weeks * step - gap;
  const vbH = monthRowH + 7 * step - gap;

  // 각 주(column)의 시작일로 월 레이블 계산
  const start = new Date(startDate ?? getGrassStartDate(new Date(), weeks));
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
      <svg viewBox={`0 0 ${vbW} ${vbH}`} width="100%" style={{ display: 'block', height: 'auto' }}>
        {/* 월 레이블 */}
        {monthLabels.map((label, w) => label ? (
          <text key={`m${w}`} x={dayLabelW + w * step} y={monthRowH - 4}
            fontSize="9" style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fill: 'var(--ink-2)' }}>{label}</text>
        ) : null)}
        {/* 요일 레이블 */}
        {weekDays.map((d, i) => d ? (
          <text key={`d${i}`} x={dayLabelW - 5} y={monthRowH + i * step + cell - 3} textAnchor="end"
            fontSize="9" style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fill: 'var(--ink-3)' }}>{d}</text>
        ) : null)}
        {/* 잔디 셀 */}
        {data.map((week, w) =>
          week.map((v, d) => (
            <rect key={`${w}-${d}`} x={dayLabelW + w * step} y={monthRowH + d * step}
              width={cell} height={cell} rx="2.5"
              style={{ fill: colors[v], stroke: v === 0 ? 'var(--rule)' : 'transparent', strokeWidth: 0.5 }} />
          ))
        )}
      </svg>

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

// ─── 최근 30일 작성량 (스트릭) ────────────────────────────────
export function StreakActivityChart({ days }) {
  const maxCharCount = Math.max(...days.map(day => Math.min(day.charCount, STREAK_CHAR_COUNT_CAP)), 1);
  const todayKey = formatDateKey(new Date());
  const minActiveBarHeight = 9;

  return (
    <div style={{
      marginTop: 14,
      padding: '13px 12px 9px',
      borderRadius: 16,
      background: 'var(--grad-sheen)',
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
                background: day.active ? 'linear-gradient(180deg, var(--moss), var(--moss-2))' : 'var(--rule)',
                opacity: day.active ? 1 : 0.65,
                outline: isToday && day.active ? '1px solid color-mix(in oklch, var(--moss) 35%, transparent)' : 'none',
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

// ─── 요일별 작성 ──────────────────────────────────────────────
export function WeeklyBar({ weekly }) {
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

// ─── 화분별 주제 비율 (도넛) ──────────────────────────────────
export function PotDistribution({ distribution }) {
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
      background: 'var(--grad-sheen)',
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
              stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth="14"
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
            <div style={{ width: 11, height: 11, borderRadius: 3, background: CHART_COLORS[i % CHART_COLORS.length] }} />
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
const W = 700, H = 220;
const PAD = { top: 14, right: 16, bottom: 36, left: 40 };
const normalizeTag = tag => String(tag ?? '').trim();

export function InterestStackedAreaChart({ interests }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [hiddenTags, setHiddenTags] = useState(new Set());

  const emptyState = (title, description) => (
    <div style={{
      minHeight: 278,
      border: '1px solid var(--line)',
      borderRadius: 8,
      background: 'var(--grad-sheen)',
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
    tag, color: CHART_COLORS[ci],
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
                border: `0.5px solid ${CHART_COLORS[i]}50`,
                background: hidden ? 'transparent' : `${CHART_COLORS[i]}18`,
                opacity: hidden ? 0.35 : 1,
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
                <div style={{ width: 18, height: 3, borderRadius: 2, background: CHART_COLORS[i] }} />
                <span style={{ fontSize: 11.5, color: CHART_COLORS[i], fontWeight: 500 }}>{tag}</span>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--ink-3)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="32" height="8"><rect x="0" y="2" width="32" height="5" rx="2.5" opacity="0.45" style={{ fill: 'var(--ink-3)' }}/></svg>
            영역 높이 = 작성량
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="32" height="8"><rect x="0" y="2" width="8" height="5" rx="2.5" fill={CHART_COLORS[0]}/><rect x="12" y="2" width="8" height="5" rx="2.5" fill={CHART_COLORS[1]}/><rect x="24" y="2" width="8" height="5" rx="2.5" fill={CHART_COLORS[2]}/></svg>
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
                strokeWidth={1} style={{ stroke: 'var(--chart-grid)' }} />
              <text x={PAD.left - 6} y={yScale(v) + 4} textAnchor="end"
                fontSize={10} style={{ fill: 'var(--ink-3)' }}>{v}개</text>
            </g>
          ))}

          {/* X축 월 라벨 */}
          {monthLabels.map((label, i) => (
            <text key={i} x={xScale(i)} y={H - 6} textAnchor="middle"
              fontSize={10} fontWeight={hoveredIdx === i ? 600 : 400}
              style={{ fill: hoveredIdx === i ? 'var(--ink)' : 'var(--ink-3)' }}>
              {label}
            </text>
          ))}

          {/* 호버 시 세로 점선 가이드라인 */}
          {hoveredIdx !== null && (
            <line x1={xScale(hoveredIdx)} y1={PAD.top} x2={xScale(hoveredIdx)} y2={H - PAD.bottom}
              strokeWidth={1} strokeDasharray="4,3" style={{ stroke: 'var(--chart-guide)' }} />
          )}

          {/* 태그별 누적 영역 렌더링 */}
          {activeTags.map((tag, ci) => {
            const originalColorIdx = topTags.indexOf(tag);
            const color = CHART_COLORS[originalColorIdx];
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
                  strokeWidth={0.5}
                  filter="drop-shadow(0 3px 8px rgba(0,0,0,0.18))"
                  style={{ fill: 'var(--popover)', stroke: 'var(--border)' }} />
                <text x={bx + 10} y={PAD.top + 15} fontSize={10} style={{ fill: 'var(--ink-3)' }}>
                  {monthLabels[hoveredIdx]}
                </text>
                {visibleTags.map((tag, i) => {
                  const ci = topTags.indexOf(tag);
                  const ratio = getMonthlyRatio(tag, hoveredIdx);
                  return (
                    <g key={tag}>
                      <rect x={bx + 10} y={PAD.top + 22 + i * 18} width={8} height={8} rx={2} fill={CHART_COLORS[ci]} />
                      <text x={bx + 22} y={PAD.top + 30 + i * 18} fontSize={10} style={{ fill: 'var(--ink)' }}>
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

      {/* 요약 카드 — 학습 주제 하이라이트 (식물색 마커 + 비중 growth 바) */}
      {totals.length > 0 && (() => {
        const cumTotal = totals.reduce((s, x) => s + x.sum, 0) || 1;
        const cards = [
          { label: '누적 최다 주제',    t: topSum,          metric: `${topSum?.sum ?? 0}개`,                                       pct: Math.round(((topSum?.sum ?? 0) / cumTotal) * 100) },
          { label: '이번 달 최다 주제', t: topThis,         metric: `${topThis?.lastCount ?? 0}개 · ${topThis?.lastRatio ?? 0}%`,  pct: topThis?.lastRatio ?? 0 },
          { label: '이번 달 비중 1위',  t: topMonthlyRatio, metric: `${topMonthlyRatio?.lastRatio ?? 0}% · ${topMonthlyRatio?.lastCount ?? 0}개`, pct: topMonthlyRatio?.lastRatio ?? 0 },
        ];
        return (
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            {cards.map(({ label, t, metric, pct }) => t ? (
              <div key={label} style={{
                flex: 1, minWidth: 0,
                display: 'flex', flexDirection: 'column',
                borderRadius: 16, padding: '15px 17px 16px',
                background: `linear-gradient(155deg, color-mix(in oklch, ${t.color} 11%, var(--card)) 0%, var(--card) 72%)`,
                border: `1px solid color-mix(in oklch, ${t.color} 26%, var(--rule))`,
                boxShadow: 'var(--shadow-sm)',
              }}>
                {/* 라벨 + 식물색 마커 점 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, flexShrink: 0, boxShadow: `0 0 0 4px color-mix(in oklch, ${t.color} 16%, transparent)` }} />
                  <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)', fontFamily: 'var(--font-display)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
                </div>
                {/* 주제명 — 라이트는 원색 그대로(100%), 다크는 ink와 섞어 대비 확보 */}
                <div title={t.tag} style={{ fontSize: 20, fontWeight: 700, color: `color-mix(in oklch, ${t.color} var(--cat-text-mix), var(--ink))`, fontFamily: 'var(--font-display)', letterSpacing: '-0.015em', marginTop: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.tag}</div>
                {/* 비중 growth 바 + 수치 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 11 }}>
                  <div style={{ flex: 1, height: 5, borderRadius: 999, background: `color-mix(in oklch, ${t.color} 14%, var(--paper-3))`, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, pct))}%`, background: t.color, borderRadius: 999, transition: 'width 500ms cubic-bezier(.2,.7,.3,1)' }} />
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--ink-2)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{metric}</span>
                </div>
              </div>
            ) : null)}
          </div>
        );
      })()}
    </div>
  );
}
