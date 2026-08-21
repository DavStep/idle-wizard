import {
  STARS_PER_TONE,
  resolveStarLevel,
} from '../../shared/starLevel.js';

export const STAR_LEVEL_LABEL_CLASS = 'style-star-level';

const STAR_SYMBOL = '\u2605';
const EMPTY_STAR_SYMBOL = '\u2606';
const STAR_IMAGE_URLS = Object.freeze({
  empty: new URL('../../../assets/game/source/ui/stars/star-empty.png', import.meta.url).href,
  yellow: new URL('../../../assets/game/source/ui/stars/star-yellow.png', import.meta.url).href,
  orange: new URL('../../../assets/game/source/ui/stars/star-orange.png', import.meta.url).href,
  red: new URL('../../../assets/game/source/ui/stars/star-red.png', import.meta.url).href,
  purple: new URL('../../../assets/game/source/ui/stars/star-purple.png', import.meta.url).href,
  blue: new URL('../../../assets/game/source/ui/stars/star-blue.png', import.meta.url).href,
  green: new URL('../../../assets/game/source/ui/stars/star-green.png', import.meta.url).href,
  silver: new URL('../../../assets/game/source/ui/stars/star-silver.png', import.meta.url).href,
});

export function formatStarLevel(level, { slotCount = STARS_PER_TONE } = {}) {
  const starLevel = resolveStarLevel(level, { slotCount });
  if (starLevel.starCount === 0) {
    return {
      ...starLevel,
      starCount: 0,
      text: EMPTY_STAR_SYMBOL.repeat(starLevel.slotCount),
      ariaLabel: '0 stars',
    };
  }

  return {
    ...starLevel,
    text: STAR_SYMBOL.repeat(starLevel.starCount),
    ariaLabel: `${starLevel.tone} star ${starLevel.starCount}`,
  };
}

export function createStarLevelLabel(level, options) {
  const element = document.createElement('span');
  setStarLevelLabel(element, level, options);
  return element;
}

export function setStarLevelLabel(element, level, options) {
  if (!element) {
    return;
  }

  const starLevel = formatStarLevel(level, options);
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
