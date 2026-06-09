export class GardenPageNameManager {
  constructor() {
    this.root = null;
  }

  mount(parent) {
    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('div');
    this.root.className = 'garden-page__name';
    this.root.textContent = 'Garden';
    parent.append(this.root);

    return this.root;
  }

  unmount() {
    this.root?.remove();
    this.root = null;
  }
}
