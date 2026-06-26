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
  ashenMemory: 'potion:ashenMemory',
  silverleafQuiet: 'potion:silverleafQuiet',
  emberSight: 'potion:emberSight',
  thornSleep: 'potion:thornSleep',
  glassMoonElixir: 'potion:glassMoonElixir',
  rootboundResolve: 'potion:rootboundResolve',
  nightOrchardTonic: 'potion:nightOrchardTonic',
  starlessCourage: 'potion:starlessCourage',
  frostveinDraught: 'potion:frostveinDraught',
  bloodlightWard: 'potion:bloodlightWard',
  silverleafSalve: 'potion:silverleafSalve',
  yarrowPoultice: 'potion:yarrowPoultice',
  hyssopClarity: 'potion:hyssopClarity',
  valerianRest: 'potion:valerianRest',
  comfreyBalm: 'potion:comfreyBalm',
  nightshadeVeil: 'potion:nightshadeVeil',
  belladonnaSight: 'potion:belladonnaSight',
  wormwoodPurge: 'potion:wormwoodPurge',
  snowdropBreath: 'potion:snowdropBreath',
  pearlrootDraught: 'potion:pearlrootDraught',
  wastedPotion: 'potion:wastedPotion',
  unknownPotion: 'potion:unknownPotion',
});

const DEFAULT_POTION_LIQUID_COLOR = '#0a95f5';

const potionLiquidColorsByKey = Object.freeze({
  manaTonic: '#10a7ff',
  minorHealingPotion: '#f03a2d',
  nettleVigor: '#a9e84a',
  calmingDraught: '#74c9f4',
  simpleAntidote: '#78c82b',
  venomDraught: '#4d3dd3',
  briarWard: '#95ba3a',
  lanternTonic: '#f8b72b',
  healingPotion: '#f23636',
  moonlitFocus: '#1977ff',
  sunrootStamina: '#ff8617',
  frostmossCleanse: '#23a8ff',
  sleepDraught: '#6f52e8',
  elixirOfLife: '#ffae16',
  starLuckPhiltre: '#1597ff',
  dragonCourage: '#76c916',
  deepDreamVision: '#6d7ee8',
  pactWard: '#f1c15a',
  ashenMemory: '#59769c',
  silverleafQuiet: '#68b6a1',
  emberSight: '#f07413',
  thornSleep: '#6f52e8',
  glassMoonElixir: '#1694d4',
  rootboundResolve: '#c98216',
  nightOrchardTonic: '#4f2aca',
  starlessCourage: '#e34810',
  frostveinDraught: '#18a2d9',
  bloodlightWard: '#e41419',
  silverleafSalve: '#d8df58',
  yarrowPoultice: '#f5b900',
  hyssopClarity: '#75a8e8',
  valerianRest: '#b4bac2',
  comfreyBalm: '#74bd2e',
  nightshadeVeil: '#7a55ca',
  belladonnaSight: '#d9799c',
  wormwoodPurge: '#97b915',
  snowdropBreath: '#8fcdf0',
  pearlrootDraught: '#f2c86c',
  wastedPotion: '#7a6443',
  unknownPotion: '#5d4aa2',
  generic: DEFAULT_POTION_LIQUID_COLOR,
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
  'silverleaf salve': 'silverleafSalve',
  'yarrow poultice': 'yarrowPoultice',
  'hyssop clarity': 'hyssopClarity',
  'valerian rest': 'valerianRest',
  'comfrey balm': 'comfreyBalm',
  'nightshade veil': 'nightshadeVeil',
  'belladonna sight': 'belladonnaSight',
  'wormwood purge': 'wormwoodPurge',
  'snowdrop breath': 'snowdropBreath',
  'pearlroot draught': 'pearlrootDraught',
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

export function getPotionLiquidColor(itemKey) {
  return potionLiquidColorsByKey[itemKey] ?? DEFAULT_POTION_LIQUID_COLOR;
}

export function getPotionIconKeyByLabel(label) {
  return potionIconKeysByLabel[String(label ?? '').trim().toLowerCase()] ?? null;
}

export function getPotionIconLabelEntries() {
  return potionIconLabelEntries.map((entry) => ({ ...entry }));
}
