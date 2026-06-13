import { getSeedIconUrl } from '../../assets/items/seeds/seedIcons.js';
import { getHerbIconUrl } from '../../assets/items/herbs/herbIcons.js';
import {
  getPotionIconKeyByLabel,
  getPotionIconLabelEntries,
  getPotionIconUrl,
} from '../../assets/items/potions/potionIcons.js';

export const SEED_ICON_LABEL_CLASS = 'style-seed-label';
export const HERB_ICON_LABEL_CLASS = 'style-herb-label';
export const POTION_ICON_LABEL_CLASS = 'style-potion-label';

const SEED_NAME_PATTERN = /\b([a-z]+ seed)\b/g;
const GENERIC_SEED_LABELS = new Set(['choose seed', 'summon seed']);

export function setItemIconLabel(element, kind, itemKey = null) {
  if (!element) {
    return;
  }

  const normalizedKind = String(kind ?? '').trim();

  if (normalizedKind === 'seed') {
    setImageItemIconLabel({
      element,
      text: element.textContent,
      itemKey,
      kind: 'seed',
      className: SEED_ICON_LABEL_CLASS,
      getIconUrl: getSeedIconUrl,
    });
    return;
  }

  if (normalizedKind === 'herb') {
    setImageItemIconLabel({
      element,
      text: element.textContent,
      itemKey,
      kind: 'herb',
      className: HERB_ICON_LABEL_CLASS,
      getIconUrl: getHerbIconUrl,
    });
    return;
  }

  if (normalizedKind === 'potion') {
    setImageItemIconLabel({
      element,
      text: element.textContent,
      itemKey: normalizePotionIconKey(itemKey, element.textContent),
      kind: 'potion',
      className: POTION_ICON_LABEL_CLASS,
      getIconUrl: getPotionIconUrl,
    });
    return;
  }

  clearImageItemIconLabel(element);
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

function setImageItemIconLabel({
  element,
  text,
  itemKey = null,
  kind,
  className,
  getIconUrl,
}) {
  const value = String(text ?? '');
  const normalizedKey = String(itemKey ?? '').trim();
  const iconUrl = getIconUrl(normalizedKey);

  if (!iconUrl) {
    clearImageItemIconLabel(element);
    if (element.textContent !== value) {
      element.textContent = value;
    }
    return;
  }

  element.classList.remove(SEED_ICON_LABEL_CLASS, HERB_ICON_LABEL_CLASS, POTION_ICON_LABEL_CLASS);
  element.classList.add(className);
  element.dataset.itemIconKind = kind;
  element.dataset.itemIconKey = normalizedKey;

  if (
    element.textContent === value &&
    element.querySelector(`.${className}__icon`) &&
    element.dataset.itemIconKey === normalizedKey
  ) {
    return;
  }

  element.replaceChildren(
    createImageItemIconImage(className, iconUrl),
    createImageItemText(className, value),
  );
}

function clearImageItemIconLabel(element) {
  const hasImageLabel =
    element.classList.contains(SEED_ICON_LABEL_CLASS) ||
    element.classList.contains(HERB_ICON_LABEL_CLASS) ||
    element.classList.contains(POTION_ICON_LABEL_CLASS);

  if (!hasImageLabel) {
    return;
  }

  const text = element.textContent;
  element.classList.remove(SEED_ICON_LABEL_CLASS, HERB_ICON_LABEL_CLASS, POTION_ICON_LABEL_CLASS);
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
  label.dataset.itemIconKind = 'seed';
  label.append(
    createImageItemIconImage(SEED_ICON_LABEL_CLASS, getSeedIconUrl()),
    createImageItemText(SEED_ICON_LABEL_CLASS, seedName),
  );
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
  return createImageItemIconImage(POTION_ICON_LABEL_CLASS, getPotionIconUrl(itemKey));
}

function createImageItemIconImage(className, iconUrl) {
  const icon = document.createElement('img');
  icon.className = `${className}__icon`;
  icon.src = iconUrl;
  icon.alt = '';
  icon.setAttribute('aria-hidden', 'true');
  return icon;
}

function createPotionText(text) {
  return createImageItemText(POTION_ICON_LABEL_CLASS, text);
}

function createImageItemText(className, text) {
  const label = document.createElement('span');
  label.className = `${className}__text`;
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
