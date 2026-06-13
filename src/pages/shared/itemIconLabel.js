import {
  getPotionIconKeyByLabel,
  getPotionIconLabelEntries,
  getPotionIconUrl,
} from '../../assets/items/potions/potionIcons.js';

export const SEED_ICON_LABEL_CLASS = 'style-seed-label';
export const POTION_ICON_LABEL_CLASS = 'style-potion-label';

const SEED_NAME_PATTERN = /\b([a-z]+ seed)\b/g;
const GENERIC_SEED_LABELS = new Set(['choose seed', 'summon seed']);

export function setItemIconLabel(element, kind, itemKey = null) {
  if (!element) {
    return;
  }

  element.classList.toggle(SEED_ICON_LABEL_CLASS, kind === 'seed');

  if (kind === 'potion') {
    setPotionIconLabel(element, element.textContent, itemKey);
    return;
  }

  clearPotionIconLabel(element);
}

export function appendTextWithItemIcons(element, text) {
  if (!element) {
    return;
  }

  const value = String(text ?? '');
  const parts = [];
  let lastIndex = 0;
  const matches = getItemIconMatches(value);

  for (const match of matches) {
    const index = match.index;

    if (index > lastIndex) {
      parts.push(document.createTextNode(value.slice(lastIndex, index)));
    }

    if (match.kind === 'seed') {
      parts.push(createSeedIconLabel(match.text));
    } else {
      parts.push(createPotionIconLabel(match.text, match.itemKey));
    }

    lastIndex = index + match.text.length;
  }

  if (lastIndex < value.length) {
    parts.push(document.createTextNode(value.slice(lastIndex)));
  }

  if (parts.length === 0) {
    element.textContent = value;
    return;
  }

  element.replaceChildren(...parts);
}

export const appendTextWithSeedIcons = appendTextWithItemIcons;

function setPotionIconLabel(element, text, itemKey = null) {
  const value = String(text ?? '');
  const normalizedKey = normalizePotionIconKey(itemKey, value);

  element.classList.add(POTION_ICON_LABEL_CLASS);
  element.dataset.itemIconKind = 'potion';
  element.dataset.itemIconKey = normalizedKey;

  if (
    element.textContent === value &&
    element.querySelector(`.${POTION_ICON_LABEL_CLASS}__icon`) &&
    element.dataset.itemIconKey === normalizedKey
  ) {
    return;
  }

  element.replaceChildren(createPotionIconImage(normalizedKey), createPotionText(value));
}

function clearPotionIconLabel(element) {
  if (!element.classList.contains(POTION_ICON_LABEL_CLASS)) {
    return;
  }

  const text = element.textContent;
  element.classList.remove(POTION_ICON_LABEL_CLASS);
  delete element.dataset.itemIconKind;
  delete element.dataset.itemIconKey;
  element.textContent = text;
}

function getItemIconMatches(value) {
  const matches = [];

  for (const match of value.matchAll(SEED_NAME_PATTERN)) {
    const [seedName] = match;

    if (!GENERIC_SEED_LABELS.has(seedName)) {
      matches.push({
        index: match.index ?? 0,
        kind: 'seed',
        text: seedName,
      });
    }
  }

  for (const { label, key } of getPotionIconLabelEntries()) {
    const pattern = new RegExp(`\\b${escapeRegExp(label)}\\b`, 'g');

    for (const match of value.matchAll(pattern)) {
      matches.push({
        index: match.index ?? 0,
        itemKey: key,
        kind: 'potion',
        text: match[0],
      });
    }
  }

  const sortedMatches = matches.sort(
    (first, second) => first.index - second.index || second.text.length - first.text.length,
  );
  const nonOverlappingMatches = [];
  let lastEnd = 0;

  for (const match of sortedMatches) {
    if (match.index < lastEnd) {
      continue;
    }

    nonOverlappingMatches.push(match);
    lastEnd = match.index + match.text.length;
  }

  return nonOverlappingMatches;
}

function createSeedIconLabel(seedName) {
  const label = document.createElement('span');
  label.className = SEED_ICON_LABEL_CLASS;
  label.textContent = seedName;
  return label;
}

function createPotionIconLabel(text, itemKey = null) {
  const label = document.createElement('span');
  label.className = POTION_ICON_LABEL_CLASS;
  label.dataset.itemIconKind = 'potion';
  label.dataset.itemIconKey = normalizePotionIconKey(itemKey, text);
  label.append(createPotionIconImage(label.dataset.itemIconKey), createPotionText(text));
  return label;
}

function createPotionIconImage(itemKey) {
  const icon = document.createElement('img');
  icon.className = `${POTION_ICON_LABEL_CLASS}__icon`;
  icon.src = getPotionIconUrl(itemKey);
  icon.alt = '';
  icon.setAttribute('aria-hidden', 'true');
  return icon;
}

function createPotionText(text) {
  const label = document.createElement('span');
  label.className = `${POTION_ICON_LABEL_CLASS}__text`;
  label.textContent = text;
  return label;
}

function normalizePotionIconKey(itemKey, text) {
  const key = String(itemKey ?? '').trim();

  if (key) {
    return key;
  }

  return getPotionIconKeyByLabel(text) ?? 'unknownPotion';
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
