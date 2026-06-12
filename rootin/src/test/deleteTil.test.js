import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteTil } from '../api/til.js';

// client.js의 request 함수를 모킹합니다.
vi.mock('../api/client.js', () => ({
  request: vi.fn(),
}));

import { request } from '../api/client.js';

describe('deleteTil', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('204 정상 응답 시 에러 없이 완료된다', async () => {
    // 204 No Content — request가 null을 반환하는 케이스
    request.mockResolvedValueOnce(null);

    await expect(deleteTil(42)).resolves.toBeUndefined();
    expect(request).toHaveBeenCalledWith('/api/v1/tils/42', { method: 'DELETE' });
  });

  it('403 응답 시 status 403 에러를 던진다', async () => {
    const err = new Error('HTTP 403');
    err.status = 403;
    err.body = { message: '삭제 권한이 없습니다.' };
    request.mockRejectedValueOnce(err);

    const result = deleteTil(42);
    await expect(result).rejects.toMatchObject({ status: 403 });
  });

  it('404 응답 시 status 404 에러를 던진다', async () => {
    const err = new Error('HTTP 404');
    err.status = 404;
    err.body = { message: '해당 TIL을 찾을 수 없습니다.' };
    request.mockRejectedValueOnce(err);

    const result = deleteTil(99);
    await expect(result).rejects.toMatchObject({ status: 404 });
  });
});
