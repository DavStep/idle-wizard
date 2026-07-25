import { FillGradient } from 'pixi.js';

import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_PAGE_BACKGROUND_COLORS,
} from './PixiThemeTokens.js';

export const PIXI_PAGE_BACKGROUND_STOPS = Object.freeze([0, 0.48, 1]);

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
  return new FillGradient({
    type: 'linear',
    start: { x: 0, y: 1 },
    end: { x: 0, y: 0 },
    textureSpace: 'local',
    colorStops: PIXI_PAGE_BACKGROUND_STOPS.map((offset, index) => ({
      offset,
      color: colors[index],
    })),
  });
}
