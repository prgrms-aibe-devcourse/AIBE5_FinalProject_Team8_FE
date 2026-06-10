import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AIScreen } from '../screens-rest.jsx';

// AIScreen과 같은 파일에서 import되는 복잡한 컴포넌트 mock
vi.mock('../plants.jsx', () => ({
  Plant: () => null,
  STAGE_META: {
    seed: { label: '씨앗' }, sprout: { label: '새싹' },
    leaf: { label: '잎' }, bloom: { label: '개화' }, full: { label: '만개' },
  },
}));

vi.mock('../pixel-plants.jsx', () => ({
  PixelPlant: ({ species, stage }) => <div data-testid={`pixel-plant-${species}-${stage}`} />,
  PIXEL_SPECIES: {},
}));

// API 모듈 전체 mock
vi.mock('../api/ai.js', () => ({
  generateSummary: vi.fn(),
  generateQuiz: vi.fn(),
  saveResult: vi.fn(),
  fetchResults: vi.fn(),
  deleteResult: vi.fn(),
}));

vi.mock('../api/pot.js', () => ({
  getPots: vi.fn(),
}));

vi.mock('../api/til.js', () => ({
  getMyTils: vi.fn(),
}));

// UserContext mock — AIScreen은 useUser()로 포인트를 초기화
vi.mock('../context/UserContext.jsx', () => ({
  useUser: vi.fn(() => ({ user: { points: 1240 } })),
}));

import {
  generateSummary,
  generateQuiz,
  saveResult,
  fetchResults,
  deleteResult,
} from '../api/ai.js';
import { getPots } from '../api/pot.js';
import { getMyTils } from '../api/til.js';
import { useUser } from '../context/UserContext.jsx';

// ──────────────────────────────────────────────
// Mock 데이터 상수 (BE 응답 구조 기준)
// ──────────────────────────────────────────────

const MOCK_POTS = [
  { id: 1, title: '코딩', level: 7, totalExp: 1250, growthStage: 'BLOOM',   isDisplayed: true,  plantName: '기본 씨앗', description: '' },
  { id: 2, title: '영어', level: 3, totalExp: 450,  growthStage: 'SPROUT',  isDisplayed: false, plantName: '달빛씨앗',  description: '' },
  { id: 3, title: '독서', level: 2, totalExp: 300,  growthStage: 'SPROUT',  isDisplayed: false, plantName: '버섯씨앗',  description: '' },
];

const MOCK_ME = {
  userId: 1,
  nickname: '소연',
  point: 1240,
  tilCount: 47,
  email: 'test@rootin.app',
};

const MOCK_TILS = {
  content: [
    { tilId: 10, title: 'Container Queries 정리', publishedAt: '2026-05-20T10:00:00Z', tags: ['CSS', 'Frontend'] },
    { tilId: 11, title: 'React Server Components',  publishedAt: '2026-05-21T10:00:00Z', tags: ['React'] },
    { tilId: 12, title: 'TypeScript 유틸리티 타입',  publishedAt: '2026-05-22T10:00:00Z', tags: ['TypeScript'] },
  ],
  totalElements: 3,
  totalPages: 1,
};

const MOCK_QUIZ_RESPONSE = {
  quizzes: [
    {
      question: 'CSS Container Queries에서 필수 속성은?',
      choices: ['display', 'container-type', 'position', 'overflow'],
      answer: 'container-type',
      hint: '컨테이너 선언 관련',
    },
    {
      question: 'React에서 클라이언트 컴포넌트를 선언하는 지시어는?',
      choices: ['"use server"', '"use strict"', '"use client"', '"use memo"'],
      answer: '"use client"',
      hint: null,
    },
  ],
  usedPoint: 50,
  remainPoint: 1190,
};

const MOCK_SUMMARY_RESPONSE = {
  summary: '이번 주의 핵심은 Container Queries와 RSC입니다.',
  keyPoints: ['Container Queries로 컴포넌트 단위 반응형 가능', 'use client 지시어로 클라이언트 경계 명확화'],
  usedPoint: 50,
  remainPoint: 1190,
};

