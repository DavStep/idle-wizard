import { createPixiThemeSnapshot, DEFAULT_PIXI_THEME_SNAPSHOT } from './PixiThemeTokens.js';

export class PixiThemeManager {
  static explain =
    'Turns the player visual settings into immutable Pixi colors, fonts, frames, and layout values.';

  constructor({ initialSnapshot = DEFAULT_PIXI_THEME_SNAPSHOT } = {}) {
    this.snapshot = initialSnapshot;
    this.playerFacade = null;
    this.unsubscribe = null;
    this.listeners = new Set();
  }

  mount(playerFacade) {
    if (this.playerFacade === playerFacade && this.unsubscribe) {
      return;
    }

    this.unmount();
    this.playerFacade = playerFacade ?? null;
    this.applySettings(this.playerFacade?.getSnapshot?.());
    this.unsubscribe =
      this.playerFacade?.subscribe?.((snapshot) => this.applySettings(snapshot)) ?? null;
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.playerFacade = null;
  }

  destroy() {
    this.unmount();
    this.listeners.clear();
  }

  applySettings(settings) {
    const next = createPixiThemeSnapshot(settings);
    if (next.revisionKey === this.snapshot.revisionKey) {
      return false;
    }

    this.snapshot = next;
    for (const listener of this.listeners) {
      listener(next);
    }
    return true;
  }

  getSnapshot() {
    return this.snapshot;
  }

  subscribe(listener, { emitCurrent = false } = {}) {
    if (typeof listener !== 'function') {
      throw new Error('PixiThemeManager requires a listener function.');
    }

    this.listeners.add(listener);
    if (emitCurrent) {
      listener(this.snapshot);
    }
    return () => this.listeners.delete(listener);
  }
}
