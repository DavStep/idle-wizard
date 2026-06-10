import { getMysteryTextLabel } from './mysteryText.js';

export function getCompletedResearchIds(snapshot) {
  if (!snapshot?.research) {
    return null;
  }

  const ids = new Set(snapshot.research.completedResearchIds ?? []);

  for (const box of snapshot.research.boxes ?? []) {
    for (const research of box.researches ?? []) {
      if (research.completed) {
        ids.add(research.id);
      }
    }
  }

  return ids;
}

export function getItemResearchId(item) {
  if (item?.hasRecipe === false) {
    return null;
  }

  if (item?.researchable === false || item?.discoveryType === 'unknown') {
    return null;
  }

  if (item?.kind === 'seed') {
    return `unlockSeed:${item.key}`;
  }

  if (item?.kind === 'herb') {
    const seedKey = item.key?.endsWith('Herb') ? `${item.key.slice(0, -4)}Seed` : item.key;
    return `unlockSeed:${seedKey}`;
  }

  if (item?.kind === 'potion') {
    return `unlockRecipe:${item.key}`;
  }

  return null;
}

export function isItemResearched(snapshot, item) {
  if (item?.researched === true || item?.unlocked === true) {
    return true;
  }

  if (
    item?.discovered === true ||
    item?.researchable === false ||
    item?.discoveryType === 'unknown'
  ) {
    return item?.discovered === true;
  }

  const researchId = getItemResearchId(item);

  if (!researchId) {
    return true;
  }

  const completedResearchIds = getCompletedResearchIds(snapshot);

  if (completedResearchIds === null) {
    return true;
  }

  return completedResearchIds.has(researchId);
}

export function getItemQuantity(item, fallbackQuantity = 0) {
  const quantity = item?.quantity ?? fallbackQuantity;
  return Number.isFinite(quantity) ? quantity : 0;
}

export function isItemKnown(_snapshot, item, quantity = getItemQuantity(item)) {
  if (quantity > 0) {
    return true;
  }

  if (item?.discovered === true || item?.researched === true || item?.unlocked === true) {
    return true;
  }

  if (item?.known === false || item?.isKnown === false || item?.unknown === true) {
    return false;
  }

  return true;
}

export function isItemUnlocked(snapshot, item, quantity = getItemQuantity(item)) {
  return quantity > 0 || isItemResearched(snapshot, item);
}

export function shouldShowUnknownItem(snapshot, item, quantity = getItemQuantity(item)) {
  return quantity <= 0 && !isItemKnown(snapshot, item, quantity);
}

export function shouldShowLockedValue(snapshot, item, quantity = getItemQuantity(item)) {
  return quantity <= 0 && !isItemResearched(snapshot, item);
}

export function shouldShowItemInActionList(
  snapshot,
  item,
  quantity = getItemQuantity(item),
) {
  return isItemUnlocked(snapshot, item, quantity);
}

export function getMysteryItemLabel(item = {}) {
  return getMysteryTextLabel(item);
}

export function getItemDisplay(snapshot, item, quantity = getItemQuantity(item)) {
  const unknown = shouldShowUnknownItem(snapshot, item, quantity);
  const locked = shouldShowLockedValue(snapshot, item, quantity);
  const researched = isItemResearched(snapshot, item);

  return {
    label: unknown ? getMysteryItemLabel(item) : item.label,
    quantity: locked ? 'locked' : String(quantity),
    known: !unknown,
    unlocked: quantity > 0 || researched,
    unknown,
    locked,
    actionVisible: shouldShowItemInActionList(snapshot, item, quantity),
    researched,
    owned: quantity > 0,
    empty: quantity <= 0,
  };
}

export function formatResearchGatedQuantity(snapshot, item, quantity) {
  return getItemDisplay(snapshot, item, quantity).quantity;
}
