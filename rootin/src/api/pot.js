import { request } from './client.js';

const TEMP_GARDEN_USER_ID = 1;

function resolveTemporaryUserId(userId) {
  if (userId) return userId;
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('rootinUserId') ?? TEMP_GARDEN_USER_ID;
  }
  return TEMP_GARDEN_USER_ID;
}

function gardenHeaders(userId) {
  return {
    'X-USER-ID': String(resolveTemporaryUserId(userId)),
  };
}

/**
 * 화분 목록 조회
 * GET /api/v1/pots
 * Auth 임시 정책: X-USER-ID 헤더 필요
 *
 * @param {number|string} [userId]
 * @returns {Promise<Array<{
 *   id: number,
 *   title: string,
 *   description: string,
 *   level: number,
 *   totalExp: number,
 *   isDisplayed: boolean,
 *   plantName: string,
 *   growthStage: 'SEED' | 'SPROUT' | 'MATURE' | 'BLOOM' | 'FULL_BLOOM',
 * }>>}
 */
export function getPots(userId) {
  return request('/api/v1/pots', {
    headers: gardenHeaders(userId),
  });
}

/**
 * 화분 생성
 * POST /api/v1/pots
 * Auth 임시 정책: X-USER-ID 헤더 필요
 *
 * @param {{ title: string, description?: string }} payload
 * @param {number|string} [userId]
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
export function createPot(payload, userId) {
  return request('/api/v1/pots', {
    method: 'POST',
    headers: gardenHeaders(userId),
    body: JSON.stringify(payload),
  });
}

/**
 * 특정 화분 기본 상세 조회
 * GET /api/v1/pots/{potId}
 * Auth 임시 정책: X-USER-ID 헤더 필요
 *
 * @param {number|string} potId
 * @param {number|string} [userId]
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
export function getPot(potId, userId) {
  return request(`/api/v1/pots/${potId}`, {
    headers: gardenHeaders(userId),
  });
}

/**
 * 화분 대시보드 조회
 * GET /api/v1/pots/{potId}/dashboard
 * Auth 임시 정책: X-USER-ID 헤더 필요
 *
 * @param {number|string} potId
 * @param {number|string} [userId]
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
export function getGardenDashboard(potId, userId) {
  return request(`/api/v1/pots/${potId}/dashboard`, {
    headers: gardenHeaders(userId),
  });
}
