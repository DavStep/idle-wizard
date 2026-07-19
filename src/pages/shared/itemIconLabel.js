import { createAssetAtlasSprite } from '../../assets/atlas/atlasSprite.js';
import { getIngredientIconFrameName } from '../../assets/items/ingredients/ingredientIcons.js';
import { createSeedPackIcon, getSeedIconFrameName } from '../../assets/items/seeds/seedIcons.js';
import {
  getHerbIconKeyByLabel,
  getHerbIconLabelEntries,
  getHerbIconFrameName,
} from '../../assets/items/herbs/herbIcons.js';
import {
  getPotionIconKeyByLabel,
  getPotionIconLabelEntries,
  getPotionIconFrameName,
} from '../../assets/items/potions/potionIcons.js';
import { appendResourceIconMatchParts } from './resourceIconLabel.js';

export const SEED_ICON_LABEL_CLASS = 'style-seed-label';
export const HERB_ICON_LABEL_CLASS = 'style-herb-label';
export const POTION_ICON_LABEL_CLASS = 'style-potion-label';
export const INGREDIENT_ICON_LABEL_CLASS = 'style-ingredient-label';

const RESOURCE_WORD_MATCH_PATTERN =
  /\b(?:crystals?|emeralds?|coin|herbs?|mana|rubies|ruby|seeds?)\b/gi;
