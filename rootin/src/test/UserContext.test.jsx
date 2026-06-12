import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { UserProvider, useUser } from '../context/UserContext.jsx';

vi.mock('../api/user.js', () => ({
  getMe: vi.fn().mockResolvedValue({
    userId: 1,
    nickname: '소나무',
    bio: '안녕하세요',
    point: 100,
    tilCount: 5,
  }),
}));

vi.mock('../api/dashboard.js', () => ({
  getSummary: vi.fn().mockResolvedValue({
    currentStreak: 0,
    longestStreak: 0,
  }),
}));

import { getMe } from '../api/user.js';

function UserDisplay() {
  const { user, updateUser } = useUser();
  return (
    <div>
      <span data-testid="name">{user?.name}</span>
      <span data-testid="bio">{user?.bio}</span>
      <button onClick={() => updateUser({ name: '새이름', bio: '새 소개' })}>update</button>
    </div>
  );
}

function AuthStateDisplay() {
  const { loading, user } = useUser();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user-id">{user?.userId ?? ''}</span>
    </div>
  );
}

function RerenderingProviderWrapper() {
  const [count, setCount] = useState(0);
  return (
    <UserProvider onAuthExpired={() => {}}>
      <AuthStateDisplay />
      <button onClick={() => setCount(value => value + 1)}>rerender {count}</button>
    </UserProvider>
  );
}

describe('UserContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    getMe.mockResolvedValue({
      userId: 1,
      nickname: '소나무',
      bio: '안녕하세요',
      point: 100,
      tilCount: 5,
    });
  });

  it('initialUser를 정규화해서 name/bio를 올바르게 노출한다', () => {
    const apiUser = { userId: 1, nickname: '소나무', bio: '안녕', point: 0, tilCount: 0 };
    render(
      <UserProvider initialUser={apiUser}>
        <UserDisplay />
      </UserProvider>
    );
    expect(screen.getByTestId('name').textContent).toBe('소나무');
    expect(screen.getByTestId('bio').textContent).toBe('안녕');
  });

  it('updateUser 호출 시 name과 bio가 업데이트된다', async () => {
    const apiUser = { userId: 1, nickname: '소나무', bio: '기존 소개', point: 0, tilCount: 0 };
    render(
      <UserProvider initialUser={apiUser}>
        <UserDisplay />
      </UserProvider>
    );

    await act(async () => {
      screen.getByText('update').click();
    });

    expect(screen.getByTestId('name').textContent).toBe('새이름');
    expect(screen.getByTestId('bio').textContent).toBe('새 소개');
  });

  it('updateUser가 다른 필드를 덮어쓰지 않는다', async () => {
    const apiUser = { userId: 42, nickname: '소나무', bio: '기존', point: 999, tilCount: 3 };
    let capturedUser;
    function Capture() {
      const { user, updateUser } = useUser();
      capturedUser = user;
      return <button onClick={() => updateUser({ bio: '변경된 소개' })}>update</button>;
    }
    render(
      <UserProvider initialUser={apiUser}>
        <Capture />
      </UserProvider>
    );

    await act(async () => {
      screen.getByText('update').click();
    });

    expect(capturedUser.userId).toBe(42);
    expect(capturedUser.points).toBe(999);
    expect(capturedUser.bio).toBe('변경된 소개');
  });

  it('사용자 정보 조회가 네트워크 오류로 실패해도 토큰을 삭제하지 않는다', async () => {
    getMe.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    localStorage.setItem('accessToken', 'tok');
    localStorage.setItem('refreshToken', 'ref');
    const onAuthExpired = vi.fn();

    render(
      <UserProvider onAuthExpired={onAuthExpired}>
        <AuthStateDisplay />
      </UserProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(localStorage.getItem('accessToken')).toBe('tok');
    expect(localStorage.getItem('refreshToken')).toBe('ref');
    expect(onAuthExpired).not.toHaveBeenCalled();
  });

  it('사용자 정보 조회가 401로 실패하면 토큰을 삭제하고 인증 만료 콜백을 호출한다', async () => {
    const unauthorizedError = Object.assign(new Error('HTTP 401'), { status: 401 });
    getMe.mockRejectedValueOnce(unauthorizedError);
    localStorage.setItem('accessToken', 'tok');
    localStorage.setItem('refreshToken', 'ref');
    const onAuthExpired = vi.fn();

    render(
      <UserProvider onAuthExpired={onAuthExpired}>
        <AuthStateDisplay />
      </UserProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(onAuthExpired).toHaveBeenCalledTimes(1);
  });

  it('부모가 새 onAuthExpired 함수를 넘기며 리렌더링되어도 사용자 정보를 다시 조회하지 않는다', async () => {
    localStorage.setItem('accessToken', 'tok');

    render(<RerenderingProviderWrapper />);

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(getMe).toHaveBeenCalledTimes(1);

    await act(async () => {
      screen.getByText(/rerender/).click();
    });

    expect(getMe).toHaveBeenCalledTimes(1);
  });
});
