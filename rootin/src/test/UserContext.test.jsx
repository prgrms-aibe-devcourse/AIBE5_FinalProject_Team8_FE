import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
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

describe('UserContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
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
});
