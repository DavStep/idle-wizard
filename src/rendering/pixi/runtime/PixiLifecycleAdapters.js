/**
 * Adapts the existing application lifecycle to the one canvas without
 * constructing shell, viewport, clipboard-guard, or interaction-lock DOM.
 */
export class PixiCanvasHostManager {
  constructor({ canvas } = {}) {
    if (!canvas) {
      throw new Error('PixiCanvasHostManager requires the production canvas.');
    }
    this.canvas = canvas;
  }

  mount() {
    return this.canvas;
  }

  unmount() {}
}

export class PixiCanvasViewportFacade {
  constructor({ canvas } = {}) {
    if (!canvas) {
      throw new Error('PixiCanvasViewportFacade requires the production canvas.');
    }
    this.canvas = canvas;
  }

  mount() {
    return this.canvas;
  }

  unmount() {}

  getStageElement() {
    return this.canvas;
  }
}

export class PixiInteractionLockManager {
  constructor({ inputRouter } = {}) {
    this.inputRouter = inputRouter;
    this.modalHandle = null;
    this.reason = '';
  }

  mount() {
    return this;
  }

  lock(reason = 'locked') {
    this.reason = String(reason || 'locked');
    if (!this.modalHandle) {
      this.modalHandle =
        this.inputRouter?.pushModal?.({
          id: 'app.interactionLock',
          autoFocus: false,
        }) ?? null;
    }
  }

  unlock() {
    this.modalHandle?.unregister?.();
    this.modalHandle = null;
    this.reason = '';
  }

  isLocked() {
    return Boolean(this.modalHandle || this.reason);
  }

  unmount() {
    this.unlock();
  }
}

export class PixiCanvasClipboardBoundary {
  mount() {
    return this;
  }

  unmount() {}
}
