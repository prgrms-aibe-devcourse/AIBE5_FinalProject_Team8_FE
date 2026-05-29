import { request } from './client.js';

/**
 * TIL 요약 생성
 * POST /api/v1/ai/summary
 * @param {string} potId
 * @returns {{ summary: string, keyPoints: string[], usedPoint: number, remainPoint: number }}
 */
export async function generateSummary(potId) {
  return request('/api/v1/ai/summary', {
    method: 'POST',
    body: JSON.stringify({ potId }),
  });
}

/**
 * 복습 문제 생성
 * POST /api/v1/ai/quiz
 * @param {string} potId
 * @param {number} count  문제 수 (1~10)
 * @returns {{ quizzes: Array<{ question: string, answer: string, hint?: string }>, usedPoint: number, remainPoint: number }}
 */
export async function generateQuiz(potId, count) {
  return request('/api/v1/ai/quiz', {
    method: 'POST',
    body: JSON.stringify({ potId, count }),
  });
}

/**
 * AI 결과 저장
 * POST /api/v1/ai/results
 * @param {'SUMMARY'|'QUIZ'} type
 * @param {string} potId
 * @param {object} content  저장할 결과 원문 (API 응답 그대로)
 * @returns {{ resultId: string, createdAt: string }}
 */
export async function saveResult(type, potId, content) {
  return request('/api/v1/ai/results', {
    method: 'POST',
    body: JSON.stringify({ type, potId, content: JSON.stringify(content) }),
  });
}

/**
 * AI 결과 목록 조회
 * GET /api/v1/ai/results
 * @returns {{ results: Array<{ resultId: string, type: string, content: object, potId: string, createdAt: string }> }}
 */
export async function fetchResults() {
  return request('/api/v1/ai/results');
}

/**
 * AI 결과 삭제
 * DELETE /api/v1/ai/results/{resultId}
 * @param {string} resultId
 */
export async function deleteResult(resultId) {
  return request(`/api/v1/ai/results/${resultId}`, { method: 'DELETE' });
}
