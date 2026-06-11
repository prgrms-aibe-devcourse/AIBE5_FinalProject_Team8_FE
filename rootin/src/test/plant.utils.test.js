import { describe, it, expect } from 'vitest';
import { PLANT_NAME_TO_SPECIES, inferSpecies } from '../utils/plant.js';

// ─── PLANT_NAME_TO_SPECIES 상수 ───────────────────────────────────────────────

describe('PLANT_NAME_TO_SPECIES', () => {
  it('8종의 식물명 키를 가진다', () => {
    expect(Object.keys(PLANT_NAME_TO_SPECIES)).toHaveLength(8);
  });
});

// ─── inferSpecies — 정상 매핑 ─────────────────────────────────────────────────

describe('inferSpecies — 정상 매핑', () => {
  it.each([
    ['기본 씨앗',  'seed'],
    ['버섯씨앗',   'mushroom'],
    ['선인장씨앗', 'cactus'],
    ['불꽃씨앗',   'fire'],
    ['얼음씨앗',   'ice'],
    ['달빛씨앗',   'moonlight'],
    ['번개씨앗',   'bolt'],
    ['흑장미씨앗', 'rose'],
  ])('"%s" → "%s"', (plantName, expected) => {
    expect(inferSpecies(plantName)).toBe(expected);
  });
});

// ─── inferSpecies — 폴백 ─────────────────────────────────────────────────────

describe('inferSpecies — 폴백 (seed 반환)', () => {
  it('매핑에 없는 문자열은 "seed"를 반환한다', () => {
    expect(inferSpecies('없는식물')).toBe('seed');
  });

  it('빈 문자열은 "seed"를 반환한다', () => {
    expect(inferSpecies('')).toBe('seed');
  });

  it('인수 없이 호출하면 "seed"를 반환한다', () => {
    expect(inferSpecies()).toBe('seed');
  });

  it('undefined는 "seed"를 반환한다', () => {
    expect(inferSpecies(undefined)).toBe('seed');
  });

  it('공백 문자열은 "seed"를 반환한다', () => {
    expect(inferSpecies(' ')).toBe('seed');
  });
});
