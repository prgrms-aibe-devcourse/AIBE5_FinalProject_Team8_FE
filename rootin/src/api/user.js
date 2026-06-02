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
export async function getMe() {
  const res = await request('/api/v1/users/me');
  return res.data ?? res;
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
export async function patchUserMe(data) {
  const res = await request('/api/v1/users/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return res.data ?? res;
}

/**
 * 프로필 이미지 업로드용 Presigned URL 발급
 * POST /api/v1/users/me/profile-image/presigned-url
 *
 * @param {{ filename: string, contentType: string }} param
 * @returns {Promise<{ presignedUrl: string, fileUrl: string }>}
 */
export async function getProfileImagePresignedUrl({ filename, contentType }) {
  const res = await request('/api/v1/users/me/profile-image/presigned-url', {
    method: 'POST',
    body: JSON.stringify({ filename, contentType }),
  });
  return res.data ?? res;
}

/**
 * 회원 탈퇴
 * DELETE /api/v1/users/me
 */
export async function deleteUserMe() {
  await request('/api/v1/users/me', { method: 'DELETE' });
}
