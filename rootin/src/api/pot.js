import { request } from './client.js';

// 기존에 사용하던 임시 유저 식별용 헬퍼 함수들과 헤더 세팅 로직을 모두 제거하였습니다.
// 이제 백엔드 API 서버는 로그인 후 헤더에 포함되는 JWT(accessToken)로 유저를 판별합니다.

/**
 * 화분 목록 조회
 * GET /api/v1/pots
 *
 * @returns {Promise<Array<{
 *   id: number,
 *   title: string,
 *   description: string,
 *   level: number,
 *   totalExp: number,
 *   isDisplayed: boolean,
 *   plantName: string,
 *   growthStage: 'SEED' | 'SPROUT' | 'MATURE' | 'BLOOM' | 'FULL_BLOOM',
 *   lastWateredAt: string | null,
 * }>>}
 */
export function getPots() {
  // headers 옵션을 제거하여 client.js의 Bearer 토큰 인증 헤더를 그대로 활용합니다.
  return request('/api/v1/pots');
}

/**
 * 화분 생성
 * POST /api/v1/pots
 *
 * @param {{ title: string, description?: string }} payload
 * @returns {Promise<{
 *   id: number,
 *   title: string,
 *   description: string,
 *   level: number,
 *   totalExp: number,
 *   isDisplayed: boolean,
 *   positionX: number,
 *   positionY: number,
 *   createdAt: string,
 * }>}
 */
export function createPot(payload) {
  return request('/api/v1/pots', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * 화분 정보 수정
 * PATCH /api/v1/pots/{potId}
 *
 * @param {number|string} potId
 * @param {{ title: string, description?: string }} payload
 */
export function updatePot(potId, payload) {
  return request(`/api/v1/pots/${potId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/**
 * 특정 화분 기본 상세 조회
 * GET /api/v1/pots/{potId}
 *
 * @param {number|string} potId
 * @returns {Promise<{
 *   id: number,
 *   title: string,
 *   description: string,
 *   level: number,
 *   totalExp: number,
 *   isDisplayed: boolean,
 *   positionX: number,
 *   positionY: number,
 *   createdAt: string,
 * }>}
 */
export function getPot(potId) {
  return request(`/api/v1/pots/${potId}`);
}

/**
 * 화분 대시보드 조회
 * GET /api/v1/pots/{potId}/dashboard
 *
 * @param {number|string} potId
 * @returns {Promise<{
 *   potId: number,
 *   title: string,
 *   description: string,
 *   level: number,
 *   totalExp: number,
 *   currentLevelExp: number,
 *   nextLevelExpRequired: number,
 *   progressPercentage: number,
 *   totalTilCount: number,
 *   streakDays: number,
 *   lastWateredAt: string | null,
 *   plant: {
 *     name: string,
 *     growthStage: 'SEED' | 'SPROUT' | 'MATURE' | 'BLOOM' | 'FULL_BLOOM',
 *     imageUrl: string | null,
 *     silhouetteUrl: string | null,
 *     growthPercentage: number,
 *     canHarvest: boolean,
 *   },
 * }>}
 */
export function getGardenDashboard(potId) {
  return request(`/api/v1/pots/${potId}/dashboard`);
}
