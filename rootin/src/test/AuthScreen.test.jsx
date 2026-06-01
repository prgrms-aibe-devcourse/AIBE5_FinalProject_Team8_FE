import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthScreen } from '../screens-rest.jsx';

// screens-rest.jsx가 의존하는 컴포넌트 mock
vi.mock('../plants.jsx', () => ({
  Plant: () => null,
  RootinLogo: () => null,
  STAGE_META: {
    seed: { label: '씨앗' }, sprout: { label: '새싹' },
    leaf: { label: '잎' }, bloom: { label: '개화' }, full: { label: '만개' },
  },
}));

vi.mock('../pixel-plants.jsx', () => ({
  PixelPlant: () => null,
  PIXEL_SPECIES: {},
}));

vi.mock('../context/UserContext.jsx', () => ({
  useUser: vi.fn(() => ({ user: null })),
}));

// API 모듈 mock (dynamic import 대응)
vi.mock('../api/auth.js', () => ({
  login: vi.fn(),
  signup: vi.fn(),
  googleLogin: vi.fn(),
  saveTokens: vi.fn(),
  clearTokens: vi.fn(),
}));

vi.mock('../api/user.js', () => ({
  getMe: vi.fn(),
}));

// screens-rest.jsx의 다른 API들도 mock (import 에러 방지)
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

vi.mock('../api/collection.js', () => ({
  getPlants: vi.fn(),
}));

import { login, signup, googleLogin } from '../api/auth.js';
import { getMe } from '../api/user.js';

const MOCK_USER = {
  userId: 1,
  nickname: '정원사',
  email: 'test@rootin.app',
  point: 500,
  tilCount: 10,
};

beforeEach(() => {
  login.mockResolvedValue({ accessToken: 'tok', refreshToken: 'ref' });
  signup.mockResolvedValue({ accessToken: 'tok', refreshToken: 'ref' });
  googleLogin.mockResolvedValue({ accessToken: 'tok', refreshToken: 'ref' });
  getMe.mockResolvedValue(MOCK_USER);
});

afterEach(() => {
  vi.clearAllMocks();
});

// ──────────────────────────────────────────────
// 초기 렌더링
// ──────────────────────────────────────────────
describe('초기 렌더링', () => {
  it('로그인 모드로 시작된다', () => {
    render(<AuthScreen onAuth={vi.fn()} />);
    expect(screen.getByText('다시 만나서 반가워요')).toBeInTheDocument();
  });

  it('로그인 모드에서 닉네임 입력란이 없다', () => {
    render(<AuthScreen onAuth={vi.fn()} />);
    expect(screen.queryByPlaceholderText('정원에서 불릴 이름')).not.toBeInTheDocument();
  });

  it('회원가입으로 전환하면 닉네임 입력란이 나타난다', () => {
    render(<AuthScreen onAuth={vi.fn()} />);
    fireEvent.click(screen.getByText('회원가입'));
    expect(screen.getByPlaceholderText('정원에서 불릴 이름')).toBeInTheDocument();
  });

  it('모드 전환 시 입력값이 초기화된다', () => {
    render(<AuthScreen onAuth={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'test@test.com' } });
    fireEvent.click(screen.getByText('회원가입'));
    expect(screen.getByPlaceholderText('you@example.com').value).toBe('');
  });
});

