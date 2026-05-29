import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { UserProvider, useUser } from '../context/UserContext.jsx';

// ──────────────────────────────────────────────
// api/user.js mock
// ──────────────────────────────────────────────
vi.mock('../api/user.js', () => ({
  getMe: vi.fn(),
}));

import { getMe } from '../api/user.js';

const MOCK_API_USER = {
  userId: 1,
  nickname: '소연',
  handle: 'soyeon',
  email: 'soyeon@rootin.app',
  bio: '루틴처럼 기록하고, 뿌리처럼 깊어지는 중.',
  joinedAt: '2026.02.14',
  point: 1240,
  tilCount: 47,
  profileImageUrl: null,
  provider: 'google',
};

// useUser 훅 결과를 렌더링해주는 헬퍼 컴포넌트
function UserConsumer() {
  const { user, loading } = useUser();
  if (loading) return <div>loading</div>;
  if (!user) return <div>no user</div>;
  return (
    <div>
      <span data-testid="name">{user.name}</span>
      <span data-testid="handle">{user.handle}</span>
      <span data-testid="email">{user.email}</span>
      <span data-testid="points">{user.points}</span>
      <span data-testid="totalTil">{user.totalTil}</span>
      <span data-testid="streak">{user.streak}</span>
      <span data-testid="bestStreak">{user.bestStreak}</span>
    </div>
  );
}

function renderWithProvider(props = {}) {
  return render(
    <UserProvider {...props}>
      <UserConsumer />
    </UserProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  localStorage.clear();
});

// ──────────────────────────────────────────────
// 토큰 없음 — 비로그인 상태
// ──────────────────────────────────────────────
describe('토큰 없음 — 비로그인 상태', () => {
  it('accessToken이 없으면 getMe()를 호출하지 않는다', async () => {
    renderWithProvider();
    await waitFor(() => expect(screen.getByText('no user')).toBeInTheDocument());
    expect(getMe).not.toHaveBeenCalled();
  });

  it('accessToken이 없으면 user는 null이다', async () => {
    renderWithProvider();
    await waitFor(() => expect(screen.getByText('no user')).toBeInTheDocument());
  });
});

// ──────────────────────────────────────────────
// 토큰 있음 — 자동 getMe() 호출
// ──────────────────────────────────────────────
describe('토큰 있음 — 자동 getMe() 호출', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-token');
    getMe.mockResolvedValue(MOCK_API_USER);
  });

  it('accessToken이 있으면 getMe()를 한 번 호출한다', async () => {
    renderWithProvider();
    await waitFor(() => expect(getMe).toHaveBeenCalledTimes(1));
  });

  it('getMe() 응답의 nickname이 user.name으로 정규화된다', async () => {
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('name').textContent).toBe('소연'));
  });

  it('getMe() 응답의 point가 user.points로 정규화된다', async () => {
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('points').textContent).toBe('1240'));
  });

  it('getMe() 응답의 tilCount가 user.totalTil로 정규화된다', async () => {
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('totalTil').textContent).toBe('47'));
  });

  it('API에 streak 필드가 없으면 기본값 0이 설정된다', async () => {
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('streak').textContent).toBe('0'));
  });

  it('API에 bestStreak 필드가 없으면 기본값 0이 설정된다', async () => {
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('bestStreak').textContent).toBe('0'));
  });
});

