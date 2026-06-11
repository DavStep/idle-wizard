import { PLAYER_COLOR_MODE_OPTIONS } from './playerColorModes.js';
import { PLAYER_FONT_OPTIONS } from './playerFonts.js';
import { PLAYER_THEME_OPTIONS } from './playerThemes.js';

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
]);

export const DEFAULT_PLAYER_VISUAL_SETTINGS_COSTS_CRYSTAL = Object.freeze(
  Object.fromEntries(
    PLAYER_VISUAL_SETTING_CATEGORIES.map((category) => [
      category.key,
      Object.freeze(Object.fromEntries(category.options.map((option) => [option.key, 0]))),
    ]),
  ),
);

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
