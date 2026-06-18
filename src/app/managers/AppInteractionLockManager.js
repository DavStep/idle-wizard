const DEFAULT_ALLOWED_SELECTOR = [
  '.app-online-gate',
  '.app-account-link-choice',
  '.app-fresh-start-choice',
  '.app-deploy-refresh',
].join(', ');

const DEFAULT_BLOCKED_EVENT_TYPES = [
  'beforeinput',
  'change',
  'click',
  'dblclick',
  'input',
  'keydown',
  'keypress',
  'keyup',
  'pointercancel',
  'pointerdown',
  'pointermove',
  'pointerup',
  'submit',
  'touchcancel',
  'touchend',
  'touchmove',
  'touchstart',
];

export class AppInteractionLockManager {
  constructor({
    allowedSelector = DEFAULT_ALLOWED_SELECTOR,
    blockedEventTypes = DEFAULT_BLOCKED_EVENT_TYPES,
  } = {}) {
    this.allowedSelector = allowedSelector;
    this.blockedEventTypes = blockedEventTypes;
    this.stage = null;
    this.locked = false;
    this.reason = '';
    this.eventOptions = { capture: true };
    this.handleEvent = (event) => this.blockIfLocked(event);
  }

  mount(stage) {
    if (!stage) {
      throw new Error('AppInteractionLockManager requires a stage element.');
    }

    if (this.stage === stage) {
      return stage;
    }

    this.unmount();
    this.stage = stage;

    for (const eventType of this.blockedEventTypes) {
      stage.addEventListener(eventType, this.handleEvent, this.eventOptions);
    }

    return stage;
  }

  unmount() {
    if (!this.stage) {
      return;
    }

    for (const eventType of this.blockedEventTypes) {
      this.stage.removeEventListener(
        eventType,
        this.handleEvent,
        this.eventOptions,
      );
    }

    this.stage = null;
    this.locked = false;
    this.reason = '';
  }

  lock(reason = 'locked') {
    this.locked = true;
    this.reason = String(reason || 'locked');
  }

  unlock() {
    this.locked = false;
    this.reason = '';
  }

  isLocked() {
    return this.locked;
  }

  blockIfLocked(event) {
    if (!this.locked || this.isAllowedTarget(event.target)) {
      return;
    }

    if (event.cancelable) {
      event.preventDefault();
    }

    event.stopImmediatePropagation?.();
    event.stopPropagation?.();
  }

  isAllowedTarget(target) {
    return Boolean(target?.closest?.(this.allowedSelector));
  }
}
