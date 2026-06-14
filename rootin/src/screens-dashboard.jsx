import { useState, useEffect } from 'react';
import { Plant } from './plants.jsx';
import { RtIcon } from './pixel-icons.jsx';
import { getSummary, getGrass, getWeekly, getDistribution, getInterests, getQuests } from './api/dashboard.js';
import { getPointSummary } from './api/points.js';
import { useUser } from './context/UserContext.jsx';
import { playSfx } from './lib/sfx.js';

// ─── SPROUT 팔레트 — 디자인 시스템 토큰(sprout.css)을 단일 소스로 참조 ──
// 차트/SVG에서 쓰는 색은 모두 CSS 변수로 위임해 테마와 항상 일치시킨다.
const SPROUT = {
  ink:    'var(--leaf)',
  body:   'var(--muted-2)',
  muted:  'var(--muted)',
  leaf2:  'var(--leaf-2)',
  leaf3:  'var(--leaf-3)',
  line:   'var(--line)',
  lineStrong: 'var(--line-strong)',
  paper2: 'var(--paper-2)',
  card:   'var(--paper-card)',
  peach:  'var(--peach)',
  peachDeep: 'var(--peach-deep)',
  amber:  'var(--amber)',
  berry:  'var(--berry)',
  sky:    'var(--sky)',
};

// ─── 변환 유틸 ────────────────────────────────────────────────

// months → 주 수 (3개월≈13주, 6개월≈26주, 1년≈52주)
const MONTHS_TO_WEEKS = { 3: 13, 6: 26, 12: 52 };

