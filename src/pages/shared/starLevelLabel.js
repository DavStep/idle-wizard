export const STAR_LEVEL_LABEL_CLASS = 'style-star-level';

const STAR_SYMBOL = '\u2605';
const STAR_TONES = Object.freeze(['yellow', 'orange', 'red', 'purple']);
const STARS_PER_TONE = 3;
const MAX_STAR_LEVEL = STAR_TONES.length * STARS_PER_TONE;

export function formatStarLevel(level) {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  const visualLevel = Math.min(safeLevel, MAX_STAR_LEVEL);
  const zeroBasedLevel = visualLevel - 1;
  const toneIndex = Math.floor(zeroBasedLevel / STARS_PER_TONE);
  const starCount = (zeroBasedLevel % STARS_PER_TONE) + 1;
  const tone = STAR_TONES[toneIndex];

  return {
    level: safeLevel,
    tone,
    starCount,
    text: STAR_SYMBOL.repeat(starCount),
    ariaLabel: `${tone} star ${starCount}`,
  };
}

export function createStarLevelLabel(level) {
  const element = document.createElement('span');
  setStarLevelLabel(element, level);
  return element;
}

export function setStarLevelLabel(element, level) {
  if (!element) {
    return;
  }

  const starLevel = formatStarLevel(level);
  element.classList.add(STAR_LEVEL_LABEL_CLASS);
  element.dataset.starTone = starLevel.tone;
  element.dataset.starCount = String(starLevel.starCount);
  element.textContent = starLevel.text;
  element.setAttribute('aria-label', starLevel.ariaLabel);
}
