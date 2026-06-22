import { describe, it, expect } from 'vitest';
import { formatPotExperience } from '../screens-garden.logic.js';

// 화분 상세 '화분 경험치' 표기: 진행률(%)이 아니라 실제 EXP 수치로 통일한다.
// (에디터 사이드바의 `현재 EXP / 다음 레벨 필요 EXP` 표기와 일치)
describe('formatPotExperience — 실제 EXP 수치 표기', () => {
  it('currentLevelExp/nextLevelExpRequired가 있으면 그대로 사용한다', () => {
    const pot = { level: 2, totalExp: 180, currentLevelExp: 80, nextLevelExpRequired: 100 };
    expect(formatPotExperience(pot)).toBe('80 / 100 EXP');
  });

  it('EXP 수치 필드가 없으면 totalExp와 level로 파생한다 (BE 레벨 공식과 일치)', () => {
    // level 2 시작 누적 = 100, 다음 레벨 필요 = level*100 = 200
    const pot = { level: 2, totalExp: 150 };
    expect(formatPotExperience(pot)).toBe('50 / 200 EXP');
  });

  it('1레벨이면 시작 누적은 0, 다음 레벨 필요는 100이다', () => {
    const pot = { level: 1, totalExp: 30 };
    expect(formatPotExperience(pot)).toBe('30 / 100 EXP');
  });

  it('currentLevelExp가 nextLevelExpRequired를 초과하면 clamp된다', () => {
    const pot = { level: 2, currentLevelExp: 150, nextLevelExpRequired: 100 };
    expect(formatPotExperience(pot)).toBe('100 / 100 EXP');
  });

  it('소수점 EXP가 와도 정수로 표기한다', () => {
    const pot = { level: 2, currentLevelExp: 50.7, nextLevelExpRequired: 100 };
    expect(formatPotExperience(pot)).toBe('50 / 100 EXP');
  });

  it('진행률(%)을 분수처럼 표기하던 기존 형식(80/100)을 더 이상 쓰지 않는다', () => {
    const pot = { level: 2, totalExp: 150, levelProgress: 0.25 };
    // 기존: percentFromRatio(0.25) -> "25/100" (진행률), 신규: 실제 EXP "50 / 200 EXP"
    expect(formatPotExperience(pot)).not.toMatch(/^\d+\/100$/);
    expect(formatPotExperience(pot)).toContain('EXP');
  });
});
