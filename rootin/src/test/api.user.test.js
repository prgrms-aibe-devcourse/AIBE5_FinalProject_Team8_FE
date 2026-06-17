import { describe, it, expect, vi, beforeEach } from 'vitest';

// client.js의 request를 mock
vi.mock('../api/client.js', () => ({
  request: vi.fn(),
}));

import { request } from '../api/client.js';
import { getMe, patchUserMe, patchPassword } from '../api/user.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getMe', () => {
  it('GET /api/v1/users/me 를 호출한다', async () => {
    request.mockResolvedValue({ userId: 1, nickname: '소나무', createdAt: '2024-03-15T10:00:00Z' });
    const result = await getMe();
    expect(request).toHaveBeenCalledWith('/api/v1/users/me');
    expect(result.nickname).toBe('소나무');
  });

  it('응답에 createdAt 필드가 포함된다', async () => {
    request.mockResolvedValue({ userId: 1, nickname: '소나무', createdAt: '2024-03-15T10:00:00Z' });
    const result = await getMe();
    expect(result.createdAt).toBe('2024-03-15T10:00:00Z');
  });
});

describe('patchUserMe', () => {
  it('PATCH /api/v1/users/me 를 올바른 body로 호출한다', async () => {
    request.mockResolvedValue({ userId: 1, nickname: '새이름', bio: '새 소개' });

    const result = await patchUserMe({ nickname: '새이름', bio: '새 소개' });

    expect(request).toHaveBeenCalledWith('/api/v1/users/me', {
      method: 'PATCH',
      body: JSON.stringify({ nickname: '새이름', bio: '새 소개' }),
    });
    expect(result.nickname).toBe('새이름');
  });

  it('API 실패 시 에러를 throw한다', async () => {
    const error = Object.assign(new Error('HTTP 400'), { status: 400, body: { message: '잘못된 요청' } });
    request.mockRejectedValue(error);

    await expect(patchUserMe({ nickname: '' })).rejects.toThrow('HTTP 400');
  });
});

describe('patchPassword', () => {
  it('PATCH /api/v1/users/me/password 를 올바른 body로 호출한다', async () => {
    request.mockResolvedValue({});

    await patchPassword({ currentPassword: 'old1234!', newPassword: 'new1234!', confirmPassword: 'new1234!' });

    expect(request).toHaveBeenCalledWith('/api/v1/users/me/password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword: 'old1234!', newPassword: 'new1234!', confirmPassword: 'new1234!' }),
    });
  });

  it('현재 비밀번호가 틀리면 401 에러를 throw한다', async () => {
    const error = Object.assign(new Error('HTTP 401'), { status: 401, body: { message: '현재 비밀번호가 올바르지 않습니다.' } });
    request.mockRejectedValue(error);

    await expect(
      patchPassword({ currentPassword: 'wrong', newPassword: 'new1234!', confirmPassword: 'new1234!' })
    ).rejects.toThrow('HTTP 401');
  });

  it('새 비밀번호 불일치 시 400 에러를 throw한다', async () => {
    const error = Object.assign(new Error('HTTP 400'), { status: 400, body: { message: '새 비밀번호와 확인 비밀번호가 일치하지 않습니다.' } });
    request.mockRejectedValue(error);

    await expect(
      patchPassword({ currentPassword: 'old1234!', newPassword: 'new1234!', confirmPassword: 'diff1234!' })
    ).rejects.toThrow('HTTP 400');
  });
});
