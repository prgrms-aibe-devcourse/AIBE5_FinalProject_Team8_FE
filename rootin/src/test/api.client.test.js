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

  it('토큰 재발급이 실패하면 대기 중인 요청들에 401 에러를 전파한다', async () => {
    localStorage.setItem('accessToken', 'old-access');
    localStorage.setItem('refreshToken', 'expired-refresh');

    const fetchMock = vi.fn(async (url) => {
      if (String(url).endsWith('/api/v1/auth/reissue')) {
        return jsonResponse({ message: 'Refresh token expired' }, 401);
      }

      return jsonResponse({ message: 'Unauthorized' }, 401);
    });
    vi.stubGlobal('fetch', fetchMock);

    const { request } = await import('../api/client.js');

    const results = await Promise.allSettled([
      request('/api/v1/users/me'),
      request('/api/v1/dashboard/summary'),
    ]);

    expect(results).toHaveLength(2);
    results.forEach(result => {
      expect(result.status).toBe('rejected');
      expect(result.reason.status).toBe(401);
    });

    const reissueCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).endsWith('/api/v1/auth/reissue')
    );

    expect(reissueCalls).toHaveLength(1);
  });

  it('refresh token이 없으면 재발급 요청 없이 원래 401 에러를 전파한다', async () => {
    localStorage.setItem('accessToken', 'old-access');

    const fetchMock = vi.fn(async () =>
      jsonResponse({ message: 'Unauthorized' }, 401)
    );
    vi.stubGlobal('fetch', fetchMock);

    const { request } = await import('../api/client.js');

    await expect(request('/api/v1/users/me')).rejects.toMatchObject({ status: 401 });

    const reissueCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).endsWith('/api/v1/auth/reissue')
    );

    expect(reissueCalls).toHaveLength(0);
  });

  it('토큰 재발급 네트워크 오류가 동시 요청에 전파되고 다음 요청에서 재시도할 수 있다', async () => {
    localStorage.setItem('accessToken', 'old-access');
    localStorage.setItem('refreshToken', 'refresh-token');
    let reissueCount = 0;

    const fetchMock = vi.fn(async (url, options = {}) => {
      if (String(url).endsWith('/api/v1/auth/reissue')) {
        reissueCount += 1;
        if (reissueCount === 1) {
          throw new TypeError('Network down');
        }
        return jsonResponse({
          data: {
            accessToken: 'recovered-access',
            refreshToken: 'recovered-refresh',
          },
        });
      }

      if (options.headers?.Authorization === 'Bearer recovered-access') {
        return jsonResponse({ data: { ok: true } });
      }

      return jsonResponse({ message: 'Unauthorized' }, 401);
    });
    vi.stubGlobal('fetch', fetchMock);

    const { request } = await import('../api/client.js');

    const failedResults = await Promise.allSettled([
      request('/api/v1/users/me'),
      request('/api/v1/dashboard/summary'),
    ]);

    failedResults.forEach(result => {
      expect(result.status).toBe('rejected');
      expect(result.reason).toBeInstanceOf(TypeError);
    });
    expect(reissueCount).toBe(1);

    await expect(request('/api/v1/users/me')).resolves.toEqual({ data: { ok: true } });
    expect(reissueCount).toBe(2);
    expect(localStorage.getItem('accessToken')).toBe('recovered-access');
    expect(localStorage.getItem('refreshToken')).toBe('recovered-refresh');
  });
});
