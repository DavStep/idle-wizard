export class BrewingPageNavigationManager {
  constructor({ onShowGarden } = {}) {
    this.onShowGarden = onShowGarden;
    this.root = null;
  }

  mount(parent) {
    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('button');
    this.root.className = 'style-button room-page__nav room-page__nav--right';
    this.root.type = 'button';
    this.root.textContent = 'garden';
    this.root.setAttribute('aria-label', 'go right to garden');
    this.root.addEventListener('click', () => this.onShowGarden?.());
    parent.append(this.root);

    return this.root;
  }

  unmount() {
    this.root?.remove();
    this.root = null;
  }
}
