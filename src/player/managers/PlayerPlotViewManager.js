import {
  getPlayerPlotViewOptions,
  normalizePlayerPlotView,
} from '../playerPlotViews.js';

const PLOT_VIEW_STORAGE_KEY = 'idle-wizard.player.plotView';

export class PlayerPlotViewManager {
  constructor({ storage } = {}) {
    this.storage = storage ?? this.getDefaultStorage();
    this.plotView = normalizePlayerPlotView(this.readStoredPlotView());
  }

  getPlotView() {
    return this.plotView;
  }

  getPlotViewOptions() {
    return getPlayerPlotViewOptions();
  }

  setPlotView(plotView) {
    this.plotView = normalizePlayerPlotView(plotView);
    this.writeStoredPlotView(this.plotView);
    return this.plotView;
  }

  applyServerPlotView(plotView) {
    this.plotView = normalizePlayerPlotView(plotView);
    this.writeStoredPlotView(this.plotView);
    return this.plotView;
  }

  readStoredPlotView() {
    try {
      return this.storage?.getItem?.(PLOT_VIEW_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  writeStoredPlotView(plotView) {
    try {
      this.storage?.setItem?.(PLOT_VIEW_STORAGE_KEY, plotView);
    } catch {
      // Local storage can be unavailable in embedded or private browser contexts.
    }
  }

  getDefaultStorage() {
    try {
      return globalThis.localStorage ?? null;
    } catch {
      return null;
    }
  }
}
