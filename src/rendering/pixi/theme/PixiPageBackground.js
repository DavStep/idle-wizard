import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_PAGE_BACKGROUND_COLORS,
} from './PixiThemeTokens.js';

const DAY_PAPER_MATERIAL = Object.freeze({
  kind: 'paper',
  highlight: 0xffead0,
  shadow: 0xaf744c,
  longFiberCount: 24,
  shortFiberCount: 112,
  speckCount: 64,
});

const SOLID_MATERIAL = Object.freeze({
  kind: 'solid',
});

export const PIXI_PAGE_BACKGROUND_MATERIALS = Object.freeze({
  night: SOLID_MATERIAL,
  day: DAY_PAPER_MATERIAL,
});

export function getPixiPageBackgroundColors(
  pageId,
  theme = DEFAULT_PIXI_THEME_SNAPSHOT,
) {
  const themeBackgrounds =
    theme?.pageBackgrounds ??
    PIXI_PAGE_BACKGROUND_COLORS[theme?.themeKey] ??
    PIXI_PAGE_BACKGROUND_COLORS.midnight;
  return (
    themeBackgrounds?.[pageId] ??
    Object.freeze([
      theme?.surface ?? DEFAULT_PIXI_THEME_SNAPSHOT.surface,
      theme?.surface ?? DEFAULT_PIXI_THEME_SNAPSHOT.surface,
      theme?.surface ?? DEFAULT_PIXI_THEME_SNAPSHOT.surface,
    ])
  );
}

export function createPixiPageBackgroundGradient(pageId, theme) {
  const colors = getPixiPageBackgroundColors(pageId, theme);
  return colors[0];
}

export function getPixiPageBackgroundMaterial(
  theme = DEFAULT_PIXI_THEME_SNAPSHOT,
) {
  return (
    PIXI_PAGE_BACKGROUND_MATERIALS[theme?.themeKey] ??
    PIXI_PAGE_BACKGROUND_MATERIALS.night
  );
}

export function createPixiPagePaperPattern(
  pageId,
  width,
  height,
  material = DAY_PAPER_MATERIAL,
) {
  const resolvedWidth = Math.max(1, Number(width) || 1);
  const resolvedHeight = Math.max(1, Number(height) || 1);
  const random = createSeededRandom(hashString(`idle-wizard:${pageId}`));
  const longFibers = Array.from(
    { length: material.longFiberCount },
    () =>
      createFiber(random, resolvedWidth, resolvedHeight, {
        minLength: 22,
        maxLength: 68,
        maxSlope: 0.08,
        minWidth: 0.42,
        maxWidth: 0.7,
        minAlpha: 0.12,
        maxAlpha: 0.2,
      }),
  );
  const shortFibers = Array.from(
    { length: material.shortFiberCount },
    () =>
      createFiber(random, resolvedWidth, resolvedHeight, {
        minLength: 2,
        maxLength: 14,
        maxSlope: 0.34,
        minWidth: 0.38,
        maxWidth: 0.78,
        minAlpha: 0.14,
        maxAlpha: 0.24,
      }),
  );
  const specks = Array.from({ length: material.speckCount }, () => ({
    x: random() * resolvedWidth,
    y: random() * resolvedHeight,
    radius: 0.16 + random() * 0.34,
    alpha: 0.1 + random() * 0.1,
    tone: random() > 0.36 ? 'highlight' : 'shadow',
  }));

  return {
    longFibers,
    shortFibers,
    specks,
  };
}

export function drawPixiPageBackground(
  graphics,
  {
    pageId,
    theme = DEFAULT_PIXI_THEME_SNAPSHOT,
    width,
    height,
    background = createPixiPageBackgroundGradient(pageId, theme),
  } = {},
) {
  if (!graphics) {
    return;
  }

  const resolvedWidth = Math.max(1, Number(width) || 1);
  const resolvedHeight = Math.max(1, Number(height) || 1);
  graphics
    .clear()
    .rect(0, 0, resolvedWidth, resolvedHeight)
    .fill(background);

  const material = getPixiPageBackgroundMaterial(theme);
  if (material.kind !== 'paper') {
    return;
  }

  try {
    const pattern = createPixiPagePaperPattern(
      pageId,
      resolvedWidth,
      resolvedHeight,
      material,
    );
    for (const fiber of [
      ...pattern.longFibers,
      ...pattern.shortFibers,
    ]) {
      graphics
        .moveTo(fiber.x, fiber.y)
        .bezierCurveTo(
          fiber.controlX,
          fiber.controlY,
          fiber.endX - fiber.length * 0.22,
          fiber.endY,
          fiber.endX,
          fiber.endY,
        )
        .stroke({
          color:
            fiber.tone === 'highlight'
              ? material.highlight
              : material.shadow,
          width: fiber.width,
          alpha: fiber.alpha,
        });
    }
    for (const speck of pattern.specks) {
      graphics.circle(speck.x, speck.y, speck.radius).fill({
        color:
          speck.tone === 'highlight'
            ? material.highlight
            : material.shadow,
        alpha: speck.alpha,
      });
    }
  } catch {
    // The base fill is the safe fallback if a renderer cannot draw the fibers.
  }
}

function createFiber(
  random,
  width,
  height,
  {
    minLength,
    maxLength,
    maxSlope,
    minWidth,
    maxWidth,
    minAlpha,
    maxAlpha,
  },
) {
  const length = minLength + random() * (maxLength - minLength);
  const x = random() * width;
  const y = random() * height;
  const slope = (random() - 0.5) * maxSlope;
  const endX = Math.min(width, x + length);
  const endY = Math.max(0, Math.min(height, y + length * slope));

  return {
    x,
    y,
    endX,
    endY,
    controlX: x + length * (0.32 + random() * 0.16),
    controlY: y + (random() - 0.5) * 1.8,
    length,
    width: minWidth + random() * (maxWidth - minWidth),
    alpha: minAlpha + random() * (maxAlpha - minAlpha),
    tone: random() > 0.31 ? 'highlight' : 'shadow',
  };
}

function createSeededRandom(seed) {
  let state = seed || 0x6d2b79f5;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
