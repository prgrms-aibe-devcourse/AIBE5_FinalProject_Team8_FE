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
 *   createdAt: string,
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
 *   createdAt: string,
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
 * POST /api/v1/users/me/profile-image/presigned-url?fileName=xxx&fileSize=yyy
 *
 * @param {{ filename: string, fileSize: number }} param
 * @returns {Promise<{ presignedUrl: string, fileUrl: string }>}
 */
export async function getProfileImagePresignedUrl({ filename, fileSize }) {
  const params = new URLSearchParams({ fileName: filename, fileSize });
  const res = await request(`/api/v1/users/me/profile-image/presigned-url?${params}`, {
    method: 'POST',
  });
  return res.data ?? res;
}

/**
 * 비밀번호 변경
 * PATCH /api/v1/users/me/password
 *
 * @param {{ currentPassword: string, newPassword: string, confirmPassword: string }} data
 * @returns {Promise<void>}
 */
export async function patchPassword({ currentPassword, newPassword, confirmPassword }) {
  const res = await request('/api/v1/users/me/password', {
    method: 'PATCH',
    body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
  });
  return res?.data ?? res;
}

/**
 * 회원 탈퇴
 * DELETE /api/v1/users/me
 */
export async function deleteUserMe() {
  await request('/api/v1/users/me', { method: 'DELETE' });
}
