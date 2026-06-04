const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

async function parseResponseBody(res) {
  const text = await res.text();
  if (!text) return null;
  return JSON.parse(text);
}

async function reissueAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return null;

  const res = await fetch(`${BASE_URL}/api/v1/auth/reissue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) return null;

  const body = await parseResponseBody(res);
  const tokenData = body?.data ?? body;

  if (!tokenData?.accessToken) return null;

  localStorage.setItem('accessToken', tokenData.accessToken);
  if (tokenData.refreshToken) {
    localStorage.setItem('refreshToken', tokenData.refreshToken);
  }

  return tokenData.accessToken;
}

/**
 * 공통 fetch 래퍼
 * - Authorization 헤더 자동 주입 (localStorage의 accessToken)
 * - 4xx/5xx 응답을 Error로 변환
 * - 402 등 상태 코드는 error.status로 식별 가능
 */
export async function request(path, options = {}, retry = true) {
  const token = localStorage.getItem('accessToken');

  // fetch API를 호출하여 서버에 요청을 전송합니다.
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      // 로컬 스토리지에 로그인 토큰(accessToken)이 있다면 Bearer 헤더를 자동으로 주입합니다.
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    if (res.status === 401 && retry && path !== '/api/v1/auth/reissue') {
      const newAccessToken = await reissueAccessToken();
      if (newAccessToken) {
        return request(path, options, false);
      }
    }

    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    try {
      err.body = await parseResponseBody(res);
    } catch {
      // json 파싱 실패 시 body 없이 진행
    }
    throw err;
  }

  // 204 No Content 또는 200 OK 빈 응답은 본문이 없으므로 json 파싱을 건너뛴다
  return parseResponseBody(res);
}
