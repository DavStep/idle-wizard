export const DEFAULT_TRADE_ALLIANCE_EMBLEM = 'unity';

export const TRADE_ALLIANCE_EMBLEMS = Object.freeze([
  Object.freeze({
    id: 'unity',
    label: 'Unity',
    assetId: 'source:assets/icons/icon-alliance-banner-emblem.png',
    url: new URL('../../assets/game/source/icons/icon-alliance-banner-emblem.png', import.meta.url).href,
  }),
  Object.freeze({
    id: 'crown',
    label: 'Crown',
    assetId: 'source:assets/icons/icon-alliance-emblem-crown.png',
    url: new URL('../../assets/game/source/icons/icon-alliance-emblem-crown.png', import.meta.url).href,
  }),
  Object.freeze({
    id: 'crescent',
    label: 'Crescent',
    assetId: 'source:assets/icons/icon-alliance-emblem-crescent.png',
    url: new URL('../../assets/game/source/icons/icon-alliance-emblem-crescent.png', import.meta.url).href,
  }),
  Object.freeze({
    id: 'crossed-wands',
    label: 'Crossed Wands',
    assetId: 'source:assets/icons/icon-alliance-emblem-crossed-wands.png',
    url: new URL('../../assets/game/source/icons/icon-alliance-emblem-crossed-wands.png', import.meta.url).href,
  }),
  Object.freeze({
    id: 'owl',
    label: 'Owl',
    assetId: 'source:assets/icons/icon-alliance-emblem-owl.png',
    url: new URL('../../assets/game/source/icons/icon-alliance-emblem-owl.png', import.meta.url).href,
  }),
  Object.freeze({
    id: 'flame',
    label: 'Flame',
    assetId: 'source:assets/icons/icon-alliance-emblem-flame.png',
    url: new URL('../../assets/game/source/icons/icon-alliance-emblem-flame.png', import.meta.url).href,
  }),
  Object.freeze({
    id: 'oak-leaf',
    label: 'Oak Leaf',
    assetId: 'source:assets/icons/icon-alliance-emblem-oak-leaf.png',
    url: new URL('../../assets/game/source/icons/icon-alliance-emblem-oak-leaf.png', import.meta.url).href,
  }),
  Object.freeze({
    id: 'key',
    label: 'Key',
    assetId: 'source:assets/icons/icon-alliance-emblem-key.png',
    url: new URL('../../assets/game/source/icons/icon-alliance-emblem-key.png', import.meta.url).href,
  }),
  Object.freeze({
    id: 'tower',
    label: 'Tower',
    assetId: 'source:assets/icons/icon-alliance-emblem-tower.png',
    url: new URL('../../assets/game/source/icons/icon-alliance-emblem-tower.png', import.meta.url).href,
  }),
  Object.freeze({
    id: 'sunburst',
    label: 'Sunburst',
    assetId: 'source:assets/icons/icon-alliance-emblem-sunburst.png',
    url: new URL('../../assets/game/source/icons/icon-alliance-emblem-sunburst.png', import.meta.url).href,
  }),
  Object.freeze({
    id: 'hourglass',
    label: 'Hourglass',
    assetId: 'source:assets/icons/icon-alliance-emblem-hourglass.png',
    url: new URL('../../assets/game/source/icons/icon-alliance-emblem-hourglass.png', import.meta.url).href,
  }),
]);

const EMBLEMS_BY_ID = new Map(
  TRADE_ALLIANCE_EMBLEMS.map((emblem) => [emblem.id, emblem]),
);

export function normalizeTradeAllianceEmblem(emblemId) {
  const safeEmblemId = String(emblemId ?? '').trim().toLowerCase();
  return EMBLEMS_BY_ID.has(safeEmblemId)
    ? safeEmblemId
    : DEFAULT_TRADE_ALLIANCE_EMBLEM;
}

export function getTradeAllianceEmblem(emblemId) {
  return EMBLEMS_BY_ID.get(normalizeTradeAllianceEmblem(emblemId));
}
