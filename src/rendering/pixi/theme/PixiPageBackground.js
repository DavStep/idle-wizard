import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_PAGE_BACKGROUND_COLORS,
} from './PixiThemeTokens.js';

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
