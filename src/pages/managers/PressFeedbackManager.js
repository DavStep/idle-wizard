const PRESS_FEEDBACK_CLASS = 'is-pressing';
const SYNTHETIC_CLICK_SUPPRESSION_MS = 450;
const SYNTHETIC_CLICK_RETARGET_SUPPRESSION_PX = 32;
const PRESS_MOVE_CANCEL_PX = 12;

const PRESS_FEEDBACK_TARGET_SELECTOR = [
  'button',
  '[role="button"]',
  '.room-bottom-panel__tab',
  '.room-top-panel__username',
  '.room-top-panel__level',
  '.workshop-page__row--interactive',
  '.workshop-page__tasks-title',
  '.workshop-page__tasks-toggle',
  '.shop-page__slot-row--interactive',
  '.shop-page__slot-unlock-button',
  '.shop-page__sell-item-button',
  '.garden-page__plot-row',
  '.garden-page__seed-button',
  '.research-page__research-label-button',
].join(',');

function getElementFromEventTarget(target) {
  if (!target) {
    return null;
  }

  if (target.nodeType === 1) {
    return target;
  }

  return target.parentElement ?? null;
}

function isPressFeedbackTargetDisabled(element) {
  return (
    element.matches(':disabled') ||
    element.getAttribute('aria-disabled') === 'true' ||
    element.classList.contains('is-disabled') ||
    element.classList.contains('is-selected') ||
    element.classList.contains('is-locked')
  );
}

export class PressFeedbackManager {
  constructor({ hapticsFacade = null, uiClickSoundFacade = null } = {}) {
    this.root = null;
    this.hapticsFacade = hapticsFacade;
    this.uiClickSoundFacade = uiClickSoundFacade;
    this.pressedElement = null;
    this.pressPointerId = null;
    this.pressPointerType = '';
    this.pressStartX = 0;
    this.pressStartY = 0;
    this.pressMoved = false;
    this.pointerSoundElement = null;
    this.suppressedClickElement = null;
    this.suppressedClickUntilMs = 0;
    this.suppressedClickX = null;
    this.suppressedClickY = null;
    this.isDispatchingSyntheticClick = false;
    this.handlePointerDown = (event) => this.onPointerDown(event);
    this.handlePointerMove = (event) => this.onPointerMove(event);
    this.handlePointerUp = (event) => this.onPointerUp(event);
    this.handlePointerCancel = () => {
      this.clearPressedElement();
      this.pointerSoundElement = null;
    };
    this.handleClick = (event) => this.onClick(event);
    this.handleVisibilityChange = () => this.clearPressedElement();
  }

  mount(root) {
    if (!root) {
      throw new Error('PressFeedbackManager requires a root element.');
    }

    this.root = root;
    this.root.addEventListener('pointerdown', this.handlePointerDown);
    this.root.addEventListener('click', this.handleClick, true);
    this.root.ownerDocument.addEventListener('pointermove', this.handlePointerMove, true);
    this.root.ownerDocument.addEventListener('pointerup', this.handlePointerUp, true);
    this.root.ownerDocument.addEventListener('pointercancel', this.handlePointerCancel, true);
    this.root.ownerDocument.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.root.ownerDocument.defaultView?.addEventListener('blur', this.handlePointerCancel);
  }

  unmount() {
    this.clearPressedElement();

    if (!this.root) {
      return;
    }

    this.root.removeEventListener('pointerdown', this.handlePointerDown);
    this.root.removeEventListener('click', this.handleClick, true);
    this.root.ownerDocument.removeEventListener('pointermove', this.handlePointerMove, true);
    this.root.ownerDocument.removeEventListener('pointerup', this.handlePointerUp, true);
    this.root.ownerDocument.removeEventListener(
      'pointercancel',
      this.handlePointerCancel,
      true,
    );
    this.root.ownerDocument.removeEventListener(
      'visibilitychange',
      this.handleVisibilityChange,
    );
    this.root.ownerDocument.defaultView?.removeEventListener('blur', this.handlePointerCancel);
    this.root = null;
  }

  onPointerDown(event) {
    if (event.button > 0 || event.isPrimary === false) {
      return;
    }

    const nextElement = this.getPressTarget(event.target);
    if (nextElement === this.pressedElement) {
      return;
    }

    this.clearPressedElement();
    this.pointerSoundElement = null;
    this.pressPointerId = event.pointerId;
    this.pressPointerType = event.pointerType ?? '';
    this.pressStartX = event.clientX;
    this.pressStartY = event.clientY;
    this.pressMoved = false;
    this.pressedElement = nextElement;
    this.pressedElement?.classList.add(PRESS_FEEDBACK_CLASS);

    this.uiClickSoundFacade?.unlock?.();
    if (this.pressPointerType !== 'mouse') {
      this.playClickSound(nextElement);
      this.pointerSoundElement = nextElement;
    }
  }

