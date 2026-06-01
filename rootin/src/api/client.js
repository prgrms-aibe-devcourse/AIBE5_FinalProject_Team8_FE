const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

/**
 * 공통 fetch 래퍼
 * - Authorization 헤더 자동 주입 (localStorage의 accessToken)
 * - 4xx/5xx 응답을 Error로 변환
 * - 402 등 상태 코드는 error.status로 식별 가능
 */
export async function request(path, options = {}) {
  const token = localStorage.getItem('accessToken');
  const userId = localStorage.getItem('userId');
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(userId ? { 'X-USER-ID': userId } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    try {
      err.body = await res.json();
    } catch {
      // json 파싱 실패 시 body 없이 진행
    }
    throw err;
  }

  return res.json();
}
