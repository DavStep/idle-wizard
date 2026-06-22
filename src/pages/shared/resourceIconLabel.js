import { createAssetAtlasSprite } from '../../assets/atlas/atlasSprite.js';

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

export function createResourceIconLabel(resource, label = resource) {
  const normalizedResource = normalizeResource(resource);
  const frameName = RESOURCE_ICON_FRAME_NAMES[normalizedResource];

  if (!frameName) {
    return document.createTextNode(String(label ?? ''));
  }

  const root = document.createElement('span');
  root.className = `${RESOURCE_ICON_LABEL_CLASS} ${RESOURCE_ICON_LABEL_CLASS}--${normalizedResource}`;

  const icon = createAssetAtlasSprite(`${RESOURCE_ICON_LABEL_CLASS}__icon`, frameName);

  const text = document.createElement('span');
  text.className = `${RESOURCE_ICON_LABEL_CLASS}__text`;
  text.textContent = String(label ?? normalizedResource);

  root.append(icon, text);
  return root;
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

    if (index > lastIndex) {
      parts.push(document.createTextNode(value.slice(lastIndex, index)));
    }

    parts.push(createResourceIconLabel(label.toLowerCase(), label));
    lastIndex = index + label.length;
  }

  if (lastIndex < value.length) {
    parts.push(document.createTextNode(value.slice(lastIndex)));
  }

  return parts;
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
