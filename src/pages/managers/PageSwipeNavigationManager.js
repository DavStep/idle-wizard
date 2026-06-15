export const DEFAULT_PAGE_SWIPE_ORDER = [
  'brewing',
  'garden',
  'workshop',
  'research',
  'shop',
];

const BLOCKED_TARGET_SELECTOR = [
  'input',
  'textarea',
  'select',
  '[contenteditable="true"]',
  '[draggable="true"]',
  '.style-dialog',
].join(',');

const OPEN_POPUP_SELECTOR = [
  '.workshop-page__bag-popup:not([hidden])',
  '.workshop-page__prestige-popup:not([hidden])',
  '.workshop-page__leaderboard-popup:not([hidden])',
  '.workshop-page__world-chat-popup:not([hidden])',
  '.brewing-page__recipes-popup:not([hidden])',
  '.brewing-page__potions-popup:not([hidden])',
  '.garden-page__seed-popup:not([hidden])',
  '.garden-page__cancel-popup:not([hidden])',
  '.research-page__info-popup:not([hidden])',
  '.shop-page__sell-popup:not([hidden])',
  '.shop-page__market-popup:not([hidden])',
  '.shop-page__request-popup:not([hidden])',
  '.shop-page__crystal-support-popup:not([hidden])',
  '.room-bottom-panel__lock-popup:not([hidden])',
  '.room-top-panel__settings:not([hidden])',
].join(',');

export class PageSwipeNavigationManager {
  constructor({
    pageOrder = DEFAULT_PAGE_SWIPE_ORDER,
    getCurrentPageId,
    onShowPage,
    swipeThresholdPx = 48,
    axisLockPx = 12,
  } = {}) {
    this.pageOrder = pageOrder;
    this.getCurrentPageId = getCurrentPageId;
    this.onShowPage = onShowPage;
    this.swipeThresholdPx = swipeThresholdPx;
    this.axisLockPx = axisLockPx;
    this.stage = null;
    this.gesture = null;
    this.suppressClickUntilMs = 0;

    this.handlePointerDown = (event) => this.onPointerDown(event);
    this.handlePointerMove = (event) => this.onPointerMove(event);
    this.handlePointerUp = (event) => this.onPointerUp(event);
    this.handlePointerCancel = () => this.resetGesture();
    this.handleTouchStart = (event) => this.onTouchStart(event);
    this.handleTouchMove = (event) => this.onTouchMove(event);
    this.handleTouchEnd = (event) => this.onTouchEnd(event);
    this.handleTouchCancel = () => this.resetGesture();
    this.handleClick = (event) => this.onClick(event);
  }

  mount(stage) {
    if (this.stage) {
      return;
    }

    this.stage = stage;
    this.stage.addEventListener('pointerdown', this.handlePointerDown, true);
    this.stage.addEventListener('pointermove', this.handlePointerMove, true);
    this.stage.addEventListener('pointerup', this.handlePointerUp, true);
    this.stage.addEventListener('pointercancel', this.handlePointerCancel, true);
    this.stage.addEventListener('touchstart', this.handleTouchStart, {
      capture: true,
      passive: true,
    });
    this.stage.addEventListener('touchmove', this.handleTouchMove, {
      capture: true,
      passive: false,
    });
    this.stage.addEventListener('touchend', this.handleTouchEnd, true);
    this.stage.addEventListener('touchcancel', this.handleTouchCancel, true);
    this.stage.addEventListener('click', this.handleClick, true);
  }

  unmount() {
    if (!this.stage) {
      return;
    }

    this.stage.removeEventListener('pointerdown', this.handlePointerDown, true);
    this.stage.removeEventListener('pointermove', this.handlePointerMove, true);
    this.stage.removeEventListener('pointerup', this.handlePointerUp, true);
    this.stage.removeEventListener('pointercancel', this.handlePointerCancel, true);
    this.stage.removeEventListener('touchstart', this.handleTouchStart, true);
    this.stage.removeEventListener('touchmove', this.handleTouchMove, true);
    this.stage.removeEventListener('touchend', this.handleTouchEnd, true);
    this.stage.removeEventListener('touchcancel', this.handleTouchCancel, true);
    this.stage.removeEventListener('click', this.handleClick, true);
    this.stage = null;
    this.resetGesture();
  }

  setPageOrder(pageOrder = []) {
    if (!Array.isArray(pageOrder) || pageOrder.length <= 0) {
      return;
    }

    this.pageOrder = pageOrder.filter((pageId) => typeof pageId === 'string');
    this.resetGesture();
  }

