const VIEWPORT_ZOOM_GUARD_EVENTS = [
  'touchstart',
  'touchmove',
  'gesturestart',
  'gesturechange',
  'gestureend',
  'wheel',
];

const VIEWPORT_ZOOM_GUARD_OPTIONS = { capture: true, passive: false };

export class ViewportManager {
  constructor({ viewport }) {
    this.viewport = viewport;
    this.stage = null;
    this.controlRevealTimeout = null;
    this.zoomGuardTarget = null;
    this.handleViewportZoomDefault = (event) => this.preventNativeViewportZoom(event);
  }

  mount(parent) {
    if (!parent) {
      throw new Error('ViewportManager requires a parent element.');
    }

    if (this.stage) {
      return this.stage;
    }

    this.stage = document.createElement('section');
    this.stage.className = 'game-stage is-control-revealing';
    this.stage.setAttribute('aria-label', 'Idle Wizard game surface');
    this.stage.style.setProperty('--design-width', String(this.viewport.width));
    this.stage.style.setProperty('--design-height', String(this.viewport.height));
    parent.append(this.stage);
    this.lockViewportZoom(this.stage.ownerDocument);
    this.scheduleControlRevealEnd(parent);

    return this.stage;
  }

  unmount() {
    this.clearControlRevealTimeout();
    this.unlockViewportZoom();
    this.stage?.remove();
    this.stage = null;
  }

  getStageElement() {
    return this.stage;
  }

  scheduleControlRevealEnd(parent) {
    const view = parent?.ownerDocument?.defaultView ?? globalThis.window;

    if (typeof view?.setTimeout !== 'function') {
      this.stage?.classList.remove('is-control-revealing');
      return;
    }

    this.clearControlRevealTimeout();
    this.controlRevealTimeout = view.setTimeout(() => {
      this.controlRevealTimeout = null;
      this.stage?.classList.remove('is-control-revealing');
    }, 720);
  }

  clearControlRevealTimeout() {
    if (!this.controlRevealTimeout) {
      return;
    }

    const view = this.stage?.ownerDocument?.defaultView ?? globalThis.window;
    view?.clearTimeout?.(this.controlRevealTimeout);
    this.controlRevealTimeout = null;
  }

  lockViewportZoom(target = globalThis.document) {
    if (!target?.addEventListener || this.zoomGuardTarget === target) {
      return;
    }

    this.unlockViewportZoom();
    this.zoomGuardTarget = target;

    for (const eventName of VIEWPORT_ZOOM_GUARD_EVENTS) {
      target.addEventListener(
        eventName,
        this.handleViewportZoomDefault,
        VIEWPORT_ZOOM_GUARD_OPTIONS,
      );
    }
  }

  unlockViewportZoom() {
    if (!this.zoomGuardTarget?.removeEventListener) {
      this.zoomGuardTarget = null;
      return;
    }

    for (const eventName of VIEWPORT_ZOOM_GUARD_EVENTS) {
      this.zoomGuardTarget.removeEventListener(
        eventName,
        this.handleViewportZoomDefault,
        VIEWPORT_ZOOM_GUARD_OPTIONS,
      );
    }

    this.zoomGuardTarget = null;
  }

  preventNativeViewportZoom(event) {
    if (!this.isNativeViewportZoomEvent(event)) {
      return;
    }

    if (event.cancelable !== false) {
      event.preventDefault();
    }
  }

  isNativeViewportZoomEvent(event) {
    if (!event?.type) {
      return false;
    }

    if (event.type === 'wheel') {
      return Boolean(event.ctrlKey || event.metaKey);
    }

    if (event.type.startsWith('touch')) {
      const touchCount = event.touches?.length ?? event.targetTouches?.length ?? 0;
      return touchCount >= 2;
    }

    return event.type.startsWith('gesture');
  }
}