// BE cells([{date, tilCount, charCount, level}]) → N주×7일 2D 배열 (0~4)
function buildGrassGrid(cells = [], months = 3) {
  const levelMap = {};
  cells.forEach(c => { levelMap[c.date] = c.level; });

  const weeks = MONTHS_TO_WEEKS[months] ?? 13;
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay() - (weeks - 1) * 7);

  return Array.from({ length: weeks }, (_, w) =>
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

// ─── 공용 SPROUT 프리미티브 (이 화면 전용) ─────────────────────

function SectionHead({ eyebrow, title, action }) {
  return (
    <div className="rt-section-head">
      <div className="rt-sh-top">
        <span className="rt-tag">{eyebrow}</span>
        {action}
      </div>
      <h2 className="rt-h3">{title}</h2>
    </div>
  );
}

function StatTile({ icon, label, value, suffix, sub, accent = false }) {
  return (
    <div className={`rt-card rt-stat${accent ? ' rt-stat--accent' : ''}`}>
      <p className="rt-stat-k">{icon && <RtIcon name={icon} />} {label}</p>
      <p className="rt-stat-v">{value}{suffix && <span className="unit">{suffix}</span>}</p>
      {sub && <p className="rt-stat-s">{sub}</p>}
    </div>
  );
}

// 세그먼트 탭 — 옵션 [[label, value], ...], 현재값 cur, 변경 onPick
function SegTabs({ options, cur, onPick }) {
  return (
    <div className="rt-seg">
      {options.map(([label, v]) => (
        <button key={v} className={`rt-seg-item${cur === v ? ' is-active' : ''}`} onClick={() => { playSfx('toggle'); onPick(v); }}>
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── 컴포넌트 ──────────────────────────────────────────────────

// 5단계 농도 램프 — 빈 칸(따뜻한 종이) → 밝은 라임 → 깊은 올리브.
// 단계 간 명도 차를 크게 벌려 농도가 한눈에 구분되도록 한 고대비 픽셀 램프.
const GRASS_SHADES = ['#e7dcc1', '#cfe49a', '#9ec85c', '#5f9a34', '#2f5b1d'];
const GRASS_LABELS = ['기록 없음', '1단계', '2단계', '3단계', '4단계 (많음)'];

function GrassCell({ v, size }) {
  return (
    <div title={GRASS_LABELS[v]} style={{
      width: size, height: size, borderRadius: 2,
      background: GRASS_SHADES[v],
      // 모든 칸에 또렷한 픽셀 테두리 — 타일이 격자처럼 읽히게 한다.
      boxShadow: v === 0 ? 'inset 0 0 0 1px var(--line-strong)' : 'inset 0 0 0 1px rgba(20,40,12,.22)',
    }} />
  );
}

function GrassGraph({ data }) {
  const weekDays = ['', '월', '', '수', '', '금', ''];
  const cellSize = 14;
  const gap = 3;
  return (
    <div>
      <div style={{ display: 'flex', gap: 7 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap, fontSize: 10, color: SPROUT.muted, marginTop: 1 }}>
          {weekDays.map((d, i) => (
            <div key={i} style={{ width: 14, height: cellSize, lineHeight: `${cellSize}px` }}>{d}</div>
          ))}
        </div>
        {/* 1년(52주)도 잘리지 않도록 가로 스크롤 허용 */}
        <div className="scrollbar" style={{ display: 'flex', gap, flex: 1, overflowX: 'auto', paddingBottom: 4 }}>
          {data.map((week, wi) => (
            <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap }}>
              {week.map((v, di) => <GrassCell key={di} v={v} size={cellSize} />)}
            </div>
          ))}
        </div>
      </div>
      <div style={{ borderTop: '2px dotted var(--line-strong)', margin: '16px 0 0' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 12, fontSize: 11, color: SPROUT.muted }}>
        <span>적음</span>
        {GRASS_SHADES.map((c, i) => (
          <div key={i} style={{ width: 13, height: 13, borderRadius: 2, background: c, boxShadow: i === 0 ? 'inset 0 0 0 1px var(--line-strong)' : 'inset 0 0 0 1px rgba(20,40,12,.22)' }} />
        ))}
        <span>많음</span>
        <span style={{ marginLeft: 'auto', color: SPROUT.body }}>글자수로 농도 표현</span>
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
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60, borderBottom: '2px dotted var(--line-strong)', paddingBottom: 1 }}>
      {days.map((d, i) => (
        <div key={i} style={{
          flex: 1, height: d.active ? `${d.h + 18}px` : '4px',
          background: d.active ? 'var(--leaf-2)' : 'var(--paper-2)',
          boxShadow: d.active ? 'inset 0 0 0 1px rgba(20,40,12,.18)' : 'none',
          borderRadius: '2px 2px 0 0',
        }} />
      ))}
    </div>
  );
}

function WeeklyBar({ weekly }) {
  const max = Math.max(...weekly.map(w => w.count), 1);
  // 가장 많이 쓴 요일을 피치로 강조 (전부 0이면 강조 없음)
  const topIdx = weekly.reduce((best, w, i, arr) => (w.count > arr[best].count ? i : best), 0);
  const plotH = 116;
  // 가로 점선 그리드 — 막대 높이를 눈으로 가늠하게 해 가독성을 높인다.
  const ticks = [0, 0.5, 1];
  return (
    <div>
      <div style={{ position: 'relative', height: plotH }}>
        {ticks.map((t) => (
          <div key={t} style={{ position: 'absolute', left: 0, right: 0, bottom: `${t * 100}%`, borderTop: '1px dotted var(--line)' }} />
        ))}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
          {weekly.map((w, i) => {
            const isTop = w.count > 0 && i === topIdx;
            return (
              <div key={i} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', height: '100%' }}>
                <div style={{
                  width: '60%',
                  height: w.count > 0 ? `${Math.max((w.count / max) * 100, 7)}%` : 3,
                  background: w.count > 0 ? (isTop ? 'var(--peach)' : 'var(--leaf-2)') : 'var(--paper-2)',
                  boxShadow: w.count > 0 ? 'inset 0 0 0 1px rgba(20,40,12,.18)' : 'none',
                  borderRadius: '3px 3px 0 0',
                  position: 'relative',
                }}>
                  {w.count > 0 && (
                    <div style={{ position: 'absolute', top: -18, left: 0, right: 0, textAlign: 'center', fontSize: 12, color: isTop ? 'var(--peach-deep)' : 'var(--leaf)' }}>
                      {w.count}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
        {weekly.map((w, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 11.5, color: (w.count > 0 && i === topIdx) ? 'var(--peach-deep)' : 'var(--muted)' }}>{w.day}</div>
        ))}
      </div>
    </div>
  );
}

function PotDistribution({ distribution }) {
  if (!distribution || distribution.length === 0) {
    return <div style={{ textAlign: 'center', color: SPROUT.muted, padding: '20px 0', fontSize: 12 }}>TIL 데이터가 없습니다.</div>;
  }
  const total = distribution.reduce((s, p) => s + p.tilCount, 0);
  let acc = 0;
  const segs = distribution.map(p => {
    const pct = total > 0 ? p.tilCount / total : 0;
    const start = acc;
    acc += pct;
    return { ...p, pct, start };
  });
  const R = 54;
  const circumference = 2 * Math.PI * R;
  // 디자인 시스템 도넛 색 순서: leaf → leaf-2 → peach → amber
  const colors = [SPROUT.ink, SPROUT.leaf2, SPROUT.peach, SPROUT.amber];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={R} fill="none" stroke={SPROUT.paper2} strokeWidth="16" />
        {segs.map((s, i) => {
          const len = s.pct * circumference;
          const dash = `${len} ${circumference - len}`;
          const offset = -s.start * circumference;
          return (
            <circle key={s.potId} cx="70" cy="70" r={R} fill="none"
              stroke={colors[i % 4]} strokeWidth="16"
              strokeDasharray={dash} strokeDashoffset={offset}
              transform="rotate(-90 70 70)" strokeLinecap="butt"
            />
          );
        })}
        <text x="70" y="67" textAnchor="middle" style={{ fontSize: 26, fill: SPROUT.ink }}>{total}</text>
        <text x="70" y="85" textAnchor="middle" style={{ fontSize: 10, letterSpacing: '1px', fill: SPROUT.muted }}>총 TIL</text>
      </svg>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9 }}>
        {segs.map((s, i) => (
          <div key={s.potId} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <div style={{ width: 11, height: 11, borderRadius: 3, background: colors[i % 4], boxShadow: 'inset 0 0 0 1px rgba(51,64,42,.12)' }} />
            <span style={{ color: SPROUT.ink }}>{s.potName}</span>
            <span style={{ marginLeft: 'auto', color: SPROUT.muted, fontSize: 11 }}>
              {s.tilCount}개 · {s.ratio}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 관심사 누적 영역 차트 ──────────────────────────

const COLORS = [SPROUT.leaf2, SPROUT.sky, SPROUT.peachDeep, SPROUT.berry, SPROUT.amber];
const W = 700, H = 220;
const PAD = { top: 14, right: 16, bottom: 36, left: 40 };
const normalizeTag = tag => String(tag ?? '').trim();

function InterestStackedAreaChart({ interests, months, onMonthsChange }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [hiddenTags, setHiddenTags] = useState(new Set());

  // 데이터가 아예 없거나 빈 배열일 때의 방어 처리
  if (!interests || interests.length === 0) {
    return <div style={{ textAlign: 'center', color: SPROUT.muted, padding: '20px 0', fontSize: 12 }}>관심사 데이터가 없습니다.</div>;
  }

  const n = interests.length;

  if (n < 2) {
    return (
      <div style={{
        minHeight: 278,
        border: `1px solid ${SPROUT.line}`,
        borderRadius: 6,
        background: 'linear-gradient(180deg, var(--paper-warm), var(--surface-card))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 28,
      }}>
        <div>
          <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'center' }}>
            <Plant stage="sprout" size={48} />
          </div>
          <div style={{ fontSize: 15, color: SPROUT.ink, marginBottom: 6 }}>
            아직 흐름을 비교하기엔 기록이 조금 부족해요.
          </div>
          <div style={{ fontSize: 12.5, color: SPROUT.body, lineHeight: 1.6 }}>
            2개월 이상 TIL을 쌓으면<br />
            학습 주제가 어떻게 변했는지 보여드릴게요.
          </div>
        </div>
      </div>
    );
  }

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
    return <div style={{ textAlign: 'center', color: SPROUT.muted, padding: '20px 0', fontSize: 12 }}>표시할 학습 주제 데이터가 없습니다.</div>;
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
              <div key={tag} onClick={() => { playSfx('toggle'); toggleTag(tag); }} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 999,
                border: `1px solid color-mix(in oklab, ${COLORS[i]} 35%, transparent)`,
                background: hidden ? 'transparent' : `color-mix(in oklab, ${COLORS[i]} 12%, transparent)`,
                opacity: hidden ? 0.35 : 1,
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
                <div style={{ width: 18, height: 3, borderRadius: 2, background: COLORS[i] }} />
                <span style={{ fontSize: 11.5, color: COLORS[i] }}>{tag}</span>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: SPROUT.muted }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="32" height="8"><rect x="0" y="2" width="32" height="5" rx="2.5" fill={SPROUT.lineStrong} opacity="0.6"/></svg>
            영역 높이 = 작성량
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="32" height="8"><rect x="0" y="2" width="8" height="5" rx="2.5" fill={COLORS[0]}/><rect x="12" y="2" width="8" height="5" rx="2.5" fill={COLORS[1]}/><rect x="24" y="2" width="8" height="5" rx="2.5" fill={COLORS[2]}/></svg>
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
                stroke="rgba(51,64,42,0.08)" strokeWidth={1} />
              <text x={PAD.left - 6} y={yScale(v) + 4} textAnchor="end"
                fontSize={10} fill={SPROUT.muted}>{v}개</text>
            </g>
          ))}

          {/* X축 월 라벨 */}
          {monthLabels.map((label, i) => (
            <text key={i} x={xScale(i)} y={H - 6} textAnchor="middle"
              fontSize={10} fill={hoveredIdx === i ? SPROUT.ink : SPROUT.muted}>
              {label}
            </text>
          ))}

          {/* 호버 시 세로 점선 가이드라인 */}
          {hoveredIdx !== null && (
            <line x1={xScale(hoveredIdx)} y1={PAD.top} x2={xScale(hoveredIdx)} y2={H - PAD.bottom}
              stroke={SPROUT.lineStrong} strokeWidth={1} strokeDasharray="4,3" />
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
                  fill={SPROUT.card} stroke={SPROUT.line} strokeWidth={1}
                  filter="drop-shadow(0 2px 6px rgba(51,64,42,0.12))" />
                <text x={bx + 10} y={PAD.top + 15} fontSize={10} fill={SPROUT.muted}>
                  {monthLabels[hoveredIdx]}
                </text>
                {visibleTags.map((tag, i) => {
                  const ci = topTags.indexOf(tag);
                  const ratio = getMonthlyRatio(tag, hoveredIdx);
                  return (
                    <g key={tag}>
                      <rect x={bx + 10} y={PAD.top + 22 + i * 18} width={8} height={8} rx={2} fill={COLORS[ci]} />
                      <text x={bx + 22} y={PAD.top + 30 + i * 18} fontSize={10} fill={SPROUT.ink}>
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
              flex: 1, background: 'var(--paper-2)', borderRadius: 3, padding: '10px 14px',
              borderLeft: `3px solid ${t.color}`,
            }}>
              <div style={{ fontSize: 10.5, color: SPROUT.muted, marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 14, color: t.color }}>{t.tag}</div>
              <div style={{ fontSize: 10.5, color: SPROUT.muted, marginTop: 2 }}>{sub}</div>
            </div>
          ) : null)}
        </div>
      )}
    </div>
  );
}

