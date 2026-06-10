export const MYSTERY_TEXT_LABEL = '??????';

export function getMysteryTextFrame(item = {}, frame = 0) {
  void item;
  void frame;
  return MYSTERY_TEXT_LABEL;
}

export function getMysteryTextLabel(item = {}) {
  void item;
  return MYSTERY_TEXT_LABEL;
}

export function applyMysteryText(element, item = {}, active = false) {
  void item;
  element.classList.toggle('mystery-text', active);

  if (!active) {
    if (element.hasAttribute('aria-label')) {
      element.removeAttribute('aria-label');
    }

    return;
  }

  if (element.getAttribute('aria-label') !== 'unknown') {
    element.setAttribute('aria-label', 'unknown');
  }

  if (element.textContent !== MYSTERY_TEXT_LABEL) {
    element.textContent = MYSTERY_TEXT_LABEL;
  }
}
