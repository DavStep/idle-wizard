export class WorkshopPageNameManager {
  constructor({ pageName = 'Workshop' } = {}) {
    this.pageName = pageName;
    this.root = null;
  }

  mount(parent) {
    if (!parent) {
      throw new Error('WorkshopPageNameManager requires a parent element.');
    }

    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('div');
    this.root.className = 'workshop-page__name';
    this.root.textContent = this.pageName;
    parent.append(this.root);

    return this.root;
  }

  unmount() {
    this.root?.remove();
    this.root = null;
  }
}