function GoalRow({ goal }) {
  return (
    <div className={`rt-row${goal.done ? ' is-done' : ''}`}>
      <span className="rt-check">{goal.done && <RtIcon name="check" />}</span>
      <span className="rt-row-main">{goal.label}</span>
      <span className="rt-row-aside" style={{ color: goal.done ? 'var(--leaf-2)' : 'var(--peach-deep)' }}>
        +{goal.point}P
      </span>
    </div>
  );
}

function DashboardScreen({ onNav }) {
  const { user } = useUser();
  const [summary, setSummary]           = useState(null);
  const [grassMonths, setGrassMonths]   = useState(3);
  const [grassGrid, setGrassGrid]       = useState(buildGrassGrid([], 3));
  const [weekly, setWeekly]             = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [interests, setInterests]           = useState([]);
  const [interestMonths, setInterestMonths] = useState(6);
  const [quests, setQuests]                 = useState(null);
  const [currentPoint, setCurrentPoint]     = useState(0);

  // 잔디 기간 변경 시 재요청
  useEffect(() => {
    let active = true;
    getGrass(grassMonths).then(data => {
      if (!active) return;
      setGrassGrid(buildGrassGrid(data?.cells ?? [], grassMonths));
    }).catch(() => {});
    return () => { active = false; };
  }, [grassMonths]);

  // 관심사 기간 변경 시 재요청
  useEffect(() => {
    let active = true;
    getInterests(interestMonths).then(data => {
      if (!active) return;
      setInterests(data?.interests ?? []);
    }).catch(() => {});
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

  const streak     = summary?.currentStreak  ?? 0;
  const bestStreak = summary?.longestStreak  ?? 0;
  const totalTil   = summary?.totalTilCount  ?? 0;
  const totalChar  = summary?.totalCharCount ?? 0;

  const goalList    = quests?.quests      ?? [];
  const earnedToday = quests?.earnedToday ?? 0;
  const totalToday  = quests?.totalToday  ?? 0;

  const playerName = user?.name || '학습자';
  const level = Math.floor(totalTil / 25) + 1;
  const now = new Date();
  const recDate = `${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
  const hpTotal = goalList.length || 4;
  const hpOn = goalList.filter(g => g.done).length;

  return (
    <div className="rt-app rt-app-dash" style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', minHeight: '100%' }}>

      {/* 게임 HUD 플레이어 바 */}
      <div className="rt-hud">
        <div className="rt-hud-l">
          <RtIcon name="person" /> PLAYER : {playerName} · <span className="rt-hud-lv">Lv.{level}</span>
        </div>
        <div className="rt-hud-r">
          <span className="rt-hud-grp">
            <RtIcon name="heart" /> HP
            <span className="rt-hp">{Array.from({ length: hpTotal }, (_, i) => <i key={i} className={i < hpOn ? 'on' : undefined} />)}</span>
          </span>
          <span className="rt-hud-sep" />
          <span className="rt-hud-grp"><RtIcon name="flame" /> 연속 {streak}</span>
          <span className="rt-hud-sep" />
          <span className="rt-hud-grp"><RtIcon name="star" /> {currentPoint.toLocaleString()}P</span>
          <span className="rt-hud-sep" />
          <span className="rt-hud-grp"><span className="rt-rec-dot" /> REC {recDate}</span>
        </div>
      </div>

      {/* 페이지 헤더 */}
      <div className="rt-page-head">
        <span className="rt-tag"><RtIcon name="home" /> ROOTIN · 대시보드</span>
        <h1 className="rt-page-title">대시보드 <span className="rt-title-cursor" /></h1>
        <p className="rt-page-sub">오늘도 학습이 한 뼘 자랐어요.</p>
      </div>

      {/* Greeting hero card */}
      <div className="rt-card rt-card--hero">
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <div className="rt-pot" style={{ width: 104, height: 104, flex: '0 0 auto' }}>
            <Plant stage="bloom" size={86} />
          </div>
          <div style={{ flex: 1 }}>
            <span className="rt-tag"><RtIcon name="sprout" /> 오늘의 한 줄</span>
            <div className="rt-h3" style={{ marginTop: 10 }}>
              "매일의 기록이 뿌리가 되어 꽃을 피웁니다" <span style={{ color: 'var(--leaf-3)' }}>▼</span>
            </div>
            <div className="rt-small rt-muted" style={{ marginTop: 6 }}>
              연속 <b style={{ color: 'var(--leaf-2)' }}>{streak}일</b> 기록 중 · 오늘도 한 뼘 자랐어요
            </div>
          </div>
          <button className="rt-btn rt-btn--accent" onClick={() => { playSfx('confirm'); onNav('editor'); }}>
            <RtIcon name="plus" /> 오늘 기록하기
          </button>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="rt-grid rt-grid--4">
        <StatTile icon="book"  label="누적 TIL"    value={totalTil}                   suffix="개" sub="누적 작성 수" />
        <StatTile icon="flame" label="연속 기록"   value={streak}                     suffix="일" sub={`최고 ${bestStreak}일`} />
        <StatTile icon="leaf"  label="누적 글자수" value={totalChar.toLocaleString()} suffix="자" sub="총 작성 글자 수" />
        <StatTile icon="star"  label="포인트"      value={currentPoint}               suffix="P"  sub="AI 토큰으로 사용 가능" accent />
      </div>

      {/* Grass + Today goals */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
        <div className="rt-card">
          <SectionHead eyebrow="활동" title="잔디 그래프" action={
            <SegTabs options={[['3개월', 3], ['6개월', 6], ['1년', 12]]} cur={grassMonths} onPick={setGrassMonths} />
          } />
          <GrassGraph data={grassGrid} />
        </div>

        <div className="rt-card">
          <SectionHead
            eyebrow={`오늘 · ${new Date().toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }).replace('. ', '.').slice(0, 5)}`}
            title="오늘의 목표"
            action={
              <span className="rt-badge rt-badge--leaf">{earnedToday} / {totalToday}P</span>
            }
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {goalList.map(g => <GoalRow key={g.id} goal={g} />)}
          </div>
        </div>
      </div>

      {/* 3 column stats row */}
      <div className="rt-grid rt-grid--3">
        <div className="rt-card">
          <SectionHead eyebrow="연속 기록" title="Streak" action={<span className="rt-badge rt-badge--leaf">최고 {bestStreak}일</span>} />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 40, color: 'var(--leaf-2)', lineHeight: 1 }}>{streak}</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>일째</span>
          </div>
          <StreakChart />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: 'var(--text-muted)' }}>
            <span>−21d</span><span>오늘</span>
          </div>
        </div>

        <div className="rt-card">
          <SectionHead eyebrow="화분별 분포" title="주제 비율" />
          <PotDistribution distribution={distribution} />
        </div>

        <div className="rt-card">
          <SectionHead eyebrow="이번 주" title="요일별 작성" />
          <WeeklyBar weekly={weekly.length > 0 ? weekly : DAY_LABELS.map(d => ({ day: d, count: 0 }))} />
        </div>
      </div>

      {/* Interest line chart */}
      <div className="rt-card">
        <SectionHead eyebrow="관심사 변화" title="시기별 학습 주제 흐름" action={
          <SegTabs options={[['6개월', 6], ['12개월', 12]]} cur={interestMonths} onPick={setInterestMonths} />
        } />
        <InterestStackedAreaChart interests={interests} months={interestMonths} onMonthsChange={setInterestMonths} />
      </div>

    </div>
  );
}

export { DashboardScreen, GrassGraph };