const MOCK_SAVE_RESPONSE = {
  resultId: 1,
  createdAt: '2026-05-28T10:00:00Z',
};

const MOCK_FETCH_RESULTS_RESPONSE = [
  {
    resultId: 2,
    type: 'QUIZ',
    potId: 1,
    content: JSON.stringify(MOCK_QUIZ_RESPONSE),
    createdAt: '2026-05-25T10:00:00Z',
  },
  {
    resultId: 3,
    type: 'SUMMARY',
    potId: 2,
    content: JSON.stringify(MOCK_SUMMARY_RESPONSE),
    createdAt: '2026-05-24T10:00:00Z',
  },
];

beforeEach(() => {
  getPots.mockResolvedValue(MOCK_POTS);
  getMyTils.mockResolvedValue(MOCK_TILS);
  useUser.mockReturnValue({ user: { points: MOCK_ME.point } });
  fetchResults.mockResolvedValue(MOCK_FETCH_RESULTS_RESPONSE);
  generateQuiz.mockResolvedValue(MOCK_QUIZ_RESPONSE);
  generateSummary.mockResolvedValue(MOCK_SUMMARY_RESPONSE);
  saveResult.mockResolvedValue(MOCK_SAVE_RESPONSE);
  deleteResult.mockResolvedValue({});
});

afterEach(() => {
  vi.clearAllMocks();
});

// ──────────────────────────────────────────────
// 공통 헬퍼: 화분 목록 로딩 완료까지 대기
// ──────────────────────────────────────────────

async function waitForPots() {
  await waitFor(() => expect(screen.getByText('코딩')).toBeInTheDocument());
}

// 퀴즈 모드: 만들기 버튼 → 모달 → TIL 선택 → 확인 → 생성 완료
async function renderAndGenerate() {
  render(<AIScreen />);
  await waitForPots();

  fireEvent.click(screen.getByRole('button', { name: /만들기/i }));

  // 모달이 열린 뒤 TIL 목록 로딩 완료 대기
  await waitFor(() => expect(screen.getByText('Container Queries 정리')).toBeInTheDocument());

  // 첫 번째 TIL 선택
  fireEvent.click(screen.getByLabelText(/Container Queries 정리/i) ?? screen.getAllByRole('checkbox')[1]);

  fireEvent.click(screen.getByRole('button', { name: /개 TIL로 생성/i }));

  await waitFor(() => expect(screen.getByText('CSS Container Queries에서 필수 속성은?')).toBeInTheDocument());
}

// 요약 모드: 요약 생성하기 버튼 → 모달 → TIL 선택 → 확인 → 생성 완료
async function renderAndGenerateSummary() {
  render(<AIScreen />);
  fireEvent.click(screen.getByRole('button', { name: /TIL 요약/i }));
  await waitForPots();

  await waitFor(() => screen.getByRole('button', { name: /요약 생성하기/i }));
  fireEvent.click(screen.getByRole('button', { name: /요약 생성하기/i }));

  await waitFor(() => expect(screen.getByText('Container Queries 정리')).toBeInTheDocument());
  fireEvent.click(screen.getAllByRole('checkbox')[1]);
  fireEvent.click(screen.getByRole('button', { name: /개 TIL로 생성/i }));

  await waitFor(() =>
    expect(screen.getByText('이번 주의 핵심은 Container Queries와 RSC입니다.')).toBeInTheDocument()
  );
}

