import { request } from './client.js';

/**
 * 현재 로그인한 사용자 정보 조회
 * GET /api/v1/users/me
 *
 * @returns {Promise<{
 *   userId: number,
 *   nickname: string,
 *   bio: string,
 *   profileImageUrl: string,
 *   email: string,
 *   provider: string,
 *   point: number,
 *   tilCount: number,
 * }>}
 */
export function getMe() {
  return request('/api/v1/users/me');
}
