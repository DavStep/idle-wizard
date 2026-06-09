const FLYOUT_LIFETIME_MS = 1200;

export class WorkshopFlyoutManager {
  constructor() {
    this.root = null;
    this.timeouts = new Set();
  }

  mount(parent) {
    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('div');
    this.root.className = 'workshop-page__flyouts';
    this.root.setAttribute('aria-live', 'polite');
    this.root.setAttribute('aria-atomic', 'false');
    parent.append(this.root);

    return this.root;
  }

  show(message) {
    if (!this.root || !message) {
      return null;
    }

    const flyout = document.createElement('div');
    flyout.className = 'workshop-page__flyout';
    flyout.setAttribute('role', 'status');
    flyout.textContent = message;
    this.root.append(flyout);

    const timeoutId = window.setTimeout(() => {
      this.timeouts.delete(timeoutId);
      flyout.remove();
    }, FLYOUT_LIFETIME_MS);

    this.timeouts.add(timeoutId);
    return flyout;
  }

  unmount() {
    for (const timeoutId of this.timeouts) {
      window.clearTimeout(timeoutId);
    }

    this.timeouts.clear();
    this.root?.remove();
    this.root = null;
  }
}
