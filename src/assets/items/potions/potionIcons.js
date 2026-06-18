export const GENERIC_POTION_ICON_FRAME_NAME = 'potion:generic';

export const potionIconFrameNamesByKey = Object.freeze({
  manaTonic: 'potion:manaTonic',
  minorHealingPotion: 'potion:minorHealingPotion',
  nettleVigor: 'potion:nettleVigor',
  calmingDraught: 'potion:calmingDraught',
  simpleAntidote: 'potion:simpleAntidote',
  venomDraught: 'potion:venomDraught',
  briarWard: 'potion:briarWard',
  lanternTonic: 'potion:lanternTonic',
  healingPotion: 'potion:healingPotion',
  moonlitFocus: 'potion:moonlitFocus',
  sunrootStamina: 'potion:sunrootStamina',
  frostmossCleanse: 'potion:frostmossCleanse',
  sleepDraught: 'potion:sleepDraught',
  elixirOfLife: 'potion:elixirOfLife',
  starLuckPhiltre: 'potion:starLuckPhiltre',
  dragonCourage: 'potion:dragonCourage',
  deepDreamVision: 'potion:deepDreamVision',
  pactWard: 'potion:pactWard',
});

const potionIconKeysByLabel = Object.freeze({
  'mana tonic': 'manaTonic',
  'minor healing potion': 'minorHealingPotion',
  'nettle vigor': 'nettleVigor',
  'calming draught': 'calmingDraught',
  'simple antidote': 'simpleAntidote',
  'venom draught': 'venomDraught',
  'briar ward': 'briarWard',
  'lantern tonic': 'lanternTonic',
  'healing potion': 'healingPotion',
  'moonlit focus': 'moonlitFocus',
  'sunroot stamina': 'sunrootStamina',
  'frostmoss cleanse': 'frostmossCleanse',
  'sleep draught': 'sleepDraught',
  'elixir of life': 'elixirOfLife',
  'star-luck philtre': 'starLuckPhiltre',
  'dragon courage': 'dragonCourage',
  'deep dream vision': 'deepDreamVision',
  'pact ward': 'pactWard',
  'ashen memory': 'ashenMemory',
  'silverleaf quiet': 'silverleafQuiet',
  'ember sight': 'emberSight',
  'thorn sleep': 'thornSleep',
  'glass moon elixir': 'glassMoonElixir',
  'rootbound resolve': 'rootboundResolve',
  'night orchard tonic': 'nightOrchardTonic',
  'starless courage': 'starlessCourage',
  'frostvein draught': 'frostveinDraught',
  'bloodlight ward': 'bloodlightWard',
  'wasted potion': 'wastedPotion',
  'unknown potion': 'unknownPotion',
});

const potionIconLabelEntries = Object.freeze(
  Object.entries(potionIconKeysByLabel)
    .map(([label, key]) => Object.freeze({ label, key }))
    .sort((first, second) => second.label.length - first.label.length),
);

export function getPotionIconFrameName(itemKey) {
  return potionIconFrameNamesByKey[itemKey] ?? GENERIC_POTION_ICON_FRAME_NAME;
}

export function getPotionIconKeyByLabel(label) {
  return potionIconKeysByLabel[String(label ?? '').trim().toLowerCase()] ?? null;
}

export function getPotionIconLabelEntries() {
  return potionIconLabelEntries.map((entry) => ({ ...entry }));
}
