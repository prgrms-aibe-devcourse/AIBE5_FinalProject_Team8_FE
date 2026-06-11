export const PLANT_NAME_TO_SPECIES = {
  '기본 씨앗':  'seed',
  '버섯씨앗':   'mushroom',
  '선인장씨앗': 'cactus',
  '불꽃씨앗':   'fire',
  '얼음씨앗':   'ice',
  '달빛씨앗':   'moonlight',
  '번개씨앗':   'bolt',
  '흑장미씨앗': 'rose',
};

export function inferSpecies(plantName = '') {
  return PLANT_NAME_TO_SPECIES[plantName] ?? 'seed';
}