// ──────────────────────────────────────────────
// 클라이언트 유효성 검사
// ──────────────────────────────────────────────
describe('클라이언트 유효성 검사', () => {
  it('이메일이 비어있으면 에러 메시지가 표시된다', async () => {
    render(<AuthScreen onAuth={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /정원으로 들어가기/ }));
    expect(screen.getByText('이메일을 입력해주세요.')).toBeInTheDocument();
  });

  it('이메일 형식이 잘못되면 에러 메시지가 표시된다', async () => {
    render(<AuthScreen onAuth={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'notanemail' } });
    fireEvent.click(screen.getByRole('button', { name: /정원으로 들어가기/ }));
    expect(screen.getByText('올바른 이메일 형식이 아닙니다.')).toBeInTheDocument();
  });

  it('비밀번호가 비어있으면 에러 메시지가 표시된다', async () => {
    render(<AuthScreen onAuth={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'test@test.com' } });
    fireEvent.click(screen.getByRole('button', { name: /정원으로 들어가기/ }));
    expect(screen.getByText('비밀번호를 입력해주세요.')).toBeInTheDocument();
  });

  it('비밀번호가 8자 미만이면 에러 메시지가 표시된다', async () => {
    render(<AuthScreen onAuth={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: '1234' } });
    fireEvent.click(screen.getByRole('button', { name: /정원으로 들어가기/ }));
    expect(screen.getByText('비밀번호는 8자 이상이어야 합니다.')).toBeInTheDocument();
  });

  it('회원가입 시 닉네임이 비어있으면 에러 메시지가 표시된다', async () => {
    render(<AuthScreen onAuth={vi.fn()} />);
    fireEvent.click(screen.getByText('회원가입'));
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /첫 화분 받기/ }));
    expect(screen.getByText('닉네임을 입력해주세요.')).toBeInTheDocument();
  });

  it('유효성 검사 통과 시 login API가 호출된다', async () => {
    render(<AuthScreen onAuth={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /정원으로 들어가기/ }));
    await waitFor(() => expect(login).toHaveBeenCalledWith({ email: 'test@test.com', password: 'password123' }));
  });
});

// ──────────────────────────────────────────────
// 로그인 API 연동
// ──────────────────────────────────────────────
describe('로그인 API 연동', () => {
  function fillLoginForm() {
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } });
  }

  it('로그인 성공 시 getMe()가 호출된다', async () => {
    render(<AuthScreen onAuth={vi.fn()} />);
    fillLoginForm();
    fireEvent.click(screen.getByRole('button', { name: /정원으로 들어가기/ }));
    await waitFor(() => expect(getMe).toHaveBeenCalledTimes(1));
  });

  it('로그인 성공 시 onAuth가 유저 정보와 함께 호출된다', async () => {
    const onAuth = vi.fn();
    render(<AuthScreen onAuth={onAuth} />);
    fillLoginForm();
    fireEvent.click(screen.getByRole('button', { name: /정원으로 들어가기/ }));
    await waitFor(() => expect(onAuth).toHaveBeenCalledWith(MOCK_USER));
  });

  it('401 에러 시 비밀번호 오류 메시지가 표시된다', async () => {
    const err = new Error('HTTP 401');
    err.status = 401;
    login.mockRejectedValue(err);

    render(<AuthScreen onAuth={vi.fn()} />);
    fillLoginForm();
    fireEvent.click(screen.getByRole('button', { name: /정원으로 들어가기/ }));
    await waitFor(() => expect(screen.getByText('비밀번호가 올바르지 않습니다.')).toBeInTheDocument());
  });

  it('404 에러 시 미등록 이메일 메시지가 표시된다', async () => {
    const err = new Error('HTTP 404');
    err.status = 404;
    login.mockRejectedValue(err);

    render(<AuthScreen onAuth={vi.fn()} />);
    fillLoginForm();
    fireEvent.click(screen.getByRole('button', { name: /정원으로 들어가기/ }));
    await waitFor(() => expect(screen.getByText('등록되지 않은 이메일입니다.')).toBeInTheDocument());
  });

  it('기타 에러 시 일반 오류 메시지가 표시된다', async () => {
    login.mockRejectedValue(new Error('Network Error'));

    render(<AuthScreen onAuth={vi.fn()} />);
    fillLoginForm();
    fireEvent.click(screen.getByRole('button', { name: /정원으로 들어가기/ }));
    await waitFor(() =>
      expect(screen.getByText('오류가 발생했습니다. 잠시 후 다시 시도해주세요.')).toBeInTheDocument()
    );
  });

  it('API 호출 중에는 버튼이 비활성화된다', async () => {
    login.mockReturnValue(new Promise(() => {})); // 영원히 pending
    render(<AuthScreen onAuth={vi.fn()} />);
    fillLoginForm();
    fireEvent.click(screen.getByRole('button', { name: /정원으로 들어가기/ }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /처리 중/ })).toBeDisabled()
    );
  });

  it('Enter 키 입력 시 로그인이 실행된다', async () => {
    render(<AuthScreen onAuth={vi.fn()} />);
    fillLoginForm();
    fireEvent.keyDown(screen.getByPlaceholderText('••••••••'), { key: 'Enter' });
    await waitFor(() => expect(login).toHaveBeenCalledTimes(1));
  });
});

