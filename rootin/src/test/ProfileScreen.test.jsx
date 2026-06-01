import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProfileScreen } from '../screens-rest.jsx';
import { UserProvider } from '../context/UserContext.jsx';

// patchUserMe mock
vi.mock('../api/user.js', () => ({
  getMe: vi.fn(),
  patchUserMe: vi.fn(),
}));

const mockApiUser = {
  userId: 1,
  nickname: '소나무',
  bio: '기존 소개',
  point: 0,
  tilCount: 0,
  email: 'test@test.com',
  provider: 'google',
};

function renderProfile() {
  return render(
    <UserProvider initialUser={mockApiUser}>
      <ProfileScreen />
    </UserProvider>
  );
}

describe('ProfileScreen — 저장 버튼', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('"프로필 수정" 클릭 시 편집 모드로 전환된다', () => {
    renderProfile();
    fireEvent.click(screen.getByText('프로필 수정'));
    expect(screen.getByText('저장')).toBeInTheDocument();
    expect(screen.getByText('취소')).toBeInTheDocument();
  });

  it('저장 성공 시 편집 모드가 닫히고 patchUserMe가 올바른 값으로 호출된다', async () => {
    const { patchUserMe } = await import('../api/user.js');
    patchUserMe.mockResolvedValue({ ...mockApiUser, nickname: '새이름', bio: '새 소개' });

    renderProfile();
    fireEvent.click(screen.getByText('프로필 수정'));

    // nickname 변경
    const nicknameInput = screen.getByDisplayValue('소나무');
    fireEvent.change(nicknameInput, { target: { value: '새이름' } });

    // bio 변경
    const bioInput = screen.getByDisplayValue('기존 소개');
    fireEvent.change(bioInput, { target: { value: '새 소개' } });

    fireEvent.click(screen.getByText('저장'));

    await waitFor(() => {
      expect(patchUserMe).toHaveBeenCalledWith({ nickname: '새이름', bio: '새 소개' });
    });

    // 편집 모드 종료
    await waitFor(() => {
      expect(screen.getByText('프로필 수정')).toBeInTheDocument();
    });
  });

  it('저장 실패 시 에러 메시지가 표시된다', async () => {
    const { patchUserMe } = await import('../api/user.js');
    const error = Object.assign(new Error('HTTP 400'), {
      body: { message: '닉네임은 2자 이상이어야 합니다.' },
    });
    patchUserMe.mockRejectedValue(error);

    renderProfile();
    fireEvent.click(screen.getByText('프로필 수정'));
    fireEvent.click(screen.getByText('저장'));

    await waitFor(() => {
      expect(screen.getByText('닉네임은 2자 이상이어야 합니다.')).toBeInTheDocument();
    });

    // 편집 모드 유지
    expect(screen.getByText('저장')).toBeInTheDocument();
  });

  it('취소 클릭 시 변경 내용이 롤백된다', () => {
    renderProfile();
    fireEvent.click(screen.getByText('프로필 수정'));

    const nicknameInput = screen.getByDisplayValue('소나무');
    fireEvent.change(nicknameInput, { target: { value: '임시이름' } });

    fireEvent.click(screen.getByText('취소'));

    expect(screen.getByText('프로필 수정')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('임시이름')).not.toBeInTheDocument();
  });
});