// ──────────────────────────────────────────────
// getMe() 실패 — 토큰 만료
// ──────────────────────────────────────────────
describe('getMe() 실패 — 토큰 만료', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'expired-token');
    localStorage.setItem('refreshToken', 'expired-refresh');
    getMe.mockRejectedValue(new Error('Unauthorized'));
  });

  it('getMe() 실패 시 accessToken이 제거된다', async () => {
    renderWithProvider({ onAuthExpired: vi.fn() });
    await waitFor(() => expect(localStorage.getItem('accessToken')).toBeNull());
  });

  it('getMe() 실패 시 refreshToken이 제거된다', async () => {
    renderWithProvider({ onAuthExpired: vi.fn() });
    await waitFor(() => expect(localStorage.getItem('refreshToken')).toBeNull());
  });

  it('getMe() 실패 시 onAuthExpired 콜백이 호출된다', async () => {
    const onAuthExpired = vi.fn();
    renderWithProvider({ onAuthExpired });
    await waitFor(() => expect(onAuthExpired).toHaveBeenCalledTimes(1));
  });

  it('getMe() 실패 후 user는 null이다', async () => {
    renderWithProvider({ onAuthExpired: vi.fn() });
    await waitFor(() => expect(screen.getByText('no user')).toBeInTheDocument());
  });
});

// ──────────────────────────────────────────────
// initialUser prop — 로그인 직후 주입
// ──────────────────────────────────────────────
describe('initialUser prop — 로그인 직후 주입', () => {
  it('initialUser가 있으면 getMe()를 호출하지 않는다', async () => {
    renderWithProvider({ initialUser: MOCK_API_USER });
    await waitFor(() => expect(screen.getByTestId('name')).toBeInTheDocument());
    expect(getMe).not.toHaveBeenCalled();
  });

  it('initialUser의 nickname이 user.name으로 정규화된다', async () => {
    renderWithProvider({ initialUser: MOCK_API_USER });
    await waitFor(() => expect(screen.getByTestId('name').textContent).toBe('소연'));
  });
});

// ──────────────────────────────────────────────
// setUserFromApi — 로그인 성공 시 주입
// ──────────────────────────────────────────────
describe('setUserFromApi — 로그인 성공 시 유저 주입', () => {
  function SetUserConsumer() {
    const { user, setUserFromApi } = useUser();
    return (
      <div>
        <button onClick={() => setUserFromApi(MOCK_API_USER)}>set</button>
        {user && <span data-testid="name">{user.name}</span>}
        {!user && <span>no user</span>}
      </div>
    );
  }

  it('setUserFromApi 호출 후 user.name이 설정된다', async () => {
    render(<UserProvider><SetUserConsumer /></UserProvider>);
    await waitFor(() => screen.getByText('no user'));

    act(() => {
      screen.getByRole('button', { name: 'set' }).click();
    });

    await waitFor(() => expect(screen.getByTestId('name').textContent).toBe('소연'));
  });

  it('setUserFromApi는 API 필드를 정규화한다 (point → points)', async () => {
    function PointConsumer() {
      const { user, setUserFromApi } = useUser();
      return (
        <div>
          <button onClick={() => setUserFromApi(MOCK_API_USER)}>set</button>
          {user && <span data-testid="points">{user.points}</span>}
        </div>
      );
    }
    render(<UserProvider><PointConsumer /></UserProvider>);
    act(() => { screen.getByRole('button', { name: 'set' }).click(); });
    await waitFor(() => expect(screen.getByTestId('points').textContent).toBe('1240'));
  });
});

// ──────────────────────────────────────────────
// clearUser — 로그아웃
// ──────────────────────────────────────────────
describe('clearUser — 로그아웃', () => {
  it('clearUser 호출 후 user가 null이 된다', async () => {
    function ClearConsumer() {
      const { user, setUserFromApi, clearUser } = useUser();
      return (
        <div>
          <button onClick={() => setUserFromApi(MOCK_API_USER)}>set</button>
          <button onClick={clearUser}>clear</button>
          {user ? <span data-testid="name">{user.name}</span> : <span>no user</span>}
        </div>
      );
    }
    render(<UserProvider><ClearConsumer /></UserProvider>);

    act(() => { screen.getByRole('button', { name: 'set' }).click(); });
    await waitFor(() => screen.getByTestId('name'));

    act(() => { screen.getByRole('button', { name: 'clear' }).click(); });
    await waitFor(() => expect(screen.getByText('no user')).toBeInTheDocument());
  });
});
