export class ViewportManager {
  constructor({ viewport }) {
    this.viewport = viewport;
    this.stage = null;
  }

  mount(parent) {
    if (!parent) {
      throw new Error('ViewportManager requires a parent element.');
    }

    if (this.stage) {
      return this.stage;
    }

    this.stage = document.createElement('section');
    this.stage.className = 'game-stage';
    this.stage.setAttribute('aria-label', 'Idle Wizard game surface');
    this.stage.style.setProperty('--design-width', String(this.viewport.width));
    this.stage.style.setProperty('--design-height', String(this.viewport.height));
    parent.append(this.stage);

    return this.stage;
  }

  unmount() {
    this.stage?.remove();
    this.stage = null;
  }

  getStageElement() {
    return this.stage;
  }
}
