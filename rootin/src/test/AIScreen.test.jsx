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
  PixelPlant: () => null,
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
import { useUser } from '../context/UserContext.jsx';

// ──────────────────────────────────────────────
// Mock 데이터 상수 (BE 응답 구조 기준)
// ──────────────────────────────────────────────

const MOCK_POTS = [
  { id: 1, title: '코딩', level: 7, totalExp: 1250, growthStage: 'BLOOM',   isDisplayed: true,  plantName: '기본 씨앗', description: '' },
  { id: 2, title: '영어', level: 3, totalExp: 450,  growthStage: 'SPROUT',  isDisplayed: false, plantName: '달빛씨앗',  description: '' },
  { id: 3, title: '독서', level: 2, totalExp: 300,  growthStage: 'SPROUT',  isDisplayed: false, plantName: '버섯몬',    description: '' },
];

const MOCK_ME = {
  userId: 1,
  nickname: '소연',
  point: 1240,
  tilCount: 47,
  email: 'test@rootin.app',
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
  resultId: 1,                          // BE는 Long(숫자) 반환
  createdAt: '2026-05-28T10:00:00Z',
};

// BE는 List<AiResultResponse> — 래퍼 없이 배열 직접 반환
// content는 DB에 JSON 문자열로 저장되므로 String으로 반환됨
const MOCK_FETCH_RESULTS_RESPONSE = [
  {
    resultId: 2,                          // BE는 Long(숫자)
    type: 'QUIZ',
    potId: 1,
    content: JSON.stringify(MOCK_QUIZ_RESPONSE),   // BE는 String 반환
    createdAt: '2026-05-25T10:00:00Z',
  },
  {
    resultId: 3,                          // BE는 Long(숫자)
    type: 'SUMMARY',
    potId: 2,
    content: JSON.stringify(MOCK_SUMMARY_RESPONSE), // BE는 String 반환
    createdAt: '2026-05-24T10:00:00Z',
  },
];

