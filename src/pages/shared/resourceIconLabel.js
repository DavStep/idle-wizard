import goldIconUrl from '../../assets/icons/icon-gold-coin.png';

export const RESOURCE_ICON_LABEL_CLASS = 'style-resource-label';

const RESOURCE_ICON_URLS = Object.freeze({
  gold: goldIconUrl,
});

const RESOURCE_WORD_PATTERN = /\bgold\b/;
const RESOURCE_WORD_MATCH_PATTERN = /\bgold\b/gi;

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
  const iconUrl = RESOURCE_ICON_URLS[normalizedResource];

  if (!iconUrl) {
    return document.createTextNode(String(label ?? ''));
  }

  const root = document.createElement('span');
  root.className = `${RESOURCE_ICON_LABEL_CLASS} ${RESOURCE_ICON_LABEL_CLASS}--${normalizedResource}`;

  const icon = document.createElement('img');
  icon.className = `${RESOURCE_ICON_LABEL_CLASS}__icon`;
  icon.src = iconUrl;
  icon.alt = '';
  icon.setAttribute('aria-hidden', 'true');

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

function normalizeResource(resource) {
  return String(resource ?? '').trim().toLowerCase();
}
