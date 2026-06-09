import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PotDetailScreen } from '../screens-garden.jsx';
import { UserProvider } from '../context/UserContext.jsx';

// API mocks
vi.mock('../api/pot.js', () => ({
  getGardenDashboard: vi.fn(),
  getPots: vi.fn(),
  createPot: vi.fn(),
  updatePot: vi.fn(),
}));

vi.mock('../api/garden.js', () => ({
  harvestPot: vi.fn(),
  getGardenState: vi.fn(),
  updateGardenTheme: vi.fn(),
  updateGardenLayout: vi.fn(),
}));

vi.mock('../api/til.js', () => ({
  getMyTils: vi.fn(),
  getTil: vi.fn(),
}));

// 테스트용 대시보드 fixture
const mockDashboard = {
  potId: 'pot-1',
  title: '리액트 공부',
  description: '리액트를 배워보자',
  emoji: '🌱',
  species: 'basic',
  level: 3,
  currentExp: 150,
  nextLevelExp: 300,
  levelProgress: 50,
  totalExp: 450,
  growthStage: 'LEAF',
  tilCount: 25,
  canHarvest: false,
  lastWateredAt: '2026-06-01T10:00:00',
};

// getMyTils 응답 fixture — totalPages 포함
function makeTilPage({ page = 0, size = 10, total = 25 } = {}) {
  const start = page * size;
  const content = Array.from({ length: Math.min(size, total - start) }, (_, i) => ({
    tilId: start + i + 1,
    title: `TIL 제목 ${start + i + 1}`,
    content: '<p>내용</p>',
    tags: ['react'],
    createdAt: '2026-06-01T10:00:00',
    publishedAt: '2026-06-01T10:00:00',
    charCount: 100,
    potId: 'pot-1',
  }));
  return {
    content,
    totalElements: total,
    totalPages: Math.ceil(total / size),
    number: page,
    size,
  };
}

function renderPotDetail(potId = 'pot-1') {
  const mockUser = { userId: 1, nickname: '테스터', email: 'test@test.com' };
  return render(
    <UserProvider initialUser={mockUser}>
      <PotDetailScreen
        potId={potId}
        refreshKey={0}
        onBack={vi.fn()}
        onStartTil={vi.fn()}
        onEditTil={vi.fn()}
      />
    </UserProvider>
  );
}

beforeEach(async () => {
  vi.clearAllMocks();

  const { getGardenDashboard } = await import('../api/pot.js');
  getGardenDashboard.mockResolvedValue(mockDashboard);

  const { getMyTils } = await import('../api/til.js');
  // 기본 10개씩, 총 25개(3페이지)
  getMyTils.mockImplementation(({ page = 0, size = 10 } = {}) =>
    Promise.resolve(makeTilPage({ page, size, total: 25 }))
  );
});

// ─── 페이지 크기 선택 ─────────────────────────────────────────────────────────

describe('PotDetailScreen — 페이지 크기 선택', () => {
  it('5개 / 10개 / 20개 버튼이 렌더링된다', async () => {
    renderPotDetail();
    await waitFor(() => expect(screen.getByText('5개')).toBeInTheDocument());
    expect(screen.getByText('10개')).toBeInTheDocument();
    expect(screen.getByText('20개')).toBeInTheDocument();
  });

  it('기본 선택값은 10개이고 aria-pressed가 true다', async () => {
    renderPotDetail();
    await waitFor(() => expect(screen.getByText('10개')).toBeInTheDocument());
    expect(screen.getByText('10개').closest('button')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('5개').closest('button')).toHaveAttribute('aria-pressed', 'false');
  });

  it('5개 버튼 클릭 시 getMyTils를 size=5, page=0으로 재호출한다', async () => {
    renderPotDetail();
    await waitFor(() => expect(screen.getByText('5개')).toBeInTheDocument());

    const { getMyTils } = await import('../api/til.js');
    getMyTils.mockClear();

    fireEvent.click(screen.getByText('5개'));

    await waitFor(() => {
      expect(getMyTils).toHaveBeenCalledWith(
        expect.objectContaining({ size: 5, page: 0 })
      );
    });
  });

  it('20개 버튼 클릭 시 getMyTils를 size=20, page=0으로 재호출한다', async () => {
    renderPotDetail();
    await waitFor(() => expect(screen.getByText('20개')).toBeInTheDocument());

    const { getMyTils } = await import('../api/til.js');
    getMyTils.mockClear();

    fireEvent.click(screen.getByText('20개'));

    await waitFor(() => {
      expect(getMyTils).toHaveBeenCalledWith(
        expect.objectContaining({ size: 20, page: 0 })
      );
    });
  });

  it('페이지 크기 변경 시 현재 페이지가 0으로 리셋된다', async () => {
    renderPotDetail();
    await waitFor(() => expect(screen.getByText('10개')).toBeInTheDocument());

    // 2페이지로 이동 (상단 pagination [0] 사용)
    fireEvent.click(screen.getAllByRole('button', { name: '다음 페이지' })[0]);
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: '2페이지' })[0]).toHaveAttribute('aria-current', 'page');
    });

    // 페이지 크기 변경 → page 리셋
    fireEvent.click(screen.getByText('5개'));
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: '1페이지' })[0]).toHaveAttribute('aria-current', 'page');
    });
  });
});

