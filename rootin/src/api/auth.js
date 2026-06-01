import { request } from './client.js';

// =====================================================================
// 토큰 localStorage 헬퍼
// =====================================================================

export function saveTokens({ accessToken, refreshToken }) {
  localStorage.setItem('accessToken', accessToken);
  if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
}

export function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

// =====================================================================
// 1. 이메일 회원가입
// POST /api/v1/auth/signup
// Body: { email, password, nickname }
// Response: { accessToken, refreshToken, accessTokenExpiresIn }
// =====================================================================
export async function signup({ email, password, nickname }) {
  const data = await request('/api/v1/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, nickname }),
  });
  saveTokens(data.data);
  return data.data;
}

// =====================================================================
// 2. 이메일 로그인
// POST /api/v1/auth/login
// Body: { email, password }
// Response: { accessToken, refreshToken, accessTokenExpiresIn }
// =====================================================================
export async function login({ email, password }) {
  const data = await request('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  saveTokens(data.data);
  return data.data;
}

// =====================================================================
// 3. 구글 소셜 로그인
// POST /api/v1/auth/google
// Body: { idToken }
// Response: { accessToken, refreshToken, accessTokenExpiresIn, isNewUser }
// =====================================================================
export async function googleLogin({ idToken }) {
  const data = await request('/api/v1/auth/google', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  });
  saveTokens(data.data);
  return data.data;
}

// =====================================================================
// 4. Access Token 재발급
// POST /api/v1/auth/reissue
// Body: { refreshToken }
// Response: { accessToken, refreshToken, accessTokenExpiresIn }
// =====================================================================
export async function reissue() {
  const refreshToken = localStorage.getItem('refreshToken');
  const data = await request('/api/v1/auth/reissue', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
  saveTokens(data.data);
  return data.data;
}

// =====================================================================
// 5. 로그아웃
// POST /api/v1/auth/logout
// Auth: 필요 (Authorization 헤더 자동 주입)
// =====================================================================
export async function logout() {
  await request('/api/v1/auth/logout', { method: 'POST' });
  clearTokens();
}