// ──────────────────────────────────────────────
// API 연동 — 화분 목록 및 포인트
// ──────────────────────────────────────────────
describe('API 연동 — 화분 목록 및 포인트', () => {
  it('페이지 진입 시 getPots()를 호출한다', async () => {
    render(<AIScreen />);
    await waitFor(() => expect(getPots).toHaveBeenCalledTimes(1));
  });

  it('getPots() 응답으로 화분 목록이 렌더링된다', async () => {
    render(<AIScreen />);
    await waitFor(() => {
      expect(screen.getByText('코딩')).toBeInTheDocument();
      expect(screen.getByText('영어')).toBeInTheDocument();
      expect(screen.getByText('독서')).toBeInTheDocument();
    });
  });

  it('getPots() 응답의 첫 번째 화분이 자동 선택된다', async () => {
    render(<AIScreen />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /만들기/i })).not.toHaveStyle({ cursor: 'not-allowed' });
    });
  });

  it('getPots() 실패 시 화분 없음 안내 문구가 표시된다', async () => {
    getPots.mockRejectedValue(new Error('Network Error'));
    render(<AIScreen />);
    await waitFor(() =>
      expect(screen.getByText('화분이 없어요. 화분을 먼저 만들어 보세요.')).toBeInTheDocument()
    );
  });

  it('getPots() 응답이 빈 배열이면 화분 없음 안내 문구가 표시된다', async () => {
    getPots.mockResolvedValue([]);
    render(<AIScreen />);
    await waitFor(() =>
      expect(screen.getByText('화분이 없어요. 화분을 먼저 만들어 보세요.')).toBeInTheDocument()
    );
  });

  it('AIScreen은 getMe()를 직접 호출하지 않는다 — 포인트는 UserContext에서 가져온다', async () => {
    render(<AIScreen />);
    await waitFor(() => expect(getPots).toHaveBeenCalledTimes(1));
    expect(useUser).toHaveBeenCalled();
  });

  it('UserContext의 user.points로 보유 포인트가 초기화된다', async () => {
    render(<AIScreen />);
    await waitFor(() =>
      expect(screen.getByText(/1240P/)).toBeInTheDocument()
    );
  });

  it('UserContext user가 null이면 보유 포인트 기본값(0)이 표시된다', async () => {
    useUser.mockReturnValue({ user: null });
    render(<AIScreen />);
    await waitFor(() =>
      expect(screen.getByText(/0P/)).toBeInTheDocument()
    );
  });

  it('PotCard에 화분 title이 렌더링된다', async () => {
    render(<AIScreen />);
    await waitFor(() => {
      expect(screen.getByText('코딩')).toBeInTheDocument();
    });
  });

  it('PotCard에 plantName, growthStage 기반 PixelPlant가 렌더링된다', async () => {
    render(<AIScreen />);
    await waitFor(() => {
      expect(screen.getByTestId('pixel-plant-seed-bloom')).toBeInTheDocument();
      expect(screen.getByTestId('pixel-plant-moonlight-sprout')).toBeInTheDocument();
      expect(screen.getByTestId('pixel-plant-mushroom-sprout')).toBeInTheDocument();
    });
  });

  it('plantName이 없는 화분은 기본 species(seed)로 폴백 렌더링된다', async () => {
    getPots.mockResolvedValue([
      { id: 1, title: '테스트', level: 1, totalExp: 0, growthStage: 'SEED', isDisplayed: false, plantName: null, description: '' },
    ]);
    render(<AIScreen />);
    await waitFor(() => {
      expect(screen.getByTestId('pixel-plant-seed-seed')).toBeInTheDocument();
    });
  });

  it('화분 목록 로딩 중에는 로딩 문구가 표시된다', async () => {
    getPots.mockReturnValue(new Promise(() => {}));
    render(<AIScreen />);
    expect(screen.getByText('화분 목록을 불러오는 중...')).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────
// 화분 선택
// ──────────────────────────────────────────────
describe('화분 선택', () => {
  it('기본으로 첫 번째 화분(코딩)이 선택되어 있다', async () => {
    render(<AIScreen />);
    await waitFor(() => {
      expect(screen.getAllByText(MOCK_POTS[0].title).length).toBeGreaterThan(0);
    });
  });

  it('다른 화분을 클릭하면 해당 화분이 선택된다', async () => {
    render(<AIScreen />);
    await waitFor(() => screen.getByRole('button', { name: /영어/i }));
    fireEvent.click(screen.getByRole('button', { name: /영어/i }));
    expect(screen.getByText('영어')).toBeInTheDocument();
  });

  it('화분을 변경해도 AI생성 버튼을 다시 누르기 전까지 생성 결과가 유지된다', async () => {
    await renderAndGenerate();

    fireEvent.click(screen.getByRole('button', { name: /독서/i }));

    expect(screen.getByRole('button', { name: '결과 저장' })).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────
// 복습 문제 수량 스텝퍼
// ──────────────────────────────────────────────
describe('복습 문제 수량 스텝퍼', () => {
  it('기본 수량은 5개다', () => {
    render(<AIScreen />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('+ 버튼을 누르면 수량이 증가한다', () => {
    render(<AIScreen />);
    const plusBtn = screen.getByRole('button', { name: '+' });
    fireEvent.click(plusBtn);
    expect(screen.getByText('6')).toBeInTheDocument();
  });

  it('- 버튼을 누르면 수량이 감소한다', () => {
    render(<AIScreen />);
    const minusBtn = screen.getByRole('button', { name: '−' });
    fireEvent.click(minusBtn);
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('최솟값은 1이다', () => {
    render(<AIScreen />);
    const minusBtn = screen.getByRole('button', { name: '−' });
    for (let i = 0; i < 10; i++) fireEvent.click(minusBtn);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('최댓값은 10이다', () => {
    render(<AIScreen />);
    const plusBtn = screen.getByRole('button', { name: '+' });
    for (let i = 0; i < 10; i++) fireEvent.click(plusBtn);
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('summary 모드에서는 수량 스텝퍼가 표시되지 않는다', () => {
    render(<AIScreen />);
    const summaryBtn = screen.getByRole('button', { name: /TIL 요약/i });
    fireEvent.click(summaryBtn);
    expect(screen.queryByText('문제 수량')).not.toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────
// TIL 선택 모달
// ──────────────────────────────────────────────
describe('TIL 선택 모달', () => {
  it('생성 버튼 클릭 시 모달이 열린다', async () => {
    render(<AIScreen />);
    await waitForPots();

    fireEvent.click(screen.getByRole('button', { name: /만들기/i }));

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: '학습할 TIL 선택' })).toBeInTheDocument()
    );
  });

  it('모달 열릴 때 getMyTils가 해당 potId로 호출된다', async () => {
    render(<AIScreen />);
    await waitForPots();

    fireEvent.click(screen.getByRole('button', { name: /만들기/i }));

    await waitFor(() =>
      expect(getMyTils).toHaveBeenCalledWith(expect.objectContaining({ potId: MOCK_POTS[0].id }))
    );
  });

  it('모달에 TIL 제목 목록이 표시된다', async () => {
    render(<AIScreen />);
    await waitForPots();

    fireEvent.click(screen.getByRole('button', { name: /만들기/i }));

    await waitFor(() => {
      expect(screen.getByText('Container Queries 정리')).toBeInTheDocument();
      expect(screen.getByText('React Server Components')).toBeInTheDocument();
      expect(screen.getByText('TypeScript 유틸리티 타입')).toBeInTheDocument();
    });
  });

  it('TIL을 선택하지 않으면 확인 버튼이 비활성화된다', async () => {
    render(<AIScreen />);
    await waitForPots();

    fireEvent.click(screen.getByRole('button', { name: /만들기/i }));

    await waitFor(() => screen.getByText('Container Queries 정리'));

    const confirmBtn = screen.getByRole('button', { name: /TIL을 선택해 주세요/i });
    expect(confirmBtn).toBeDisabled();
  });

  it('TIL 선택 후 확인 버튼에 선택 수가 표시된다', async () => {
    render(<AIScreen />);
    await waitForPots();

    fireEvent.click(screen.getByRole('button', { name: /만들기/i }));
    await waitFor(() => screen.getByText('Container Queries 정리'));

    // 첫 번째 TIL 체크박스 선택 (전체선택 체크박스 이후 순서)
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // 인덱스 0 = 전체선택

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /1개 TIL로 생성/i })).not.toBeDisabled()
    );
  });

  it('전체 선택 토글이 필터된 TIL 전체를 선택한다', async () => {
    render(<AIScreen />);
    await waitForPots();

    fireEvent.click(screen.getByRole('button', { name: /만들기/i }));
    await waitFor(() => screen.getByText('Container Queries 정리'));

    const allCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(allCheckbox);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /3개 TIL로 생성/i })).not.toBeDisabled()
    );
  });

  it('키워드 검색 시 제목 매칭 TIL만 표시된다', async () => {
    render(<AIScreen />);
    await waitForPots();

    fireEvent.click(screen.getByRole('button', { name: /만들기/i }));
    await waitFor(() => screen.getByText('Container Queries 정리'));

    fireEvent.change(screen.getByPlaceholderText('제목으로 검색...'), { target: { value: 'React' } });

    await waitFor(() => {
      expect(screen.getByText('React Server Components')).toBeInTheDocument();
      expect(screen.queryByText('Container Queries 정리')).not.toBeInTheDocument();
      expect(screen.queryByText('TypeScript 유틸리티 타입')).not.toBeInTheDocument();
    });
  });

  it('닫기 버튼 클릭 시 모달이 닫힌다', async () => {
    render(<AIScreen />);
    await waitForPots();

    fireEvent.click(screen.getByRole('button', { name: /만들기/i }));
    await waitFor(() => screen.getByRole('dialog', { name: '학습할 TIL 선택' }));

    fireEvent.click(screen.getByRole('button', { name: '닫기' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: '학습할 TIL 선택' })).not.toBeInTheDocument()
    );
  });

  it('취소 버튼 클릭 시 모달이 닫히고 API가 호출되지 않는다', async () => {
    render(<AIScreen />);
    await waitForPots();

    fireEvent.click(screen.getByRole('button', { name: /만들기/i }));
    await waitFor(() => screen.getByText('Container Queries 정리'));

    fireEvent.click(screen.getByRole('button', { name: '취소' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
    expect(generateQuiz).not.toHaveBeenCalled();
  });

  it('getMyTils 실패 시 모달 내 에러 메시지가 표시된다', async () => {
    getMyTils.mockRejectedValue(new Error('Network Error'));

    render(<AIScreen />);
    await waitForPots();

    fireEvent.click(screen.getByRole('button', { name: /만들기/i }));

    await waitFor(() =>
      expect(screen.getByText('TIL 목록을 불러오지 못했어요.')).toBeInTheDocument()
    );
  });
});

// ──────────────────────────────────────────────
// 생성 전/후 화면
// ──────────────────────────────────────────────
describe('생성 전/후 화면', () => {
  it('생성 전에는 빈 화면 안내 문구가 표시된다', () => {
    render(<AIScreen />);
    expect(screen.getByText('화분을 선택하고 생성 버튼을 눌러주세요')).toBeInTheDocument();
  });

  it('모달 확인 후 로딩 메시지가 표시된다', async () => {
    generateQuiz.mockReturnValue(new Promise(() => {}));
    render(<AIScreen />);
    await waitForPots();

    fireEvent.click(screen.getByRole('button', { name: /만들기/i }));
    await waitFor(() => screen.getByText('Container Queries 정리'));
    fireEvent.click(screen.getAllByRole('checkbox')[1]);
    fireEvent.click(screen.getByRole('button', { name: /개 TIL로 생성/i }));

    await waitFor(() =>
      expect(screen.getByText('AI가 TIL을 분석하고 있어요...')).toBeInTheDocument()
    );
  });

  it('생성 완료 후 퀴즈 결과가 표시된다', async () => {
    await renderAndGenerate();
    expect(screen.getByText('CSS Container Queries에서 필수 속성은?')).toBeInTheDocument();
  });

  it('summary 모드 생성 완료 후 요약 결과가 표시된다', async () => {
    await renderAndGenerateSummary();
    expect(screen.getByText('이번 주의 핵심은 Container Queries와 RSC입니다.')).toBeInTheDocument();
  });

  it('모드를 변경해도 AI생성 버튼을 다시 누르기 전까지 생성 결과가 유지된다', async () => {
    await renderAndGenerate();

    fireEvent.click(screen.getByRole('button', { name: /TIL 요약/i }));

    expect(screen.getByRole('button', { name: '결과 저장' })).toBeInTheDocument();
  });

  it('퀴즈 생성 후 TIL 요약 탭으로 전환해도 SectionHeader 타이틀이 복습 문제로 유지된다', async () => {
    await renderAndGenerate();

    fireEvent.click(screen.getByRole('button', { name: /TIL 요약/i }));

    expect(screen.getByRole('heading', { name: /복습 문제/ })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'TIL 요약 결과지' })).not.toBeInTheDocument();
  });

  it('퀴즈 생성 후 TIL 요약 탭으로 전환해도 퀴즈 결과 컴포넌트가 유지된다', async () => {
    await renderAndGenerate();

    fireEvent.click(screen.getByRole('button', { name: /TIL 요약/i }));

    expect(screen.getByText('CSS Container Queries에서 필수 속성은?')).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────
// API 호출 검증
// ──────────────────────────────────────────────
describe('API 호출', () => {
  it('퀴즈 생성 시 generateQuiz에 potId, count, tilIds가 전달된다', async () => {
    await renderAndGenerate();
    expect(generateQuiz).toHaveBeenCalledWith(MOCK_POTS[0].id, 5, [MOCK_TILS.content[0].tilId]);
  });

  it('요약 생성 시 generateSummary에 potId, tilIds가 전달된다', async () => {
    await renderAndGenerateSummary();
    expect(generateSummary).toHaveBeenCalledWith(MOCK_POTS[0].id, [MOCK_TILS.content[0].tilId]);
  });

  it('생성 완료 후 포인트가 remainPoint로 갱신된다', async () => {
    await renderAndGenerate();
    expect(screen.getByText(/1190P/)).toBeInTheDocument();
  });

  it('다시 생성 버튼 클릭 시 모달 없이 이전 tilIds로 재호출된다', async () => {
    await renderAndGenerate();

    fireEvent.click(screen.getByRole('button', { name: '다시 생성' }));

    await waitFor(() => expect(generateQuiz).toHaveBeenCalledTimes(2));
    expect(generateQuiz).toHaveBeenNthCalledWith(2, MOCK_POTS[0].id, 5, [MOCK_TILS.content[0].tilId]);
  });

  it('다시 생성 버튼 클릭 시 모달이 열리지 않는다', async () => {
    await renderAndGenerate();

    fireEvent.click(screen.getByRole('button', { name: '다시 생성' }));

    expect(screen.queryByRole('dialog', { name: '학습할 TIL 선택' })).not.toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────
// 에러 처리
// ──────────────────────────────────────────────
describe('에러 처리', () => {
  it('402 응답 시 포인트 부족 메시지가 표시된다', async () => {
    const err = new Error('HTTP 402');
    err.status = 402;
    generateQuiz.mockRejectedValue(err);

    render(<AIScreen />);
    await waitForPots();
    fireEvent.click(screen.getByRole('button', { name: /만들기/i }));
    await waitFor(() => screen.getByText('Container Queries 정리'));
    fireEvent.click(screen.getAllByRole('checkbox')[1]);
    fireEvent.click(screen.getByRole('button', { name: /개 TIL로 생성/i }));

    await waitFor(() =>
      expect(screen.getByText('포인트가 부족해요. 활동으로 포인트를 적립해 보세요.')).toBeInTheDocument()
    );
  });

  it('일반 네트워크 에러 시 실패 메시지가 표시된다', async () => {
    generateQuiz.mockRejectedValue(new Error('Network Error'));

    render(<AIScreen />);
    await waitForPots();
    fireEvent.click(screen.getByRole('button', { name: /만들기/i }));
    await waitFor(() => screen.getByText('Container Queries 정리'));
    fireEvent.click(screen.getAllByRole('checkbox')[1]);
    fireEvent.click(screen.getByRole('button', { name: /개 TIL로 생성/i }));

    await waitFor(() =>
      expect(screen.getByText('생성에 실패했어요. 잠시 후 다시 시도해 주세요.')).toBeInTheDocument()
    );
  });

  it('에러 발생 시 로딩 상태가 해제된다', async () => {
    generateQuiz.mockRejectedValue(new Error('fail'));

    render(<AIScreen />);
    await waitForPots();
    fireEvent.click(screen.getByRole('button', { name: /만들기/i }));
    await waitFor(() => screen.getByText('Container Queries 정리'));
    fireEvent.click(screen.getAllByRole('checkbox')[1]);
    fireEvent.click(screen.getByRole('button', { name: /개 TIL로 생성/i }));

    await waitFor(() =>
      expect(screen.queryByText('AI가 TIL을 분석하고 있어요...')).not.toBeInTheDocument()
    );
  });
});

// ──────────────────────────────────────────────
// 결과 저장 및 보관함
// ──────────────────────────────────────────────
describe('결과 저장 및 보관함', () => {
  it('페이지 진입 시 fetchResults API를 호출해 보관함을 로딩한다', async () => {
    render(<AIScreen />);
    await waitFor(() => expect(fetchResults).toHaveBeenCalledTimes(1));
  });

  it('보관함에 기존 저장 결과 목록이 표시된다', async () => {
    render(<AIScreen />);
    await waitFor(() => expect(screen.getByText(/코딩 화분 복습 문제/)).toBeInTheDocument());
  });

  it('결과 저장 버튼을 누르면 saveResult API가 호출된다', async () => {
    await renderAndGenerate();

    fireEvent.click(screen.getByRole('button', { name: '결과 저장' }));

    await waitFor(() =>
      expect(saveResult).toHaveBeenCalledWith('QUIZ', MOCK_POTS[0].id, MOCK_QUIZ_RESPONSE)
    );
  });

  it('결과 저장 후 저장됨 피드백이 표시된다', async () => {
    await renderAndGenerate();

    fireEvent.click(screen.getByRole('button', { name: '결과 저장' }));

    await waitFor(() => expect(screen.getByRole('button', { name: /저장됨/ })).toBeInTheDocument());
  });

  it('보관함 항목을 클릭하면 해당 결과가 우측에 표시된다', async () => {
    render(<AIScreen />);
    await waitFor(() => expect(screen.getByText(/코딩 화분 복습 문제/)).toBeInTheDocument());

    fireEvent.click(screen.getByText(/코딩 화분 복습 문제/));

    expect(screen.getByRole('button', { name: '결과 저장' })).toBeInTheDocument();
  });

  it('보관함 항목 삭제 버튼을 누르면 deleteResult API가 호출된다', async () => {
    render(<AIScreen />);
    await waitFor(() => expect(screen.getAllByRole('button', { name: '삭제' }).length).toBeGreaterThan(0));

    fireEvent.click(screen.getAllByRole('button', { name: '삭제' })[0]);

    await waitFor(() =>
      expect(deleteResult).toHaveBeenCalledWith(2)
    );
  });

  it('삭제 후 보관함 목록에서 해당 항목이 제거된다', async () => {
    render(<AIScreen />);
    await waitFor(() => expect(screen.getByText(/코딩 화분 복습 문제/)).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole('button', { name: '삭제' })[0]);

    await waitFor(() =>
      expect(screen.queryByText(/코딩 화분 복습 문제/)).not.toBeInTheDocument()
    );
  });

  it('결과 저장 실패 시 에러 메시지가 표시된다', async () => {
    saveResult.mockRejectedValue(new Error('Network Error'));

    await renderAndGenerate();
    fireEvent.click(screen.getByRole('button', { name: '결과 저장' }));

    await waitFor(() =>
      expect(screen.getByText('저장에 실패했어요. 잠시 후 다시 시도해 주세요.')).toBeInTheDocument()
    );
  });

  it('보관함 항목 삭제 실패 시 에러 메시지가 표시된다', async () => {
    deleteResult.mockRejectedValue(new Error('Network Error'));

    render(<AIScreen />);
    await waitFor(() => expect(screen.getAllByRole('button', { name: '삭제' }).length).toBeGreaterThan(0));

    fireEvent.click(screen.getAllByRole('button', { name: '삭제' })[0]);

    await waitFor(() =>
      expect(screen.getByText('삭제에 실패했어요. 잠시 후 다시 시도해 주세요.')).toBeInTheDocument()
    );
  });

  it('fetchResults 실패 시 보관함은 빈 상태로 유지된다', async () => {
    fetchResults.mockRejectedValue(new Error('Network Error'));

    render(<AIScreen />);

    await waitFor(() =>
      expect(screen.getByText('저장된 결과지가 없습니다.')).toBeInTheDocument()
    );
  });
});

// ──────────────────────────────────────────────
// 4지선다 QuizResult UI
// ──────────────────────────────────────────────
describe('4지선다 QuizResult UI', () => {
  it('퀴즈 생성 후 각 문항의 선택지 4개가 버튼으로 렌더링된다', async () => {
    await renderAndGenerate();
    expect(screen.getByRole('button', { name: /container-type/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /display/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /position/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /overflow/ })).toBeInTheDocument();
  });

  it('모든 문항을 선택하기 전에는 채점하기 버튼이 비활성화된다', async () => {
    await renderAndGenerate();
    const gradeBtn = screen.getByRole('button', { name: '채점하기' });
    expect(gradeBtn).toBeDisabled();
  });

  it('모든 문항을 선택하면 채점하기 버튼이 활성화된다', async () => {
    await renderAndGenerate();
    fireEvent.click(screen.getByRole('button', { name: /container-type/ }));
    fireEvent.click(screen.getByRole('button', { name: /"use client"/ }));
    expect(screen.getByRole('button', { name: '채점하기' })).not.toBeDisabled();
  });

  it('채점 후 정답 버튼에 정답 표시가 된다', async () => {
    await renderAndGenerate();
    fireEvent.click(screen.getByRole('button', { name: /container-type/ }));
    fireEvent.click(screen.getByRole('button', { name: /"use client"/ }));
    fireEvent.click(screen.getByRole('button', { name: '채점하기' }));
    expect(screen.getByRole('button', { name: '채점 완료' })).toBeInTheDocument();
  });

  it('전체 정답이면 전체 정답 메시지가 표시된다', async () => {
    await renderAndGenerate();
    fireEvent.click(screen.getByRole('button', { name: /container-type/ }));
    fireEvent.click(screen.getByRole('button', { name: /"use client"/ }));
    fireEvent.click(screen.getByRole('button', { name: '채점하기' }));
    await waitFor(() =>
      expect(screen.getByText(/전체 정답/)).toBeInTheDocument()
    );
  });

  it('오답이 있으면 몇 개 정답인지 표시한다', async () => {
    await renderAndGenerate();
    fireEvent.click(screen.getByRole('button', { name: /display/ }));
    fireEvent.click(screen.getByRole('button', { name: /"use client"/ }));
    fireEvent.click(screen.getByRole('button', { name: '채점하기' }));
    await waitFor(() =>
      expect(screen.getByText(/2문제 중 1개 정답/)).toBeInTheDocument()
    );
  });

  it('채점 후에는 선택지를 변경할 수 없다', async () => {
    await renderAndGenerate();
    fireEvent.click(screen.getByRole('button', { name: /container-type/ }));
    fireEvent.click(screen.getByRole('button', { name: /"use client"/ }));
    fireEvent.click(screen.getByRole('button', { name: '채점하기' }));
    fireEvent.click(screen.getByRole('button', { name: /display/ }));
    expect(screen.getByRole('button', { name: '채점 완료' })).toBeInTheDocument();
  });
});