// ──────────────────────────────────────────────
// 회원가입 API 연동
// ──────────────────────────────────────────────
describe('회원가입 API 연동', () => {
  function fillSignupForm() {
    fireEvent.click(screen.getByText('회원가입'));
    fireEvent.change(screen.getByPlaceholderText('정원에서 불릴 이름'), { target: { value: '정원사' } });
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'new@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } });
  }

  it('회원가입 성공 시 signup API가 올바른 인자로 호출된다', async () => {
    render(<AuthScreen onAuth={vi.fn()} />);
    fillSignupForm();
    fireEvent.click(screen.getByRole('button', { name: /첫 화분 받기/ }));
    await waitFor(() =>
      expect(signup).toHaveBeenCalledWith({ email: 'new@test.com', password: 'password123', nickname: '정원사' })
    );
  });

  it('회원가입 성공 시 onAuth가 호출된다', async () => {
    const onAuth = vi.fn();
    render(<AuthScreen onAuth={onAuth} />);
    fillSignupForm();
    fireEvent.click(screen.getByRole('button', { name: /첫 화분 받기/ }));
    await waitFor(() => expect(onAuth).toHaveBeenCalledWith(MOCK_USER));
  });

  it('409 에러 시 이메일 중복 메시지가 표시된다', async () => {
    const err = new Error('HTTP 409');
    err.status = 409;
    signup.mockRejectedValue(err);

    render(<AuthScreen onAuth={vi.fn()} />);
    fillSignupForm();
    fireEvent.click(screen.getByRole('button', { name: /첫 화분 받기/ }));
    await waitFor(() => expect(screen.getByText('이미 사용 중인 이메일입니다.')).toBeInTheDocument());
  });

  it('회원가입 에러 후 에러가 표시된다', async () => {
    signup.mockRejectedValue(new Error('Network Error'));

    render(<AuthScreen onAuth={vi.fn()} />);
    fillSignupForm();
    fireEvent.click(screen.getByRole('button', { name: /첫 화분 받기/ }));
    await waitFor(() =>
      expect(screen.getByText('오류가 발생했습니다. 잠시 후 다시 시도해주세요.')).toBeInTheDocument()
    );
  });
});

// ──────────────────────────────────────────────
// Google 로그인
// ──────────────────────────────────────────────
describe('Google 로그인', () => {
  it('VITE_GOOGLE_CLIENT_ID가 없으면 Google 버튼이 비활성화된다', () => {
    // 기본적으로 테스트 환경에서 VITE_GOOGLE_CLIENT_ID는 미설정
    render(<AuthScreen onAuth={vi.fn()} />);
    const googleBtn = screen.getByRole('button', { name: /Google로 계속하기/ });
    expect(googleBtn).toBeDisabled();
  });

  it('Google SDK가 없으면 Google 버튼 클릭 시 아무 동작도 하지 않는다', async () => {
    render(<AuthScreen onAuth={vi.fn()} />);
    const googleBtn = screen.getByRole('button', { name: /Google로 계속하기/ });
    fireEvent.click(googleBtn);
    await waitFor(() => expect(googleLogin).not.toHaveBeenCalled());
  });
});
