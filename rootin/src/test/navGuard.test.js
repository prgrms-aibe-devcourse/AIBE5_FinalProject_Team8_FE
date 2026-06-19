import { describe, it, expect, afterEach } from 'vitest';
import { setNavGuard, clearNavGuard, checkNavGuard } from '../lib/navGuard.js';

afterEach(() => {
  // 모듈 단위 전역 가드라 테스트 간 상태를 비운다.
  const noop = () => null;
  setNavGuard(noop);
  clearNavGuard(noop);
});

describe('navGuard — clearNavGuard는 fn이 일치할 때만 해제한다', () => {
  it('등록한 가드와 동일한 fn으로 해제하면 해제된다', () => {
    const fn = () => '경고';
    setNavGuard(fn);
    expect(checkNavGuard()).toBe('경고');
    clearNavGuard(fn);
    expect(checkNavGuard()).toBe(null);
  });

  it('다른 fn으로 해제를 시도하면 현재 가드를 지우지 않는다', () => {
    // 떠나는 화면의 cleanup(clearNavGuard(fnA))이 새 화면 등록(fnB) 뒤에 도착해도
    // 현재 활성 가드(fnB)를 잘못 지우면 안 된다.
    const fnA = () => 'A 경고';
    const fnB = () => 'B 경고';
    setNavGuard(fnA);
    setNavGuard(fnB);
    clearNavGuard(fnA);
    expect(checkNavGuard()).toBe('B 경고');
  });
});
