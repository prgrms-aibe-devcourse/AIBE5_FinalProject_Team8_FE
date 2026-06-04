import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LandingScreen } from '../screens-landing.jsx';

// plants.jsx mock
vi.mock('../plants.jsx', () => ({
  Plant: () => null,
  RootinLogo: () => null,
  STAGE_META: {
    seed: { label: '씨앗' },
    sprout: { label: '새싹' },
    leaf: { label: '잎' },
    bloom: { label: '개화' },
    full: { label: '만개' },
  },
}));

// ──────────────────────────────────────────────
// 초기 렌더링
// ──────────────────────────────────────────────
describe('초기 렌더링', () => {
  it('슬로건 텍스트가 표시된다', () => {
    render(<LandingScreen onStart={vi.fn()} />);
    expect(screen.getByText('학습의 뿌리를 내리다')).toBeInTheDocument();
  });

  it('서비스명 Rootin이 표시된다', () => {
    render(<LandingScreen onStart={vi.fn()} />);
    // nav + footer 두 곳에 노출되므로 getAllByText 사용
    expect(screen.getAllByText('Rootin').length).toBeGreaterThanOrEqual(1);
  });

  it('핵심 기능 4개가 모두 표시된다', () => {
    render(<LandingScreen onStart={vi.fn()} />);
    expect(screen.getByText('TIL 작성')).toBeInTheDocument();
    expect(screen.getByText('식물 성장')).toBeInTheDocument();
    expect(screen.getByText('대시보드')).toBeInTheDocument();
    expect(screen.getByText('AI 학습 도구')).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────
// CTA 버튼
// ──────────────────────────────────────────────
describe('CTA 버튼', () => {
  it('nav 로그인 버튼 클릭 시 onStart가 호출된다', () => {
    const onStart = vi.fn();
    render(<LandingScreen onStart={onStart} />);
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('히어로 시작하기 버튼 클릭 시 onStart가 호출된다', () => {
    const onStart = vi.fn();
    render(<LandingScreen onStart={onStart} />);
    fireEvent.click(screen.getByRole('button', { name: /지금 시작하기/ }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('하단 무료로 시작하기 버튼 클릭 시 onStart가 호출된다', () => {
    const onStart = vi.fn();
    render(<LandingScreen onStart={onStart} />);
    fireEvent.click(screen.getByRole('button', { name: /무료로 시작하기/ }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
