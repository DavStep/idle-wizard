export class WorkshopPageNavigationManager {
  constructor({ onShowResearch } = {}) {
    this.onShowResearch = onShowResearch;
    this.root = null;
  }

  mount(parent) {
    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('button');
    this.root.className = 'style-button room-page__nav room-page__nav--right';
    this.root.type = 'button';
    this.root.textContent = 'research';
    this.root.setAttribute('aria-label', 'go right to research');
    this.root.addEventListener('click', () => this.onShowResearch?.());
    parent.append(this.root);

    return this.root;
  }

  unmount() {
    this.root?.remove();
    this.root = null;
  }
}
