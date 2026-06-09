export class BrewingPageNameManager {
  constructor() {
    this.root = null;
  }

  mount(parent) {
    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('div');
    this.root.className = 'brewing-page__name';
    this.root.textContent = 'Brewing';
    parent.append(this.root);

    return this.root;
  }

  unmount() {
    this.root?.remove();
    this.root = null;
  }
}
