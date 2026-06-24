import {
  DEFAULT_PLAYER_COLOR_MODE,
  PLAYER_COLOR_MODE_OPTIONS,
} from './playerColorModes.js';
import { PLAYER_CHARACTER_OPTIONS } from './playerCharacters.js';
import { DEFAULT_PLAYER_FONT, PLAYER_FONT_OPTIONS } from './playerFonts.js';
import { PLAYER_ICON_MODE_OPTIONS } from './playerIconModes.js';
import {
  DEFAULT_PLAYER_PLOT_VIEW,
  PLAYER_PLOT_VIEW_OPTIONS,
} from './playerPlotViews.js';
import {
  DEFAULT_PLAYER_PROGRESS_BAR,
  PLAYER_PROGRESS_BAR_OPTIONS,
} from './playerProgressBars.js';
import { DEFAULT_PLAYER_THEME, PLAYER_THEME_OPTIONS } from './playerThemes.js';

export const PLAYER_VISUAL_SETTING_CATEGORIES = Object.freeze([
  Object.freeze({
    key: 'theme',
    label: 'theme',
    options: PLAYER_THEME_OPTIONS,
  }),
  Object.freeze({
    key: 'font',
    label: 'font',
    options: PLAYER_FONT_OPTIONS,
  }),
  Object.freeze({
    key: 'color',
    label: 'color',
    options: PLAYER_COLOR_MODE_OPTIONS,
  }),
  Object.freeze({
    key: 'character',
    label: 'avatar',
    options: PLAYER_CHARACTER_OPTIONS,
  }),
  Object.freeze({
    key: 'progressBar',
    label: 'progress bar',
    options: PLAYER_PROGRESS_BAR_OPTIONS,
  }),
  Object.freeze({
    key: 'plotView',
    label: 'plot view',
    options: PLAYER_PLOT_VIEW_OPTIONS,
  }),
  Object.freeze({
    key: 'icons',
    label: 'icons',
    options: PLAYER_ICON_MODE_OPTIONS,
  }),
]);

export const DEFAULT_PLAYER_VISUAL_SETTINGS_COSTS_CRYSTAL = Object.freeze(
  Object.fromEntries(
    PLAYER_VISUAL_SETTING_CATEGORIES.map((category) => [
      category.key,
      Object.freeze(Object.fromEntries(category.options.map((option) => [option.key, 0]))),
    ]),
  ),
);

export const DEFAULT_PLAYER_VISUAL_SETTINGS_RESEARCHED = Object.freeze({
  theme: Object.freeze({ [DEFAULT_PLAYER_THEME]: true }),
  font: Object.freeze({ [DEFAULT_PLAYER_FONT]: true }),
  color: Object.freeze({ [DEFAULT_PLAYER_COLOR_MODE]: true }),
  character: Object.freeze(
    Object.fromEntries(PLAYER_CHARACTER_OPTIONS.map((option) => [option.key, true])),
  ),
  progressBar: Object.freeze({ [DEFAULT_PLAYER_PROGRESS_BAR]: true }),
  plotView: Object.freeze({ [DEFAULT_PLAYER_PLOT_VIEW]: true, rows: true }),
  icons: Object.freeze({ none: true, icons: true }),
});

const CATEGORY_BY_KEY = new Map(
  PLAYER_VISUAL_SETTING_CATEGORIES.map((category) => [category.key, category]),
);

export function getPlayerVisualSettingCategories() {
  return PLAYER_VISUAL_SETTING_CATEGORIES.map((category) => ({
    key: category.key,
    label: category.label,
    options: category.options.map((option) => ({ ...option })),
  }));
}

export function getPlayerVisualSettingCategory(categoryKey) {
  const category = CATEGORY_BY_KEY.get(String(categoryKey ?? '').trim());

  if (!category) {
    return null;
  }

  return {
    key: category.key,
    label: category.label,
    options: category.options.map((option) => ({ ...option })),
  };
}

export function hasPlayerVisualSettingOption(categoryKey, optionKey) {
  const category = CATEGORY_BY_KEY.get(String(categoryKey ?? '').trim());
  const key = String(optionKey ?? '').trim();

  return Boolean(category?.options.some((option) => option.key === key));
}

export function getDefaultPlayerVisualSettingsCostsCrystal() {
  return Object.fromEntries(
    Object.entries(DEFAULT_PLAYER_VISUAL_SETTINGS_COSTS_CRYSTAL).map(([category, costs]) => [
      category,
      { ...costs },
    ]),
  );
}

export function getDefaultPlayerVisualSettingsResearched() {
  return Object.fromEntries(
    PLAYER_VISUAL_SETTING_CATEGORIES.map((category) => [
      category.key,
      Object.fromEntries(
        category.options.map((option) => [
          option.key,
          Boolean(DEFAULT_PLAYER_VISUAL_SETTINGS_RESEARCHED[category.key]?.[option.key]),
        ]),
      ),
    ]),
  );
}
