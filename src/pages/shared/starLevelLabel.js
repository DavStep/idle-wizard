export const STAR_LEVEL_LABEL_CLASS = 'style-star-level';

const STAR_SYMBOL = '\u2605';
const EMPTY_STAR_SYMBOL = '\u2606';
const STAR_TONES = Object.freeze(['yellow', 'orange', 'red', 'purple']);
const EMPTY_STAR_TONE = 'empty';
const STARS_PER_TONE = 3;
const MAX_STAR_LEVEL = STAR_TONES.length * STARS_PER_TONE;
const STAR_IMAGE_URLS = Object.freeze({
  empty: new URL('../../assets/ui/stars/star-empty.png', import.meta.url).href,
  yellow: new URL('../../assets/ui/stars/star-yellow.png', import.meta.url).href,
  orange: new URL('../../assets/ui/stars/star-orange.png', import.meta.url).href,
  red: new URL('../../assets/ui/stars/star-red.png', import.meta.url).href,
  purple: new URL('../../assets/ui/stars/star-purple.png', import.meta.url).href,
});

export function formatStarLevel(level) {
  const safeLevel = Math.max(0, Math.floor(Number(level) || 0));
  const visualLevel = Math.min(safeLevel, MAX_STAR_LEVEL);
  if (visualLevel === 0) {
    return {
      level: safeLevel,
      tone: EMPTY_STAR_TONE,
      starCount: 0,
      slotCount: STARS_PER_TONE,
      text: EMPTY_STAR_SYMBOL.repeat(STARS_PER_TONE),
      ariaLabel: '0 stars',
    };
  }

  const zeroBasedLevel = visualLevel - 1;
  const toneIndex = Math.floor(zeroBasedLevel / STARS_PER_TONE);
  const starCount = (zeroBasedLevel % STARS_PER_TONE) + 1;
  const tone = STAR_TONES[toneIndex];

  return {
    level: safeLevel,
    tone,
    starCount,
    slotCount: STARS_PER_TONE,
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
  element.dataset.starSlots = String(starLevel.slotCount);
  element.replaceChildren(
    createHiddenText(starLevel.text),
    ...Array.from({ length: starLevel.slotCount }, (_, index) =>
      createStarSlot(starLevel, index),
    ),
  );
  element.setAttribute('aria-label', starLevel.ariaLabel);
}

function createHiddenText(text) {
  const element = document.createElement('span');
  element.className = 'style-star-level__text';
  element.textContent = text;
  element.setAttribute('aria-hidden', 'true');
  return element;
}

function createStarSlot(starLevel, index) {
  const filled = index < starLevel.starCount;
  const element = document.createElement('span');
  element.className = 'style-star-level__slot';
  element.dataset.starSlot = String(index + 1);
  element.dataset.starFilled = filled ? 'true' : 'false';
  element.setAttribute('aria-hidden', 'true');
  element.append(createStarImage(STAR_IMAGE_URLS.empty, 'empty'));

  if (filled) {
    element.append(
      createStarImage(
        STAR_IMAGE_URLS[starLevel.tone] ?? STAR_IMAGE_URLS.yellow,
        'fill',
      ),
    );
  }

  return element;
}

function createStarImage(src, type) {
  const image = document.createElement('img');
  image.className = `style-star-level__image style-star-level__image--${type}`;
  image.src = src;
  image.alt = '';
  image.decoding = 'async';
  image.draggable = false;
  image.setAttribute('aria-hidden', 'true');
  return image;
}
