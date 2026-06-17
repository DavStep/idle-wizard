const LINK_LIFETIME_MS = 320;
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

  show({ source = null, target } = {}) {
    if (!target?.isConnected) {
      return false;
    }

    this.pulseTarget(target);

    if (this.prefersReducedMotion()) {
      return true;
    }

    return this.drawLink(source, target);
  }

  pulseTarget(target) {
    target.classList.remove('is-requirement-updated');
    void target.offsetWidth;
    target.classList.add('is-requirement-updated');
    this.setManagedTimeout(() => {
      target.classList.remove('is-requirement-updated');
    }, TARGET_PULSE_MS);
  }

  drawLink(source, target) {
    const parent = this.root?.closest('.game-stage') ?? this.root;
    const from = this.getElementPoint(source, parent, { x: 0.5, y: 0.42 });
    const to = this.getElementPoint(target, parent, { x: 0.06, y: 0.5 });

    if (!parent || !from || !to) {
      return false;
    }

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);

    if (length < 1) {
      return false;
    }

    const link = document.createElement('span');
    link.className = 'workshop-page__requirement-link';
    link.setAttribute('aria-hidden', 'true');
    link.style.left = `${from.x}px`;
    link.style.top = `${from.y}px`;
    link.style.width = `${length}px`;
    link.style.setProperty('--requirement-link-angle', `${Math.atan2(dy, dx)}rad`);
    parent.append(link);

    this.setManagedTimeout(() => {
      link.remove();
    }, LINK_LIFETIME_MS);

    return true;
  }

  getElementPoint(element, parent, anchor = {}) {
    const rect = element?.getBoundingClientRect?.();
    const parentRect = parent?.getBoundingClientRect?.();

    if (!rect || !parentRect || rect.width <= 0 || rect.height <= 0) {
      return null;
    }

    return {
      x: rect.left - parentRect.left + rect.width * (anchor.x ?? 0.5),
      y: rect.top - parentRect.top + rect.height * (anchor.y ?? 0.5),
    };
  }

  setManagedTimeout(callback, delay) {
    const timeoutId = window.setTimeout(() => {
      this.timeouts.delete(timeoutId);
      callback();
    }, delay);
    this.timeouts.add(timeoutId);
    return timeoutId;
  }

  prefersReducedMotion() {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  }
}
