import { useState, useEffect } from 'react';
import { Card, Pill, Btn, StatTile, SectionHeader, Icon } from './ui.jsx';
import { Plant } from './plants.jsx';
import { getSummary, getGrass, getWeekly, getDistribution, getInterests, getQuests } from './api/dashboard.js';
import { getPointSummary } from './api/points.js';

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

// ── 관심사 라인 차트 (선 두께 = 밀도) ──────────────────────────

const COLORS = ['#1a3a5c', '#3d8b5e', '#c8733a', '#534ab7', '#c45c8a'];
const W = 700, H = 220;
const PAD = { top: 14, right: 16, bottom: 36, left: 40 };

function InterestLineChart({ interests, months, onMonthsChange }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [hiddenTags, setHiddenTags] = useState(new Set());

  if (!interests || interests.length === 0) {
    return <div style={{ textAlign: 'center', color: 'var(--ink-3)', padding: '20px 0', fontSize: 12 }}>관심사 데이터가 없습니다.</div>;
  }

  // 상위 5개 태그
  const tagTotals = {};
  interests.forEach(m => m.topTags.forEach(t => {
    tagTotals[t.tag] = (tagTotals[t.tag] ?? 0) + t.count;
  }));
  const topTags = Object.entries(tagTotals)
    .sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tag]) => tag);

  const n = interests.length;
  const monthLabels = interests.map(m => m.month.slice(5) + '월');

  // 태그별 월별 count
  const tagCounts = {};
  topTags.forEach(tag => {
    tagCounts[tag] = interests.map(m => {
      const f = m.topTags.find(t => t.tag === tag);
      return f ? Number(f.count) : 0;
    });
  });

  // 태그별 상대 밀도 (0~1)
  const tagDensity = {};
  topTags.forEach(tag => {
    const mx = Math.max(...tagCounts[tag], 1);
    tagDensity[tag] = tagCounts[tag].map(c => c / mx);
  });

  const maxCount = Math.max(...topTags.flatMap(tag => tagCounts[tag]), 1);
  const xScale = i => PAD.left + (n <= 1 ? 0 : (i / (n - 1))) * (W - PAD.left - PAD.right);
  const yScale = v => PAD.top + (1 - v / maxCount) * (H - PAD.top - PAD.bottom);
  const strokeW = d => 1.5 + d * 6.5;

  // Y 눈금
  const yTicks = Array.from({ length: 5 }, (_, i) => Math.round((maxCount / 4) * i));

  // 요약 카드
  const totals = topTags.map((tag, ci) => ({
    tag, color: COLORS[ci],
    sum: tagCounts[tag].reduce((a, b) => a + b, 0),
    avgD: tagDensity[tag].reduce((a, b) => a + b, 0) / tagDensity[tag].length,
    lastCount: tagCounts[tag].at(-1),
    lastD: tagDensity[tag].at(-1),
  })).filter(t => !hiddenTags.has(t.tag));

  const topSum     = [...totals].sort((a, b) => b.sum - a.sum)[0];
  const topConsist = [...totals].sort((a, b) => b.avgD - a.avgD)[0];
  const topThis    = [...totals].sort((a, b) => b.lastCount - a.lastCount)[0];

  const toggleTag = tag => {
    setHiddenTags(prev => {
      const next = new Set(prev);
      if (next.has(tag)) { next.delete(tag); }
      else if (next.size < topTags.length - 1) { next.add(tag); }
      return next;
    });
  };

  const handleMouseMove = e => {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
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
      {/* 범례 + 밀도 안내 */}
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
            <svg width="32" height="8"><line x1="0" y1="4" x2="32" y2="4" stroke="#aaa" strokeWidth="6" strokeLinecap="round"/></svg>
            꾸준히 작성
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="32" height="8"><line x1="0" y1="4" x2="32" y2="4" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round"/></svg>
            집중 작성
          </span>
        </div>
      </div>

      {/* SVG 차트 */}
      <div style={{ position: 'relative' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`} width="100%" height={H}
          style={{ overflow: 'visible', cursor: 'crosshair' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          {/* Y 눈금선 */}
          {yTicks.map(v => (
            <g key={v}>
              <line x1={PAD.left} y1={yScale(v)} x2={W - PAD.right} y2={yScale(v)}
                stroke="rgba(0,0,0,0.05)" strokeWidth={1} />
              <text x={PAD.left - 6} y={yScale(v) + 4} textAnchor="end"
                fontSize={10} fill="#aaa">{v}개</text>
            </g>
          ))}

          {/* X 라벨 */}
          {monthLabels.map((label, i) => (
            <text key={i} x={xScale(i)} y={H - 6} textAnchor="middle"
              fontSize={10} fill={hoveredIdx === i ? '#1a3a5c' : '#bbb'} fontWeight={hoveredIdx === i ? 600 : 400}>
              {label}
            </text>
          ))}

          {/* 호버 수직선 */}
          {hoveredIdx !== null && (
            <line x1={xScale(hoveredIdx)} y1={PAD.top} x2={xScale(hoveredIdx)} y2={H - PAD.bottom}
              stroke="#ddd" strokeWidth={1} strokeDasharray="4,3" />
          )}

          {/* 태그별 라인 */}
          {topTags.map((tag, ci) => {
            if (hiddenTags.has(tag)) return null;
            const counts = tagCounts[tag];
            const density = tagDensity[tag];
            const color = COLORS[ci];
            return (
              <g key={tag}>
                {/* 선 세그먼트 (두께 가변) */}
                {counts.map((_, i) => {
                  if (i === 0) return null;
                  return (
                    <line key={i}
                      x1={xScale(i - 1)} y1={yScale(counts[i - 1])}
                      x2={xScale(i)}     y2={yScale(counts[i])}
                      stroke={color}
                      strokeWidth={strokeW((density[i - 1] + density[i]) / 2)}
                      strokeLinecap="round"
                      opacity={0.85}
                    />
                  );
                })}
                {/* 점 */}
                {counts.map((v, i) => (
                  <circle key={i}
                    cx={xScale(i)} cy={yScale(v)} r={hoveredIdx === i ? 6 : 4}
                    fill={color} stroke="#fff" strokeWidth={2}
                    opacity={v === 0 ? 0 : 1}
                  />
                ))}
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
                  const pct = Math.round(tagDensity[tag][hoveredIdx] * 100);
                  return (
                    <g key={tag}>
                      <rect x={bx + 10} y={PAD.top + 22 + i * 18} width={8} height={8} rx={2} fill={COLORS[ci]} />
                      <text x={bx + 22} y={PAD.top + 30 + i * 18} fontSize={10} fill="#333">
                        {tag}: {tagCounts[tag][hoveredIdx]}개 · 밀도 {pct}%
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
            { label: '가장 많이 쓴 주제', t: topSum,     sub: `${topSum?.sum ?? 0}개` },
            { label: '가장 꾸준한 주제', t: topConsist, sub: `평균 밀도 ${Math.round((topConsist?.avgD ?? 0) * 100)}%` },
            { label: '이번 달 1위',      t: topThis,    sub: `${topThis?.lastCount ?? 0}개 · 밀도 ${Math.round((topThis?.lastD ?? 0) * 100)}%` },
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
    getGrass(grassMonths).then(data => {
      setGrassGrid(buildGrassGrid(data?.cells ?? [], grassMonths));
    }).catch(() => {});
  }, [grassMonths]);

  // 관심사 기간 변경 시 재요청
  useEffect(() => {
    getInterests(interestMonths).then(data => {
      setInterests(data?.interests ?? []);
    }).catch(() => {});
  }, [interestMonths]);

  useEffect(() => {
    // getQuests()는 포인트 적립을 수행하므로 먼저 완료한 뒤 포인트를 조회한다
    Promise.allSettled([
      getSummary(),
      getWeekly(),
      getDistribution(),
      getQuests(),
    ]).then(([sumRes, weekRes, distRes, questRes]) => {
      if (sumRes.status === 'fulfilled')   setSummary(sumRes.value);
      if (weekRes.status === 'fulfilled')  setWeekly(transformWeekly(weekRes.value?.weeklyData ?? []));
      if (distRes.status === 'fulfilled')  setDistribution(distRes.value?.distribution ?? []);
      if (questRes.status === 'fulfilled') {
        setQuests(questRes.value);
        // 퀘스트 포인트 적립 완료 후 포인트 재조회
        return getPointSummary();
      }
      return Promise.resolve(null);
    }).then(pointRes => {
      if (pointRes) setCurrentPoint(pointRes?.currentPoint ?? 0);
    }).catch(error => {
      console.error('데이터 로딩 중 오류 발생:', error);
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
          <SectionHeader eyebrow="활동" title="잔디 그래프" action={
            <div style={{ display: 'flex', gap: 4 }}>
              {[['3개월', 3], ['6개월', 6], ['1년', 12]].map(([label, m]) => (
                <button key={m} onClick={() => setGrassMonths(m)} style={{
                  padding: '5px 10px', fontSize: 11.5, borderRadius: 7,
                  background: grassMonths === m ? 'var(--ink)' : 'transparent',
                  color: grassMonths === m ? '#fff' : 'var(--ink-2)',
                  border: grassMonths === m ? 'none' : '0.5px solid var(--rule-2)',
                  fontFamily: 'var(--font-display)', fontWeight: 500, cursor: 'pointer',
                }}>{label}</button>
              ))}
            </div>
          } />
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
        <InterestLineChart interests={interests} months={interestMonths} onMonthsChange={setInterestMonths} />
      </Card>

    </div>
  );
}

export { DashboardScreen, GrassGraph };
