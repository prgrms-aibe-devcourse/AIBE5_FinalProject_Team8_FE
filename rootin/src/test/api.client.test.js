import { beforeEach, describe, expect, it, vi } from 'vitest';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('api client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    localStorage.clear();
  });

  it('동시에 여러 요청이 401을 받아도 토큰 재발급은 한 번만 수행한다', async () => {
    localStorage.setItem('accessToken', 'old-access');
    localStorage.setItem('refreshToken', 'old-refresh');

    const fetchMock = vi.fn(async (url, options = {}) => {
      if (String(url).endsWith('/api/v1/auth/reissue')) {
        return jsonResponse({
          data: {
            accessToken: 'new-access',
            refreshToken: 'new-refresh',
          },
        });
      }

      if (options.headers?.Authorization === 'Bearer new-access') {
        return jsonResponse({ data: { ok: true } });
      }

      return jsonResponse({ message: 'Unauthorized' }, 401);
    });
    vi.stubGlobal('fetch', fetchMock);

    const { request } = await import('../api/client.js');

    await Promise.all([
      request('/api/v1/users/me'),
      request('/api/v1/dashboard/summary'),
    ]);

    const reissueCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).endsWith('/api/v1/auth/reissue')
    );

    expect(reissueCalls).toHaveLength(1);
    expect(localStorage.getItem('accessToken')).toBe('new-access');
    expect(localStorage.getItem('refreshToken')).toBe('new-refresh');
  });
});
