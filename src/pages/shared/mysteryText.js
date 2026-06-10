const MYSTERY_TEXT_LENGTH = 10;
const MYSTERY_TEXT_TICK_MS = 150;
const MYSTERY_TEXT_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789?#%$@!*+-=[]{}<>~^&_/\\|:;';

const activeMysteryElements = new Map();
let mysteryTextTimer = null;
let reducedMotionQuery = null;

function getMysterySeed(item = {}) {
  const key = String(item.key ?? item.itemTypeId ?? item.label ?? '');
  let seed = 5381;

  for (let index = 0; index < key.length; index += 1) {
    seed = (seed * 33) ^ key.charCodeAt(index);
  }

  return Math.abs(seed);
}

function getBrowserWindow() {
  return typeof window === 'undefined' ? null : window;
}

function getReducedMotionQuery() {
  const browserWindow = getBrowserWindow();

  if (!browserWindow?.matchMedia) {
    return null;
  }

  if (!reducedMotionQuery) {
    reducedMotionQuery = browserWindow.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionQuery.addEventListener?.('change', () => {
      if (reducedMotionQuery.matches) {
        stopMysteryTextTicker();
        renderAllMysteryText(0);
        return;
      }

      startMysteryTextTicker();
    });
  }

  return reducedMotionQuery;
}

function shouldReduceMotion() {
  return Boolean(getReducedMotionQuery()?.matches);
}

function isTestDom() {
  return /jsdom/i.test(getBrowserWindow()?.navigator?.userAgent ?? '');
}

function canAnimateMysteryText() {
  const browserWindow = getBrowserWindow();
  return Boolean(browserWindow?.setInterval && !shouldReduceMotion() && !isTestDom());
}

function getFrameChar(seed, frame, index) {
  const phase = frame + index * 3 + ((seed + index) % 5);
  const charIndex =
    (seed + phase * (11 + index * 2) + index * 29) % MYSTERY_TEXT_CHARS.length;
  return MYSTERY_TEXT_CHARS[charIndex];
}

function getMysteryTextForSeed(seed, frame = 0) {
  const normalizedFrame = Number.isFinite(frame) ? Math.max(0, Math.floor(frame)) : 0;

  return Array.from({ length: MYSTERY_TEXT_LENGTH }, (_, index) =>
    getFrameChar(seed, normalizedFrame, index),
  ).join('');
}

function renderMysteryText(element, seed, frame) {
  const nextText = getMysteryTextForSeed(seed, frame);

  if (element.textContent !== nextText) {
    element.textContent = nextText;
  }
}

function renderAllMysteryText(frame) {
  for (const [element, entry] of activeMysteryElements) {
    if (!element.isConnected) {
      activeMysteryElements.delete(element);
      continue;
    }

    renderMysteryText(element, entry.seed, frame);
  }
}

function tickMysteryText() {
  if (activeMysteryElements.size === 0) {
    stopMysteryTextTicker();
    return;
  }

  if (typeof document !== 'undefined' && document.hidden) {
    return;
  }

  renderAllMysteryText(Date.now() / MYSTERY_TEXT_TICK_MS);
}

function startMysteryTextTicker() {
  const browserWindow = getBrowserWindow();

  if (mysteryTextTimer !== null || !canAnimateMysteryText()) {
    return;
  }

  mysteryTextTimer = browserWindow.setInterval(tickMysteryText, MYSTERY_TEXT_TICK_MS);
}

function stopMysteryTextTicker() {
  const browserWindow = getBrowserWindow();

  if (mysteryTextTimer === null || !browserWindow?.clearInterval) {
    mysteryTextTimer = null;
    return;
  }

  browserWindow.clearInterval(mysteryTextTimer);
  mysteryTextTimer = null;
}

export function getMysteryTextFrame(item = {}, frame = 0) {
  return getMysteryTextForSeed(getMysterySeed(item), frame);
}

export function getMysteryTextLabel(item = {}) {
  return getMysteryTextFrame(item, 0);
}

export function applyMysteryText(element, item = {}, active = false) {
  element.classList.toggle('mystery-text', active);

  if (!active) {
    activeMysteryElements.delete(element);

    if (element.hasAttribute('aria-label')) {
      element.removeAttribute('aria-label');
    }

    if (activeMysteryElements.size === 0) {
      stopMysteryTextTicker();
    }

    return;
  }

  const seed = getMysterySeed(item);
  const frame = canAnimateMysteryText() ? Date.now() / MYSTERY_TEXT_TICK_MS : 0;

  if (element.getAttribute('aria-label') !== 'unknown') {
    element.setAttribute('aria-label', 'unknown');
  }

  const entry = activeMysteryElements.get(element);

  if (!entry || entry.seed !== seed) {
    activeMysteryElements.set(element, { seed });
  }

  renderMysteryText(element, seed, frame);
  startMysteryTextTicker();
}
