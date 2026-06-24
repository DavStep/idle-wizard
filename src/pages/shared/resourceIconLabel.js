import { createAssetAtlasSprite } from '../../assets/atlas/atlasSprite.js';
import { setResourceColor } from './resourceColor.js';

export const RESOURCE_ICON_LABEL_CLASS = 'style-resource-label';

const RESOURCE_ICON_FRAME_NAMES = Object.freeze({
  crystal: 'resource:crystal',
  emerald: 'resource:emerald',
  coin: 'resource:coin',
  mana: 'resource:mana',
  ruby: 'resource:ruby',
});

const RESOURCE_WORD_PATTERN = /\b(?:crystals?|emeralds?|coin|mana|rubies|ruby)\b/;
const RESOURCE_WORD_MATCH_PATTERN = /\b(?:crystals?|emeralds?|coin|mana|rubies|ruby)\b/gi;
const RESOURCE_AMOUNT_PREFIX_PATTERN =
  /([+-]?(?:(?:\d[\d,]*(?:\.\d+)?(?:[a-z])?)|(?:\d[\d,]*(?:\/\d[\d,]*)+)|\?)(?:\s*\/\s*(?:(?:\d[\d,]*(?:\.\d+)?(?:[a-z])?)|\?))?\s+)$/i;
const MANA_NON_RESOURCE_PHRASE_PATTERN = /^\s+(?:sphere|tonic)\b/i;

export function setResourceIconText(element, text) {
  if (!element) {
    return;
  }

  const value = String(text ?? '');
  const hasResourceWord = RESOURCE_WORD_PATTERN.test(value.toLowerCase());
  const hasResourceLabel = Boolean(element.querySelector?.(`.${RESOURCE_ICON_LABEL_CLASS}`));

  if (element.textContent === value && (!hasResourceWord || hasResourceLabel)) {
    return;
  }

  if (!hasResourceWord) {
    element.textContent = value;
    return;
  }

  element.replaceChildren(...createResourceIconTextParts(value));
}

export function createResourceIconLabel(resource, label = resource, { amountPrefix = '' } = {}) {
  const normalizedResource = normalizeResource(resource);
  const frameName = RESOURCE_ICON_FRAME_NAMES[normalizedResource];

  if (!frameName) {
    return document.createTextNode(String(label ?? ''));
  }

  const root = document.createElement('span');
  root.className = `${RESOURCE_ICON_LABEL_CLASS} ${RESOURCE_ICON_LABEL_CLASS}--${normalizedResource}`;
  setResourceColor(root, normalizedResource);

  appendAmountPrefix(root, amountPrefix);

  const icon = createAssetAtlasSprite(`${RESOURCE_ICON_LABEL_CLASS}__icon`, frameName);

  const text = document.createElement('span');
  text.className = `${RESOURCE_ICON_LABEL_CLASS}__text`;
  text.textContent = String(label ?? normalizedResource);

  root.append(icon, text);
  return root;
}

export function appendResourceIconMatchParts(
  parts,
  { value, lastIndex, index, resource, label },
) {
  const before = value.slice(lastIndex, index);
  const amountPrefix = getResourceAmountPrefix(before);
  const textBeforeAmount = amountPrefix
    ? before.slice(0, before.length - amountPrefix.length)
    : before;

  if (textBeforeAmount) {
    parts.push(document.createTextNode(textBeforeAmount));
  }

  parts.push(createResourceIconLabel(resource, label, { amountPrefix }));
  return index + label.length;
}

function createResourceIconTextParts(value) {
  const parts = [];
  let lastIndex = 0;

  for (const match of value.matchAll(RESOURCE_WORD_MATCH_PATTERN)) {
    const [label] = match;
    const index = match.index ?? 0;

    if (shouldSkipResourceMatch(value, label, index)) {
      continue;
    }

    lastIndex = appendResourceIconMatchParts(parts, {
      value,
      lastIndex,
      index,
      resource: label.toLowerCase(),
      label,
    });
  }

  if (lastIndex < value.length) {
    parts.push(document.createTextNode(value.slice(lastIndex)));
  }

  return parts;
}

function appendAmountPrefix(root, amountPrefix) {
  const rawAmountPrefix = String(amountPrefix ?? '');

  if (!rawAmountPrefix) {
    return;
  }

  const amountValue = rawAmountPrefix.trimEnd();
  const spacerValue = rawAmountPrefix.slice(amountValue.length) || ' ';

  if (!amountValue) {
    return;
  }

  const amount = document.createElement('span');
  amount.className = `${RESOURCE_ICON_LABEL_CLASS}__amount`;
  amount.textContent = amountValue;

  const spacer = document.createElement('span');
  spacer.className = `${RESOURCE_ICON_LABEL_CLASS}__spacer`;
  spacer.textContent = spacerValue;

  root.append(amount, spacer);
}

function getResourceAmountPrefix(value) {
  const match = String(value ?? '').match(RESOURCE_AMOUNT_PREFIX_PATTERN);

  if (!match) {
    return '';
  }

  const amountPrefix = match[1] ?? '';
  const amountStart = value.length - amountPrefix.length;
  const previousCharacter = value[amountStart - 1] ?? '';

  if (/\w/.test(previousCharacter)) {
    return '';
  }

  return amountPrefix;
}

function shouldSkipResourceMatch(value, label, index) {
  if (label.toLowerCase() !== 'mana') {
    return false;
  }

  const afterLabel = value.slice(index + label.length);
  return MANA_NON_RESOURCE_PHRASE_PATTERN.test(afterLabel);
}

function normalizeResource(resource) {
  const normalizedResource = String(resource ?? '').trim().toLowerCase();

  if (normalizedResource === 'crystals') {
    return 'crystal';
  }

  if (normalizedResource === 'rubies') {
    return 'ruby';
  }

  if (normalizedResource === 'emeralds') {
    return 'emerald';
  }

  return normalizedResource;
}
