export const herbIconFrameNamesByKey = Object.freeze({
  bloodroseHerb: 'herb:bloodroseHerb',
  briarHerb: 'herb:briarHerb',
  dragonpepperHerb: 'herb:dragonpepperHerb',
  dreambellHerb: 'herb:dreambellHerb',
  frostmossHerb: 'herb:frostmossHerb',
  glowcapHerb: 'herb:glowcapHerb',
  lavenderHerb: 'herb:lavenderHerb',
  mandrakeHerb: 'herb:mandrakeHerb',
  mintHerb: 'herb:mintHerb',
  moonflowerHerb: 'herb:moonflowerHerb',
  nettleHerb: 'herb:nettleHerb',
  sageHerb: 'herb:sageHerb',
  starAniseHerb: 'herb:starAniseHerb',
  sunrootHerb: 'herb:sunrootHerb',
});

const herbIconKeysByLabel = Object.freeze({
  bloodrose: 'bloodroseHerb',
  briar: 'briarHerb',
  dragonpepper: 'dragonpepperHerb',
  dreambell: 'dreambellHerb',
  frostmoss: 'frostmossHerb',
  glowcap: 'glowcapHerb',
  lavender: 'lavenderHerb',
  mandrake: 'mandrakeHerb',
  mint: 'mintHerb',
  moonflower: 'moonflowerHerb',
  nettle: 'nettleHerb',
  sage: 'sageHerb',
  'star anise': 'starAniseHerb',
  sunroot: 'sunrootHerb',
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