  onPointerMove(event) {
    if (!this.isMatchingPointer(event) || this.pressMoved) {
      return;
    }

    const deltaX = event.clientX - this.pressStartX;
    const deltaY = event.clientY - this.pressStartY;

    if (Math.hypot(deltaX, deltaY) <= PRESS_MOVE_CANCEL_PX) {
      return;
    }

    this.pressMoved = true;
    this.pressedElement?.classList.remove(PRESS_FEEDBACK_CLASS);
    this.pointerSoundElement = null;
  }

  onPointerUp(event) {
    if (!this.isMatchingPointer(event)) {
      return;
    }

    const pressedElement = this.pressedElement;
    const shouldActivate =
      pressedElement &&
      !this.pressMoved &&
      this.pressPointerType !== 'mouse' &&
      this.getPressTargetFromPoint(event.clientX, event.clientY) === pressedElement &&
      !isPressFeedbackTargetDisabled(pressedElement);

    this.clearPressedElement();

    if (!shouldActivate) {
      this.pointerSoundElement = null;
      return;
    }

    this.hapticsFacade?.playUiTap?.();
    this.dispatchSyntheticClick(pressedElement, event);
  }

  onClick(event) {
    if (this.isDispatchingSyntheticClick) {
      this.playClickSoundForEvent(event);
      this.pointerSoundElement = null;
      return;
    }

    if (Date.now() > this.suppressedClickUntilMs) {
      this.playClickSoundForEvent(event);
      return;
    }

    if (!this.shouldSuppressClick(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.clearClickSuppression();
  }

  playClickSoundForEvent(event) {
    const target = this.getPressTarget(event.target);

    if (!target) {
      return;
    }

    this.playClickSound(target);
  }

  playClickSound(target) {
    if (!target || target === this.pointerSoundElement) {
      return;
    }

    this.uiClickSoundFacade?.playClick?.();
  }

  getPressTarget(target) {
    const element = getElementFromEventTarget(target);
    const pressTarget = element?.closest(PRESS_FEEDBACK_TARGET_SELECTOR) ?? null;

    if (
      !pressTarget ||
      !this.root?.contains(pressTarget) ||
      isPressFeedbackTargetDisabled(pressTarget)
    ) {
      return null;
    }

    return pressTarget;
  }

  getPressTargetFromPoint(clientX, clientY) {
    const document = this.root?.ownerDocument;
    return this.getPressTarget(document?.elementFromPoint?.(clientX, clientY));
  }

  shouldSuppressClick(event) {
    const targetElement = getElementFromEventTarget(event.target);

    if (
      this.suppressedClickElement &&
      targetElement &&
      (targetElement === this.suppressedClickElement ||
        this.suppressedClickElement.contains(targetElement))
    ) {
      return true;
    }

    return this.isNearSuppressedClickPoint(event);
  }

  isNearSuppressedClickPoint(event) {
    if (
      !Number.isFinite(this.suppressedClickX) ||
      !Number.isFinite(this.suppressedClickY) ||
      !Number.isFinite(event.clientX) ||
      !Number.isFinite(event.clientY)
    ) {
      return false;
    }

    return (
      Math.hypot(event.clientX - this.suppressedClickX, event.clientY - this.suppressedClickY) <=
      SYNTHETIC_CLICK_RETARGET_SUPPRESSION_PX
    );
  }

  dispatchSyntheticClick(element, event = {}) {
    this.suppressedClickElement = element;
    this.suppressedClickUntilMs = Date.now() + SYNTHETIC_CLICK_SUPPRESSION_MS;
    this.suppressedClickX = Number.isFinite(event.clientX) ? event.clientX : null;
    this.suppressedClickY = Number.isFinite(event.clientY) ? event.clientY : null;
    this.isDispatchingSyntheticClick = true;

    try {
      element.click();
    } finally {
      this.isDispatchingSyntheticClick = false;
    }
  }

  isMatchingPointer(event) {
    return this.pressedElement && event.pointerId === this.pressPointerId;
  }

  clearPressedElement() {
    this.pressedElement?.classList.remove(PRESS_FEEDBACK_CLASS);
    this.pressedElement = null;
    this.pressPointerId = null;
    this.pressPointerType = '';
    this.pressStartX = 0;
    this.pressStartY = 0;
    this.pressMoved = false;
  }

  clearClickSuppression() {
    this.suppressedClickElement = null;
    this.suppressedClickUntilMs = 0;
    this.suppressedClickX = null;
    this.suppressedClickY = null;
    this.pointerSoundElement = null;
  }
}
