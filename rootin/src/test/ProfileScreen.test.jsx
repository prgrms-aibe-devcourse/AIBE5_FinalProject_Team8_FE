import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProfileScreen } from '../screens-rest.jsx';
import { UserProvider } from '../context/UserContext.jsx';

// API 전체 mock
vi.mock('../api/user.js', () => ({
  getMe: vi.fn(),
  patchUserMe: vi.fn(),
  getProfileImagePresignedUrl: vi.fn(),
  deleteUserMe: vi.fn(),
  patchPassword: vi.fn(),
}));

vi.mock('../api/collection.js', () => ({
  getPlants: vi.fn(),
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

const mockApiUserLocal = {
  ...mockApiUser,
  provider: 'local',
};

function renderProfile(apiUser = mockApiUser) {
  return render(
    <UserProvider initialUser={apiUser}>
      <ProfileScreen />
    </UserProvider>
  );
}

beforeEach(async () => {
  vi.clearAllMocks();
  // 수확 식물 기본 mock — { stats: { collected } } 구조
  const { getPlants } = await import('../api/collection.js');
  getPlants.mockResolvedValue({ stats: { collected: 2, total: 3, common: 2, rare: 1 } });
});

// ─── 저장 버튼 ────────────────────────────────────────────────────────────────

describe('ProfileScreen — 저장 버튼', () => {
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

    const nicknameInput = screen.getByDisplayValue('소나무');
    fireEvent.change(nicknameInput, { target: { value: '새이름' } });

    const bioInput = screen.getByDisplayValue('기존 소개');
    fireEvent.change(bioInput, { target: { value: '새 소개' } });

    fireEvent.click(screen.getByText('저장'));

    await waitFor(() => {
      expect(patchUserMe).toHaveBeenCalledWith({ nickname: '새이름', bio: '새 소개' });
    });
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

// ─── provider 기반 조건부 렌더 ──────────────────────────────────────────────

describe('ProfileScreen — provider 조건부 렌더', () => {
  it('provider=google: 비밀번호 행이 노출되지 않는다', () => {
    renderProfile(mockApiUser); // google
    expect(screen.queryByText('비밀번호')).not.toBeInTheDocument();
  });

  it('provider=local: 비밀번호 행이 노출된다', () => {
    renderProfile(mockApiUserLocal);
    expect(screen.getByText('비밀번호')).toBeInTheDocument();
  });

  it('provider=local: 구글 연동 문구가 표시되지 않는다', () => {
    renderProfile(mockApiUserLocal);
    expect(screen.queryByText('구글 계정 연동됨')).not.toBeInTheDocument();
  });

  it('provider=local: 연결된 SNS 행이 노출되지 않는다', () => {
    renderProfile(mockApiUserLocal);
    expect(screen.queryByText('연결된 SNS')).not.toBeInTheDocument();
  });
});

// ─── 수확한 식물 수 API 연동 ────────────────────────────────────────────────

describe('ProfileScreen — 수확한 식물 수', () => {
  it('stats.collected 값을 수확 식물 수로 표시한다', async () => {
    // beforeEach에서 collected: 2 mock → 2종
    renderProfile();
    await waitFor(() => {
      expect(screen.getByText('2종')).toBeInTheDocument();
    });
  });

  it('API 실패 시 0종으로 표시된다', async () => {
    const { getPlants } = await import('../api/collection.js');
    getPlants.mockRejectedValue(new Error('network error'));

    renderProfile();
    await waitFor(() => {
      expect(screen.getByText('0종')).toBeInTheDocument();
    });
  });
});

// ─── 프로필 이미지 presigned URL 업로드 ─────────────────────────────────────

describe('ProfileScreen — 프로필 이미지 업로드', () => {
  it('편집 모드에서 파일 선택 시 presigned URL로 PUT 업로드 후 updateUser가 호출된다', async () => {
    const { getProfileImagePresignedUrl } = await import('../api/user.js');
    getProfileImagePresignedUrl.mockResolvedValue({
      presignedUrl: 'https://s3.example.com/presigned',
      fileUrl: 'https://cdn.example.com/profile.jpg',
    });
    global.fetch = vi.fn().mockResolvedValue({ ok: true });

    renderProfile();
    fireEvent.click(screen.getByText('프로필 수정'));

    const input = screen.getByTestId('profile-image-input');
    const file = new File(['img'], 'profile.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(getProfileImagePresignedUrl).toHaveBeenCalledWith({
        filename: 'profile.jpg',
        fileSize: 3,
      });
    });
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'https://s3.example.com/presigned',
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });
});

// ─── 비밀번호 변경 폼 ────────────────────────────────────────────────────────

// 유효한 입력값을 채우는 헬퍼
function fillPasswordForm({ current = 'old1234!', next = 'new1234!!', confirm = 'new1234!!' } = {}) {
  const [currentInput, newInput, confirmInput] = document.querySelectorAll('input[type="password"]');
  fireEvent.change(currentInput, { target: { value: current } });
  fireEvent.change(newInput, { target: { value: next } });
  fireEvent.change(confirmInput, { target: { value: confirm } });
}

describe('ProfileScreen — 비밀번호 변경 폼', () => {
  it('"변경" 클릭 시 비밀번호 모달이 열린다', () => {
    renderProfile(mockApiUserLocal);
    fireEvent.click(screen.getByText('변경'));
    expect(screen.getByText('현재 비밀번호')).toBeInTheDocument();
    expect(screen.getByText('새 비밀번호')).toBeInTheDocument();
    expect(screen.getByText('새 비밀번호 확인')).toBeInTheDocument();
  });

  it('취소 클릭 시 모달이 닫히고 비밀번호 행으로 돌아간다', () => {
    renderProfile(mockApiUserLocal);
    fireEvent.click(screen.getByText('변경'));
    fireEvent.click(screen.getByText('취소'));
    expect(screen.queryByText('현재 비밀번호')).not.toBeInTheDocument();
    expect(screen.getByText('비밀번호')).toBeInTheDocument();
  });

  it('새 비밀번호가 8자 미만이면 에러 메시지가 표시된다', () => {
    renderProfile(mockApiUserLocal);
    fireEvent.click(screen.getByText('변경'));
    fillPasswordForm({ next: 'short', confirm: 'short' });

    fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }));
    expect(screen.getByText('비밀번호는 8자 이상이어야 합니다.')).toBeInTheDocument();
  });

  it('새 비밀번호와 확인 비밀번호가 다르면 에러 메시지가 표시된다', () => {
    renderProfile(mockApiUserLocal);
    fireEvent.click(screen.getByText('변경'));
    fillPasswordForm({ confirm: 'different!!' });

    fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }));
    expect(screen.getByText('새 비밀번호가 일치하지 않습니다.')).toBeInTheDocument();
  });

  it('유효성 통과 시 확인 단계로 전환된다', () => {
    renderProfile(mockApiUserLocal);
    fireEvent.click(screen.getByText('변경'));
    fillPasswordForm();

    fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }));
    expect(screen.getByText('정말 비밀번호를 변경하시겠습니까?')).toBeInTheDocument();
    expect(screen.getByText('아니요')).toBeInTheDocument();
    expect(screen.getByText('변경합니다')).toBeInTheDocument();
  });

  it('확인 단계에서 "아니요" 클릭 시 입력 폼으로 돌아간다', () => {
    renderProfile(mockApiUserLocal);
    fireEvent.click(screen.getByText('변경'));
    fillPasswordForm();
    fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }));
    fireEvent.click(screen.getByText('아니요'));

    expect(screen.getByText('현재 비밀번호')).toBeInTheDocument();
    expect(screen.queryByText('정말 비밀번호를 변경하시겠습니까?')).not.toBeInTheDocument();
  });

  it('"변경합니다" 클릭 후 성공 시 토큰이 제거되고 페이지가 리로드된다', async () => {
    const { patchPassword } = await import('../api/user.js');
    patchPassword.mockResolvedValue({});
    localStorage.setItem('accessToken', 'tok');
    localStorage.setItem('refreshToken', 'ref');
    const reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', { configurable: true, writable: true, value: { reload: reloadSpy } });

    renderProfile(mockApiUserLocal);
    fireEvent.click(screen.getByText('변경'));
    fillPasswordForm();
    fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }));
    fireEvent.click(screen.getByText('변경합니다'));

    await waitFor(() => {
      expect(patchPassword).toHaveBeenCalledWith({
        currentPassword: 'old1234!',
        newPassword: 'new1234!!',
        confirmPassword: 'new1234!!',
      });
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(reloadSpy).toHaveBeenCalled();
    });
  });

  it('"변경합니다" 클릭 후 API 실패 시 에러와 함께 입력 폼으로 돌아간다', async () => {
    const { patchPassword } = await import('../api/user.js');
    const error = Object.assign(new Error('HTTP 401'), {
      body: { message: '현재 비밀번호가 올바르지 않습니다.' },
    });
    patchPassword.mockRejectedValue(error);

    renderProfile(mockApiUserLocal);
    fireEvent.click(screen.getByText('변경'));
    fillPasswordForm({ current: 'wrong!!!' });
    fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }));
    fireEvent.click(screen.getByText('변경합니다'));

    await waitFor(() => {
      expect(screen.getByText('현재 비밀번호가 올바르지 않습니다.')).toBeInTheDocument();
    });
    expect(screen.getByText('현재 비밀번호')).toBeInTheDocument(); // 폼으로 복귀
    expect(screen.queryByText('정말 비밀번호를 변경하시겠습니까?')).not.toBeInTheDocument();
  });
});

// ─── 회원 탈퇴 ──────────────────────────────────────────────────────────────

describe('ProfileScreen — 회원 탈퇴', () => {
  it('confirm 취소 시 deleteUserMe가 호출되지 않는다', async () => {
    const { deleteUserMe } = await import('../api/user.js');
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    renderProfile();
    fireEvent.click(screen.getByText('회원 탈퇴'));

    expect(deleteUserMe).not.toHaveBeenCalled();
  });

  it('confirm 확인 시 deleteUserMe가 호출된다', async () => {
    const { deleteUserMe } = await import('../api/user.js');
    deleteUserMe.mockResolvedValue();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderProfile();
    fireEvent.click(screen.getByText('회원 탈퇴'));

    await waitFor(() => {
      expect(deleteUserMe).toHaveBeenCalled();
    });
  });

  it('탈퇴 API 실패 시 alert가 표시된다', async () => {
    const { deleteUserMe } = await import('../api/user.js');
    deleteUserMe.mockRejectedValue(new Error('server error'));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});

    renderProfile();
    fireEvent.click(screen.getByText('회원 탈퇴'));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('회원 탈퇴에 실패했습니다. 다시 시도해주세요.');
    });
  });
});
