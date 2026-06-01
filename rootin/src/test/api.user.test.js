import { describe, it, expect, vi, beforeEach } from 'vitest';

// client.js의 request를 mock
vi.mock('../api/client.js', () => ({
  request: vi.fn(),
}));

import { request } from '../api/client.js';
import { getMe, patchUserMe } from '../api/user.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getMe', () => {
  it('GET /api/v1/users/me 를 호출한다', async () => {
    request.mockResolvedValue({ userId: 1, nickname: '소나무' });
    const result = await getMe();
    expect(request).toHaveBeenCalledWith('/api/v1/users/me');
    expect(result.nickname).toBe('소나무');
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
