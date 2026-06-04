import { request } from './client.js';

/**
 * 만개한 식물 수확하기
 * POST /api/v1/pots/{potId}/harvest
 */
export const harvestPot = (potId) =>
  request(`/api/v1/pots/${potId}/harvest`, { method: 'POST' }).then(r => r.data);

/**
 * 정원 상태 전체 조회
 * GET /api/v1/garden
 * 사용자의 정원 테마 정보, 배치 및 미배치 화분 목록, 수확한 식물 목록을 한 번에 조회합니다.
 */
export const getGardenState = () =>
  request('/api/v1/garden', { method: 'GET' });

/**
 * 정원 배경 테마 변경
 * PATCH /api/v1/garden/theme
 * @param {string} theme - 'FOREST' | 'AUTUMN' | 'NIGHT' | 'MINI_ROOM'
 */
export const updateGardenTheme = (theme) =>
  request('/api/v1/garden/theme', {
    method: 'PATCH',
    body: JSON.stringify({ theme }),
  });

/**
 * 화분/수확 식물의 배치 여부 및 위치 좌표 정보를 일괄 저장합니다.
 * PUT /api/v1/garden/layout
 * @param {{
 *   pots: Array<{ id: number, isDisplayed: boolean, positionX: number | null, positionY: number | null }>,
 *   harvestedPlants: Array<{ id: number, isDisplayed: boolean, positionX: number | null, positionY: number | null }>
 * }} payload
 */
export const updateGardenLayout = (payload) =>
  request('/api/v1/garden/layout', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
