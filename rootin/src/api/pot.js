import { request } from './client.js';

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
 * }>>}
 */
export function getPots() {
  return request('/api/v1/pots');
}
