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

/**
 * 현재 로그인한 사용자 프로필 수정
 * PATCH /api/v1/users/me
 *
 * @param {{ nickname?: string, bio?: string }} data
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
export function patchUserMe(data) {
  return request('/api/v1/users/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
