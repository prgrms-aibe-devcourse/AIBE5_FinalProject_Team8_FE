import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LandingScreen } from '../screens-landing.jsx';
import { SiteDescriptions } from '../landing/SiteDescriptions.jsx';

// ──────────────────────────────────────────────
// 초기 렌더링
// ──────────────────────────────────────────────
describe('초기 렌더링', () => {
  it('Rootin 워드마크가 표시된다 (새싹 글자)', () => {
    const { container } = render(<LandingScreen onStart={vi.fn()} />);
    expect(container.querySelector('h1[aria-label="Rootin"]')).toBeInTheDocument();
  });

  it('핵심 기능 4개가 모두 표시된다', () => {
    // 소개 데스크톱은 스크롤로 앱이 하나씩 열린다. launchProgress 미전달 시
    // 폴백(=전부 열림)으로 4개 앱 창이 모두 떠 기능이 노출된다.
    render(<SiteDescriptions onStart={vi.fn()} />);
    expect(screen.getByText('TIL 기록')).toBeInTheDocument();
    expect(screen.getByText('식물 정원')).toBeInTheDocument();
    expect(screen.getByText('성장 대시보드')).toBeInTheDocument();
    expect(screen.getByText('AI 학습 도구')).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────
// CTA 버튼 — 모두 onStart로 진입
// ──────────────────────────────────────────────
describe('CTA 버튼', () => {
  it('네비 "로그인" 버튼 클릭 시 onStart가 호출된다', () => {
    const onStart = vi.fn();
    render(<LandingScreen onStart={onStart} />);
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('히어로 "지금 시작하기" 버튼 클릭 시 onStart가 호출된다', () => {
    const onStart = vi.fn();
    render(<LandingScreen onStart={onStart} />);
    fireEvent.click(screen.getByRole('button', { name: /지금 시작하기/ }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('사이트 "무료로 시작하기" 버튼 클릭 시 onStart가 호출된다', () => {
    const onStart = vi.fn();
    // 피날레 스포트라이트 CTA는 앱이 모두 열린 뒤(폴백=전부 열림) 노출된다.
    render(<SiteDescriptions onStart={onStart} />);
    fireEvent.click(screen.getByRole('button', { name: /무료로 시작하기/ }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
