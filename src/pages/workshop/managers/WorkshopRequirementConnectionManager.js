const TARGET_PULSE_MS = 360;

export class WorkshopRequirementConnectionManager {
  constructor() {
    this.root = null;
    this.timeouts = new Set();
  }

  mount(root) {
    this.root = root ?? null;
  }

  unmount() {
    for (const timeoutId of this.timeouts) {
      window.clearTimeout(timeoutId);
    }

    this.timeouts.clear();
    this.root = null;
  }

  show({ target } = {}) {
    if (!target?.isConnected) {
      return false;
    }

    this.pulseTarget(target);
    return true;
  }

  pulseTarget(target) {
    target.classList.remove('is-requirement-updated');
    void target.offsetWidth;
    target.classList.add('is-requirement-updated');
    this.setManagedTimeout(() => {
      target.classList.remove('is-requirement-updated');
    }, TARGET_PULSE_MS);
  }

  setManagedTimeout(callback, delay) {
    const timeoutId = window.setTimeout(() => {
      this.timeouts.delete(timeoutId);
      callback();
    }, delay);
    this.timeouts.add(timeoutId);
    return timeoutId;
  }
}