// ─── 페이지네이션 렌더링 조건 ───────────────────────────────────────────────

describe('PotDetailScreen — 페이지네이션 렌더링', () => {
  it('총 페이지가 2 이상이면 네비게이션이 표시된다', async () => {
    renderPotDetail();
    // 총 25개 / 10개씩 = 3페이지 → 상단+하단 2개 렌더링
    await waitFor(() =>
      expect(screen.getAllByRole('navigation', { name: 'TIL 페이지 네비게이션' }).length).toBeGreaterThanOrEqual(1)
    );
  });

  it('총 페이지가 1이면 네비게이션이 숨겨진다', async () => {
    const { getMyTils } = await import('../api/til.js');
    getMyTils.mockResolvedValue(makeTilPage({ total: 8, size: 10 }));

    renderPotDetail();
    await waitFor(() => expect(screen.queryByText('TIL 1개')).not.toBeInTheDocument());

    // 네비게이션 없음 확인
    expect(
      screen.queryByRole('navigation', { name: 'TIL 페이지 네비게이션' })
    ).not.toBeInTheDocument();
  });

  it('페이지 번호 버튼이 totalPages 수만큼 렌더링된다', async () => {
    renderPotDetail(); // 총 3페이지 → 상단+하단 각각 1~3페이지 버튼
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: '3페이지' }).length).toBeGreaterThanOrEqual(1)
    );
    expect(screen.getAllByRole('button', { name: '1페이지' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: '2페이지' }).length).toBeGreaterThanOrEqual(1);
  });
});

// ─── 이전 / 다음 버튼 동작 ──────────────────────────────────────────────────

describe('PotDetailScreen — 이전/다음 버튼', () => {
  it('첫 페이지에서 이전 버튼이 비활성화된다', async () => {
    renderPotDetail();
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: '이전 페이지' }).length).toBeGreaterThanOrEqual(1)
    );
    // 상단/하단 모두 disabled
    screen.getAllByRole('button', { name: '이전 페이지' }).forEach(btn => {
      expect(btn).toBeDisabled();
    });
  });

  it('다음 버튼 클릭 시 2페이지로 이동하고 getMyTils를 page=1로 재호출한다', async () => {
    renderPotDetail();
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: '다음 페이지' }).length).toBeGreaterThanOrEqual(1)
    );

    const { getMyTils } = await import('../api/til.js');
    getMyTils.mockClear();

    fireEvent.click(screen.getAllByRole('button', { name: '다음 페이지' })[0]);

    await waitFor(() => {
      expect(getMyTils).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1 })
      );
    });
  });

  it('마지막 페이지에서 다음 버튼이 비활성화된다', async () => {
    renderPotDetail();
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: '3페이지' }).length).toBeGreaterThanOrEqual(1)
    );

    fireEvent.click(screen.getAllByRole('button', { name: '3페이지' })[0]);
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: '3페이지' })[0]).toHaveAttribute('aria-current', 'page');
    });

    // 상단/하단 모두 disabled
    screen.getAllByRole('button', { name: '다음 페이지' }).forEach(btn => {
      expect(btn).toBeDisabled();
    });
  });

  it('페이지 번호 버튼 클릭 시 해당 페이지로 이동한다', async () => {
    renderPotDetail();
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: '2페이지' }).length).toBeGreaterThanOrEqual(1)
    );

    const { getMyTils } = await import('../api/til.js');
    getMyTils.mockClear();

    fireEvent.click(screen.getAllByRole('button', { name: '2페이지' })[0]);

    await waitFor(() => {
      expect(getMyTils).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1 })
      );
    });
    // 상단/하단 모두 aria-current 동기화
    screen.getAllByRole('button', { name: '2페이지' }).forEach(btn => {
      expect(btn).toHaveAttribute('aria-current', 'page');
    });
  });
});
