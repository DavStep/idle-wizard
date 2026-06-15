import { getTradeAllianceTagColorCssValue } from '../../shared/tradeAllianceTagColors.js';

export function normalizeAllianceTag(tag) {
  const normalized = String(tag ?? '')
    .trim()
    .toUpperCase();

  return /^[A-Z]{2,5}$/.test(normalized) ? normalized : '';
}

export function createAllianceTagSpan(tag, tagColor, { doc = document } = {}) {
  const safeTag = normalizeAllianceTag(tag);

  if (!safeTag) {
    return null;
  }

  const span = doc.createElement('span');
  span.className = 'workshop-page__alliance-tag';
  span.style.setProperty(
    '--workshop-alliance-tag-color',
    getTradeAllianceTagColorCssValue(tagColor),
  );
  span.textContent = `[${safeTag}]`;
  return span;
}
