import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateSummary,
  generateQuiz,
  saveResult,
  fetchResults,
  deleteResult,
} from './ai.js';

// client.js의 request 함수를 모킹
vi.mock('./client.js', () => ({
  request: vi.fn(),
}));

import { request } from './client.js';

beforeEach(() => {
  request.mockReset();
  request.mockResolvedValue({});
});

describe('generateSummary', () => {
  it('/api/v1/ai/summary 경로로 POST 요청을 보낸다', async () => {
    await generateSummary('pot-001');

    expect(request).toHaveBeenCalledWith('/api/v1/ai/summary', {
      method: 'POST',
      body: JSON.stringify({ potId: 'pot-001' }),
    });
  });
});

describe('generateQuiz', () => {
  it('/api/v1/ai/quiz 경로로 POST 요청을 보낸다', async () => {
    await generateQuiz('pot-001', 5);

    expect(request).toHaveBeenCalledWith('/api/v1/ai/quiz', {
      method: 'POST',
      body: JSON.stringify({ potId: 'pot-001', count: 5 }),
    });
  });
});

describe('saveResult', () => {
  it('/api/v1/ai/results 경로로 POST 요청을 보낸다', async () => {
    const content = { summary: '테스트 요약' };
    await saveResult('SUMMARY', 'pot-001', content);

    // content는 BE의 String 타입에 맞게 JSON.stringify되어 전달됨
    expect(request).toHaveBeenCalledWith('/api/v1/ai/results', {
      method: 'POST',
      body: JSON.stringify({ type: 'SUMMARY', potId: 'pot-001', content: JSON.stringify(content) }),
    });
  });
});

describe('fetchResults', () => {
  it('/api/v1/ai/results 경로로 GET 요청을 보낸다', async () => {
    await fetchResults();

    expect(request).toHaveBeenCalledWith('/api/v1/ai/results');
  });
});

describe('deleteResult', () => {
  it('/api/v1/ai/results/:resultId 경로로 DELETE 요청을 보낸다', async () => {
    await deleteResult('result-123');

    expect(request).toHaveBeenCalledWith('/api/v1/ai/results/result-123', {
      method: 'DELETE',
    });
  });
});
