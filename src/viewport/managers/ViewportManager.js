export class ViewportManager {
  constructor({ viewport }) {
    this.viewport = viewport;
    this.stage = null;
    this.controlRevealTimeout = null;
  }

  mount(parent) {
    if (!parent) {
      throw new Error('ViewportManager requires a parent element.');
    }

    if (this.stage) {
      return this.stage;
    }

    this.stage = document.createElement('section');
    this.stage.className = 'game-stage is-control-revealing';
    this.stage.setAttribute('aria-label', 'Idle Wizard game surface');
    this.stage.style.setProperty('--design-width', String(this.viewport.width));
    this.stage.style.setProperty('--design-height', String(this.viewport.height));
    parent.append(this.stage);
    this.scheduleControlRevealEnd(parent);

    return this.stage;
  }

  unmount() {
    this.clearControlRevealTimeout();
    this.stage?.remove();
    this.stage = null;
  }

  getStageElement() {
    return this.stage;
  }

  scheduleControlRevealEnd(parent) {
    const view = parent?.ownerDocument?.defaultView ?? globalThis.window;

    if (typeof view?.setTimeout !== 'function') {
      this.stage?.classList.remove('is-control-revealing');
      return;
    }

    this.clearControlRevealTimeout();
    this.controlRevealTimeout = view.setTimeout(() => {
      this.controlRevealTimeout = null;
      this.stage?.classList.remove('is-control-revealing');
    }, 720);
  }

  clearControlRevealTimeout() {
    if (!this.controlRevealTimeout) {
      return;
    }

    const view = this.stage?.ownerDocument?.defaultView ?? globalThis.window;
    view?.clearTimeout?.(this.controlRevealTimeout);
    this.controlRevealTimeout = null;
  }
}
