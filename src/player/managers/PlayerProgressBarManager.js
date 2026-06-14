import {
  getPlayerProgressBarOptions,
  normalizePlayerProgressBar,
} from '../playerProgressBars.js';

const PROGRESS_BAR_STORAGE_KEY = 'idle-wizard.player.progressBar';

export class PlayerProgressBarManager {
  constructor({ storage } = {}) {
    this.storage = storage ?? this.getDefaultStorage();
    this.progressBar = normalizePlayerProgressBar(this.readStoredProgressBar());
  }

  getProgressBar() {
    return this.progressBar;
  }

  getProgressBarOptions() {
    return getPlayerProgressBarOptions();
  }

  setProgressBar(progressBar) {
    this.progressBar = normalizePlayerProgressBar(progressBar);
    this.writeStoredProgressBar(this.progressBar);
    return this.progressBar;
  }

  applyServerProgressBar(progressBar) {
    this.progressBar = normalizePlayerProgressBar(progressBar);
    this.writeStoredProgressBar(this.progressBar);
    return this.progressBar;
  }

  readStoredProgressBar() {
    try {
      return this.storage?.getItem?.(PROGRESS_BAR_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  writeStoredProgressBar(progressBar) {
    try {
      this.storage?.setItem?.(PROGRESS_BAR_STORAGE_KEY, progressBar);
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
