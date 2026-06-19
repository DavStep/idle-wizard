export const DEFAULT_PLAYER_PLOT_VIEW = 'boxes';

export const PLAYER_PLOT_VIEW_OPTIONS = Object.freeze([
  Object.freeze({
    key: 'rows',
    label: 'rows',
  }),
  Object.freeze({
    key: 'boxes',
    label: 'boxes',
  }),
]);

const PLOT_VIEW_KEYS = new Set(PLAYER_PLOT_VIEW_OPTIONS.map((view) => view.key));
const PLOT_VIEW_ALIASES = new Map([
  ['row', 'rows'],
  ['current', 'rows'],
  ['old', 'rows'],
  ['box', 'boxes'],
  ['cards', 'boxes'],
  ['grid', 'boxes'],
]);

export function normalizePlayerPlotView(plotView) {
  const value = String(plotView ?? '').trim();
  const normalizedValue = PLOT_VIEW_ALIASES.get(value) ?? value;
  return PLOT_VIEW_KEYS.has(normalizedValue) ? normalizedValue : DEFAULT_PLAYER_PLOT_VIEW;
}

export function getPlayerPlotViewOptions() {
  return PLAYER_PLOT_VIEW_OPTIONS.map((view) => ({ ...view }));
}
