import { FullscreenManager } from './managers/FullscreenManager.js';

export class FullscreenFacade {
  static explain =
    'Lets supported mobile web players enter or leave fullscreen from Settings while keeping browser permission rules in one place.';

  constructor({ manager } = {}) {
    this.manager = manager ?? new FullscreenManager();
    this.manager.mount();
  }

  getSnapshot() {
    return this.manager.getSnapshot();
  }

  setEnabled(enabled) {
    return this.manager.setEnabled(enabled);
  }

  subscribe(listener) {
    return this.manager.subscribe(listener);
  }

  destroy() {
    this.manager.destroy();
  }
}