beforeEach(() => {
  getPots.mockResolvedValue(MOCK_POTS);
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
      // 생성 버튼이 활성화되어 있어야 함 (potId가 설정된 경우)
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
    // api/user.js의 getMe가 이 컴포넌트에서 호출되지 않아야 함
    // (UserContext가 대신 처리)
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

  it('화분 목록 로딩 중에는 로딩 문구가 표시된다', async () => {
    getPots.mockReturnValue(new Promise(() => {})); // 영원히 pending
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
    render(<AIScreen />);
    await waitFor(() => screen.getByRole('button', { name: /만들기/i }));

    fireEvent.click(screen.getByRole('button', { name: /만들기/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: '결과 저장' })).toBeInTheDocument());

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
// 생성 전/후 화면
// ──────────────────────────────────────────────
describe('생성 전/후 화면', () => {
  it('생성 전에는 빈 화면 안내 문구가 표시된다', () => {
    render(<AIScreen />);
    expect(screen.getByText('화분을 선택하고 생성 버튼을 눌러주세요')).toBeInTheDocument();
  });

  it('생성 버튼 클릭 후 로딩 메시지가 표시된다', async () => {
    generateQuiz.mockReturnValue(new Promise(() => {})); // 영원히 pending
    render(<AIScreen />);
    // 버튼 존재 여부가 아닌 화분 목록 로딩 완료를 기다려 potId 설정 보장
    await waitFor(() => expect(screen.getByText('코딩')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /만들기/i }));
    await waitFor(() =>
      expect(screen.getByText('AI가 TIL을 분석하고 있어요...')).toBeInTheDocument()
    );
  });

  it('생성 완료 후 퀴즈 결과가 표시된다', async () => {
    render(<AIScreen />);
    await waitFor(() => screen.getByRole('button', { name: /만들기/i }));
    fireEvent.click(screen.getByRole('button', { name: /만들기/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: '결과 저장' })).toBeInTheDocument());

    expect(screen.getByText('CSS Container Queries에서 필수 속성은?')).toBeInTheDocument();
  });

  it('summary 모드 생성 완료 후 요약 결과가 표시된다', async () => {
    render(<AIScreen />);
    fireEvent.click(screen.getByRole('button', { name: /TIL 요약/i }));

    await waitFor(() => screen.getByRole('button', { name: /요약 생성하기/i }));
    fireEvent.click(screen.getByRole('button', { name: /요약 생성하기/i }));

    await waitFor(() =>
      expect(screen.getByText('이번 주의 핵심은 Container Queries와 RSC입니다.')).toBeInTheDocument()
    );
  });

  it('모드를 변경해도 AI생성 버튼을 다시 누르기 전까지 생성 결과가 유지된다', async () => {
    render(<AIScreen />);
    await waitFor(() => screen.getByRole('button', { name: /만들기/i }));
    fireEvent.click(screen.getByRole('button', { name: /만들기/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: '결과 저장' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /TIL 요약/i }));

    expect(screen.getByRole('button', { name: '결과 저장' })).toBeInTheDocument();
  });

  it('퀴즈 생성 후 TIL 요약 탭으로 전환해도 SectionHeader 타이틀이 복습 문제로 유지된다', async () => {
    render(<AIScreen />);
    await waitFor(() => screen.getByRole('button', { name: /만들기/i }));
    fireEvent.click(screen.getByRole('button', { name: /만들기/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: '결과 저장' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /TIL 요약/i }));

    expect(screen.getByRole('heading', { name: /복습 문제/ })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'TIL 요약 결과지' })).not.toBeInTheDocument();
  });

  it('퀴즈 생성 후 TIL 요약 탭으로 전환해도 퀴즈 결과 컴포넌트가 유지된다', async () => {
    render(<AIScreen />);
    await waitFor(() => screen.getByRole('button', { name: /만들기/i }));
    fireEvent.click(screen.getByRole('button', { name: /만들기/i }));
    await waitFor(() =>
      expect(screen.getByText('CSS Container Queries에서 필수 속성은?')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole('button', { name: /TIL 요약/i }));

    expect(screen.getByText('CSS Container Queries에서 필수 속성은?')).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────
// API 호출 검증
// ──────────────────────────────────────────────
describe('API 호출', () => {
  it('퀴즈 생성 시 generateQuiz에 potId(숫자)와 count가 전달된다', async () => {
    render(<AIScreen />);
    await waitFor(() => screen.getByRole('button', { name: /만들기/i }));
    fireEvent.click(screen.getByRole('button', { name: /만들기/i }));

    await waitFor(() => expect(generateQuiz).toHaveBeenCalledWith(MOCK_POTS[0].id, 5));
  });

  it('요약 생성 시 generateSummary에 potId(숫자)가 전달된다', async () => {
    render(<AIScreen />);
    fireEvent.click(screen.getByRole('button', { name: /TIL 요약/i }));

    await waitFor(() => screen.getByRole('button', { name: /요약 생성하기/i }));
    fireEvent.click(screen.getByRole('button', { name: /요약 생성하기/i }));

    await waitFor(() => expect(generateSummary).toHaveBeenCalledWith(MOCK_POTS[0].id));
  });

  it('생성 완료 후 포인트가 remainPoint로 갱신된다', async () => {
    render(<AIScreen />);
    await waitFor(() => screen.getByRole('button', { name: /만들기/i }));
    fireEvent.click(screen.getByRole('button', { name: /만들기/i }));

    await waitFor(() => expect(screen.getByText(/1190P/)).toBeInTheDocument());
  });

  it('다시 생성 버튼 클릭 시 동일한 potId와 count로 재호출된다', async () => {
    render(<AIScreen />);
    await waitFor(() => screen.getByRole('button', { name: /만들기/i }));
    fireEvent.click(screen.getByRole('button', { name: /만들기/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: '다시 생성' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: '다시 생성' }));

    await waitFor(() => expect(generateQuiz).toHaveBeenCalledTimes(2));
    expect(generateQuiz).toHaveBeenNthCalledWith(2, MOCK_POTS[0].id, 5);
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
    await waitFor(() => screen.getByRole('button', { name: /만들기/i }));
    fireEvent.click(screen.getByRole('button', { name: /만들기/i }));

    await waitFor(() =>
      expect(screen.getByText('포인트가 부족해요. 활동으로 포인트를 적립해 보세요.')).toBeInTheDocument()
    );
  });

  it('일반 네트워크 에러 시 실패 메시지가 표시된다', async () => {
    generateQuiz.mockRejectedValue(new Error('Network Error'));

    render(<AIScreen />);
    await waitFor(() => screen.getByRole('button', { name: /만들기/i }));
    fireEvent.click(screen.getByRole('button', { name: /만들기/i }));

    await waitFor(() =>
      expect(screen.getByText('생성에 실패했어요. 잠시 후 다시 시도해 주세요.')).toBeInTheDocument()
    );
  });

  it('에러 발생 시 로딩 상태가 해제된다', async () => {
    generateQuiz.mockRejectedValue(new Error('fail'));

    render(<AIScreen />);
    await waitFor(() => screen.getByRole('button', { name: /만들기/i }));
    fireEvent.click(screen.getByRole('button', { name: /만들기/i }));

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
    render(<AIScreen />);
    await waitFor(() => screen.getByRole('button', { name: /만들기/i }));
    fireEvent.click(screen.getByRole('button', { name: /만들기/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: '결과 저장' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: '결과 저장' }));

    // api/ai.js의 saveResult는 content를 JSON.stringify해서 BE(String 타입)에 전달
    await waitFor(() =>
      expect(saveResult).toHaveBeenCalledWith('QUIZ', MOCK_POTS[0].id, MOCK_QUIZ_RESPONSE)
    );
  });

  it('결과 저장 후 저장됨 피드백이 표시된다', async () => {
    render(<AIScreen />);
    await waitFor(() => screen.getByRole('button', { name: /만들기/i }));
    fireEvent.click(screen.getByRole('button', { name: /만들기/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: '결과 저장' })).toBeInTheDocument());

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

    render(<AIScreen />);
    await waitFor(() => screen.getByRole('button', { name: /만들기/i }));
    fireEvent.click(screen.getByRole('button', { name: /만들기/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: '결과 저장' })).toBeInTheDocument());

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
  async function renderAndGenerate() {
    render(<AIScreen />);
    await waitFor(() => screen.getByRole('button', { name: /만들기/i }));
    fireEvent.click(screen.getByRole('button', { name: /만들기/i }));
    await waitFor(() => screen.getByText('CSS Container Queries에서 필수 속성은?'));
  }

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
    // 채점 완료 버튼이 나타나면 채점 완료
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
    fireEvent.click(screen.getByRole('button', { name: /display/ })); // 오답
    fireEvent.click(screen.getByRole('button', { name: /"use client"/ })); // 정답
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
    // 채점 후 다른 보기 클릭해도 채점 완료 버튼이 유지됨 (상태 변경 없음)
    fireEvent.click(screen.getByRole('button', { name: /display/ }));
    expect(screen.getByRole('button', { name: '채점 완료' })).toBeInTheDocument();
  });
});