const MANA_NON_RESOURCE_PHRASE_PATTERN = /^\s+sphere\b/i;
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
      getIconFrameName: getSeedIconFrameName,
      createIconSprite: ({ className, normalizedKey, value }) =>
        createSeedPackIcon(`${className}__icon`, { key: normalizedKey, label: value }),
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
      getIconFrameName: getHerbIconFrameName,
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
      getIconFrameName: getPotionIconFrameName,
    });
    return;
  }

  if (normalizedKind === 'ingredient') {
    setImageItemIconLabel({
      element,
      text: element.textContent,
      itemKey,
      kind: 'ingredient',
      className: INGREDIENT_ICON_LABEL_CLASS,
      getIconFrameName: getIngredientIconFrameName,
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

    if (match.kind === 'resource') {
      lastIndex = appendResourceIconMatchParts(parts, {
        value,
        lastIndex,
        index,
        resource: match.resource,
        label: match.text,
      });
      continue;
    }

    if (index > lastIndex) {
      parts.push(document.createTextNode(value.slice(lastIndex, index)));
    }

    if (match.kind === 'seed') {
      parts.push(createSeedIconLabel(match.text));
    } else if (match.kind === 'herb') {
      parts.push(createHerbIconLabel(match.text, match.itemKey));
    } else if (match.kind === 'potion') {
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

export function setTextWithItemIcons(element, text) {
  if (!element) {
    return;
  }

  const value = String(text ?? '');

  if (element.dataset.itemIconRichText === value && element.textContent === value) {
    return;
  }

  appendTextWithItemIcons(element, value);
  element.dataset.itemIconRichText = value;
}

export const appendTextWithSeedIcons = appendTextWithItemIcons;

function setImageItemIconLabel({
  element,
  text,
  itemKey = null,
  kind,
  className,
  getIconFrameName,
  createIconSprite = ({ className, frameName }) =>
    createImageItemIconSprite(className, frameName),
}) {
  const value = String(text ?? '');
  const normalizedKey = String(itemKey ?? '').trim();
  const frameName = getIconFrameName(normalizedKey);

  if (!frameName) {
    clearImageItemIconLabel(element);
    if (element.textContent !== value) {
      element.textContent = value;
    }
    return;
  }

  element.classList.remove(
    SEED_ICON_LABEL_CLASS,
    HERB_ICON_LABEL_CLASS,
    POTION_ICON_LABEL_CLASS,
    INGREDIENT_ICON_LABEL_CLASS,
  );
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
    createIconSprite({ className, frameName, normalizedKey, value }),
    createImageItemText(className, value),
  );
}

function clearImageItemIconLabel(element) {
  const hasImageLabel =
    element.classList.contains(SEED_ICON_LABEL_CLASS) ||
    element.classList.contains(HERB_ICON_LABEL_CLASS) ||
    element.classList.contains(POTION_ICON_LABEL_CLASS) ||
    element.classList.contains(INGREDIENT_ICON_LABEL_CLASS);

  if (!hasImageLabel) {
    return;
  }

  const text = element.textContent;
  element.classList.remove(
    SEED_ICON_LABEL_CLASS,
    HERB_ICON_LABEL_CLASS,
    POTION_ICON_LABEL_CLASS,
    INGREDIENT_ICON_LABEL_CLASS,
  );
  delete element.dataset.itemIconKind;
  delete element.dataset.itemIconKey;
  element.textContent = text;
}

function getItemIconMatches(value) {
  const matches = [];

  for (const { label } of getHerbIconLabelEntries()) {
    const seedName = `${label} seed`;
    const pattern = new RegExp(`\\b${escapeRegExp(seedName)}\\b`, 'g');

    for (const match of value.matchAll(pattern)) {
      const [matchedSeedName] = match;

      if (GENERIC_SEED_LABELS.has(matchedSeedName)) {
        continue;
      }

      matches.push({
        index: match.index ?? 0,
        kind: 'seed',
        text: matchedSeedName,
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

  for (const { label, key } of getHerbIconLabelEntries()) {
    const pattern = new RegExp(`\\b${escapeRegExp(label)}\\b`, 'g');

    for (const match of value.matchAll(pattern)) {
      matches.push({
        index: match.index ?? 0,
        itemKey: key,
        kind: 'herb',
        text: match[0],
      });
    }
  }

  for (const match of value.matchAll(RESOURCE_WORD_MATCH_PATTERN)) {
    if (shouldSkipResourceMatch(value, match[0], match.index ?? 0)) {
      continue;
    }

    matches.push({
      index: match.index ?? 0,
      kind: 'resource',
      resource: normalizeResourceMatch(match[0]),
      text: match[0],
    });
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

function shouldSkipResourceMatch(value, label, index) {
  if (label.toLowerCase() !== 'mana') {
    return false;
  }

  const afterLabel = value.slice(index + label.length);
  return MANA_NON_RESOURCE_PHRASE_PATTERN.test(afterLabel);
}

function normalizeResourceMatch(label) {
  const normalizedLabel = label.toLowerCase();

  if (normalizedLabel === 'crystals') {
    return 'crystal';
  }

  if (normalizedLabel === 'rubies') {
    return 'ruby';
  }

  if (normalizedLabel === 'emeralds') {
    return 'emerald';
  }

  if (normalizedLabel === 'seeds') {
    return 'seed';
  }

  if (normalizedLabel === 'herbs') {
    return 'herb';
  }

  return normalizedLabel;
}

function createSeedIconLabel(seedName) {
  const label = document.createElement('span');
  label.className = SEED_ICON_LABEL_CLASS;
  label.dataset.itemIconKind = 'seed';
  label.append(
    createSeedPackIcon(`${SEED_ICON_LABEL_CLASS}__icon`, { label: seedName }),
    createImageItemText(SEED_ICON_LABEL_CLASS, seedName),
  );
  return label;
}

function createHerbIconLabel(text, itemKey = null) {
  const label = document.createElement('span');
  label.className = HERB_ICON_LABEL_CLASS;
  label.dataset.itemIconKind = 'herb';
  label.dataset.itemIconKey = normalizeHerbIconKey(itemKey, text);
  label.append(createHerbIconImage(label.dataset.itemIconKey), createHerbText(text));
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

function createHerbIconImage(itemKey) {
  return createImageItemIconSprite(HERB_ICON_LABEL_CLASS, getHerbIconFrameName(itemKey));
}

function createPotionIconImage(itemKey) {
  return createImageItemIconSprite(POTION_ICON_LABEL_CLASS, getPotionIconFrameName(itemKey));
}

function createImageItemIconSprite(className, frameName) {
  return createAssetAtlasSprite(`${className}__icon`, frameName);
}

function createPotionText(text) {
  return createImageItemText(POTION_ICON_LABEL_CLASS, text);
}

function createHerbText(text) {
  return createImageItemText(HERB_ICON_LABEL_CLASS, text);
}

function createImageItemText(className, text) {
  const label = document.createElement('span');
  label.className = `${className}__text`;
  label.textContent = text;
  return label;
}

function normalizeHerbIconKey(itemKey, text) {
  const key = String(itemKey ?? '').trim();

  if (key) {
    return key;
  }

  return getHerbIconKeyByLabel(text) ?? '';
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