  onPointerDown(event) {
    if ((event.pointerType && event.pointerType !== 'touch') || event.isPrimary === false) {
      return;
    }

    this.clearClickSuppression();

    if (this.shouldUseTouchEventsForTouchPointers()) {
      return;
    }

    this.startGesture(event, {
      id: event.pointerId,
      source: 'pointer',
      target: event.target,
    });
  }

  onPointerMove(event) {
    if (!this.isMatchingPointer(event)) {
      return;
    }

    this.moveGesture(event);
  }

  onPointerUp(event) {
    if (!this.isMatchingPointer(event)) {
      return;
    }

    this.finishGesture(event);
  }

  onTouchStart(event) {
    const touch = event.touches?.[0];

    if (!touch) {
      return;
    }

    this.clearClickSuppression();

    this.startGesture(touch, {
      id: touch.identifier,
      source: 'touch',
      target: event.target,
    });
  }

  onTouchMove(event) {
    const touch = this.findTouch(event.touches);

    if (!touch) {
      return;
    }

    this.moveGesture(touch, event);
  }

  onTouchEnd(event) {
    const touch = this.findTouch(event.changedTouches);

    if (!touch) {
      this.resetGesture();
      return;
    }

    this.finishGesture(touch, event);
  }

  onClick(event) {
    if (Date.now() > this.suppressClickUntilMs) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
  }

  startGesture(point, { id, source, target }) {
    if (this.shouldIgnoreGestureTarget(target) || this.hasOpenPopup()) {
      this.resetGesture();
      return;
    }

    this.gesture = {
      id,
      source,
      startX: point.clientX,
      startY: point.clientY,
      lastX: point.clientX,
      lastY: point.clientY,
      isHorizontal: false,
    };
  }

  moveGesture(point, originalEvent = point) {
    if (!this.gesture) {
      return;
    }

    this.gesture.lastX = point.clientX;
    this.gesture.lastY = point.clientY;

    const absX = Math.abs(this.gesture.lastX - this.gesture.startX);
    const absY = Math.abs(this.gesture.lastY - this.gesture.startY);

    if (!this.gesture.isHorizontal && absX >= this.axisLockPx && absX > absY) {
      this.gesture.isHorizontal = true;
    }

    if (this.gesture.isHorizontal && originalEvent.cancelable) {
      originalEvent.preventDefault();
      originalEvent.stopPropagation?.();
    }
  }

  finishGesture(point, originalEvent = point) {
    if (!this.gesture) {
      return;
    }

    const deltaX = point.clientX - this.gesture.startX;
    const deltaY = point.clientY - this.gesture.startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX >= this.getSwipeThreshold() && absX > absY * 1.4) {
      if (originalEvent.cancelable) {
        originalEvent.preventDefault();
      }

      originalEvent.stopPropagation?.();
      this.suppressClickUntilMs = Date.now() + 450;
      this.showAdjacentPage(deltaX < 0 ? 1 : -1);
    }

    this.resetGesture();
  }

  showAdjacentPage(offset) {
    const currentPageId = this.getCurrentPageId?.();
    const currentIndex = this.pageOrder.indexOf(currentPageId);

    if (currentIndex === -1) {
      return;
    }

    const nextPageId = this.pageOrder[currentIndex + offset];

    if (!nextPageId) {
      return;
    }

    this.onShowPage?.(nextPageId);
  }

  getSwipeThreshold() {
    const stageWidth = this.stage?.clientWidth || 0;
    return Math.max(this.swipeThresholdPx, Math.min(96, stageWidth * 0.14));
  }

  isMatchingPointer(event) {
    return (
      this.gesture &&
      this.gesture.source === 'pointer' &&
      ((event.pointerId === undefined && this.gesture.id === undefined) ||
        event.pointerId === this.gesture.id)
    );
  }

  findTouch(touches) {
    if (!this.gesture || this.gesture.source !== 'touch' || !touches) {
      return null;
    }

    return Array.from(touches).find((touch) => touch.identifier === this.gesture.id) || null;
  }

  shouldIgnoreGestureTarget(target) {
    return Boolean(target?.closest?.(BLOCKED_TARGET_SELECTOR));
  }

  hasOpenPopup() {
    return Boolean(this.stage?.querySelector(OPEN_POPUP_SELECTOR));
  }

  shouldUseTouchEventsForTouchPointers() {
    return typeof window.TouchEvent === 'function';
  }

  resetGesture() {
    this.gesture = null;
  }

  clearClickSuppression() {
    this.suppressClickUntilMs = 0;
  }
}
