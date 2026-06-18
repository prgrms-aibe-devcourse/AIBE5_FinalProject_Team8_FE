// 대시보드 화면 공유 로직 — 게임보이/클래식 양 테마가 공유하는 잔디·스트릭·주간 데이터 변환.
// screens-dashboard.jsx 와 screens-dashboard.classic.jsx 에서 추출 (차트/디자인은 각 화면 파일에 유지).

const GRASS_WEEKS = 52;
const STREAK_CHAR_COUNT_CAP = 1200;

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

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
function transformWeekly(weeklyData = []) {
  return weeklyData.map(d => ({
    day: DAY_LABELS[new Date(d.date + 'T00:00:00').getDay()],
    count: d.tilCount,
  }));
}

export {
  GRASS_WEEKS,
  STREAK_CHAR_COUNT_CAP,
  DAY_LABELS,
  formatDateKey,
  formatShortDate,
  getGrassStartDate,
  buildGrassState,
  buildGrassGrid,
  buildRecentStreakDays,
  calculateCurrentStreakFromCells,
  transformWeekly,
};
