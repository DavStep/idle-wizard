export const herbIconFrameNamesByKey = Object.freeze({
  belladonnaHerb: 'herb:belladonnaHerb',
  bloodroseHerb: 'herb:bloodroseHerb',
  briarHerb: 'herb:briarHerb',
  comfreyHerb: 'herb:comfreyHerb',
  dragonpepperHerb: 'herb:dragonpepperHerb',
  dreambellHerb: 'herb:dreambellHerb',
  frostmossHerb: 'herb:frostmossHerb',
  glowcapHerb: 'herb:glowcapHerb',
  hyssopHerb: 'herb:hyssopHerb',
  lavenderHerb: 'herb:lavenderHerb',
  mandrakeHerb: 'herb:mandrakeHerb',
  mintHerb: 'herb:mintHerb',
  moonflowerHerb: 'herb:moonflowerHerb',
  nettleHerb: 'herb:nettleHerb',
  nightshadeHerb: 'herb:nightshadeHerb',
  pearlrootHerb: 'herb:pearlrootHerb',
  sageHerb: 'herb:sageHerb',
  silverleafHerb: 'herb:silverleafHerb',
  snowdropHerb: 'herb:snowdropHerb',
  starAniseHerb: 'herb:starAniseHerb',
  sunrootHerb: 'herb:sunrootHerb',
  valerianHerb: 'herb:valerianHerb',
  wormwoodHerb: 'herb:wormwoodHerb',
  yarrowHerb: 'herb:yarrowHerb',
});

const herbIconKeysByLabel = Object.freeze({
  belladonna: 'belladonnaHerb',
  bloodrose: 'bloodroseHerb',
  briar: 'briarHerb',
  comfrey: 'comfreyHerb',
  dragonpepper: 'dragonpepperHerb',
  dreambell: 'dreambellHerb',
  frostmoss: 'frostmossHerb',
  glowcap: 'glowcapHerb',
  hyssop: 'hyssopHerb',
  lavender: 'lavenderHerb',
  mandrake: 'mandrakeHerb',
  mint: 'mintHerb',
  moonflower: 'moonflowerHerb',
  nettle: 'nettleHerb',
  nightshade: 'nightshadeHerb',
  pearlroot: 'pearlrootHerb',
  sage: 'sageHerb',
  silverleaf: 'silverleafHerb',
  snowdrop: 'snowdropHerb',
  'star anise': 'starAniseHerb',
  sunroot: 'sunrootHerb',
  valerian: 'valerianHerb',
  wormwood: 'wormwoodHerb',
  yarrow: 'yarrowHerb',
});

const herbIconLabelEntries = Object.freeze(
  Object.entries(herbIconKeysByLabel)
    .map(([label, key]) => Object.freeze({ label, key }))
    .sort((first, second) => second.label.length - first.label.length),
);

export function getHerbIconFrameName(itemKey) {
  return herbIconFrameNamesByKey[itemKey] ?? null;
}

export function getHerbIconKeyByLabel(label) {
  return herbIconKeysByLabel[String(label ?? '').trim().toLowerCase()] ?? null;
}

export function getHerbIconLabelEntries() {
  return herbIconLabelEntries.map((entry) => ({ ...entry }));
}
