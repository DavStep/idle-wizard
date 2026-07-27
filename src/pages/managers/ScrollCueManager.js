import {
  ROOT_RUN_STATION_CLICK_DRAG_THRESHOLD,
  ROOT_RUN_STATION_BOTTOM_MAX_OVERSCROLL,
  ROOT_RUN_STATION_SCROLLBAR_MIN_THUMB_HEIGHT,
  ROOT_RUN_STATION_SCROLLBAR_OVERSCROLL_COMPRESSION,
  ROOT_RUN_STATION_TOP_MAX_OVERSCROLL,
  ROOT_RUN_STATION_WHEEL_SCROLL_FACTOR,
  ROOT_RUN_TO_IDLE_WIZARD_SCROLL_SCALE,
  StationScrollPhysics,
} from './StationScrollPhysics.js';

const SCROLL_CUE_SELECTOR = '.style-page-scroll';

const SOURCE_LAYER_SELECTOR = [
  '.workshop-page__ui-layer',
  '.brewing-page__ui-layer',
  '.garden-page__ui-layer',
  '.shop-page__ui-layer',
  '.research-page__ui-layer',
  '.guild-page__ui-layer',
  '.prestige-page__ui-layer',
  '.room-page__popup-layer',
  '.room-top-panel-layer',
  '.room-world-chat-layer',
  '.room-player-info-popup',
  '.room-alliance-info-popup',
].join(',');

const SCROLLBAR_HOST_SELECTOR = [
  '.style-dialog',
  SOURCE_LAYER_SELECTOR,
].join(',');

const SCROLLBAR_TRACK_GAP = 5;
const SCROLLBAR_TRACK_Y = 12;
const SCROLLBAR_TRACK_WIDTH = 18;
const CLICK_SUPPRESSION_MS = 450;

export class ManagedStationScrollPane {
  constructor(element, { window: windowRef = null } = {}) {
    this.element = element;
    this.window = windowRef ?? element.ownerDocument?.defaultView ?? globalThis;
    this.document = element.ownerDocument;
    this.physics = new StationScrollPhysics();
    this.maxScrollCss = 0;
    this.activePointerId = null;
    this.activePointerType = '';
    this.draggedPastThreshold = false;
    this.suppressClickUntilMs = 0;
    this.managedScrollTop = null;
    this.animationFrame = 0;
    this.geometryFrame = 0;
    this.lastFrameTimeMs = null;
    this.topSpacer = null;
    this.topSpacerExtent = 0;
    this.bottomSpacer = null;
    this.bottomSpacerExtent = 0;
    this.overlay = null;
    this.overlayTrack = null;
    this.overlayThumb = null;
    this.overlayHost = null;
    this.resizeObserver = null;
    this.handleWheel = (event) => this.onWheel(event);
    this.handlePointerDown = (event) => this.onPointerDown(event);
    this.handlePointerMove = (event) => this.onPointerMove(event);
    this.handlePointerUp = (event) => this.onPointerUp(event);
    this.handlePointerCancel = (event) => this.onPointerCancel(event);
    this.handleClick = (event) => this.onClick(event);
    this.handleScroll = () => this.onNativeScroll();
    this.handleResize = () => this.scheduleGeometryRefresh();
    this.handleAnimationFrame = (timestamp) => this.tickAnimation(timestamp);
    this.handleGeometryFrame = () => {
      this.geometryFrame = 0;
      this.refreshGeometry();
    };
  }

  mount() {
    this.element.classList.add('style-scroll-cue');
    this.element.addEventListener('wheel', this.handleWheel, { passive: false });
    this.element.addEventListener('pointerdown', this.handlePointerDown);
    this.element.addEventListener('click', this.handleClick, true);
    this.element.addEventListener('scroll', this.handleScroll, { passive: true });
    this.document?.addEventListener('pointermove', this.handlePointerMove);
    this.document?.addEventListener('pointerup', this.handlePointerUp);
    this.document?.addEventListener('pointercancel', this.handlePointerCancel);
    this.window?.addEventListener?.('resize', this.handleResize);

    const ResizeObserverCtor = this.window?.ResizeObserver;
    if (typeof ResizeObserverCtor === 'function') {
      this.resizeObserver = new ResizeObserverCtor(this.handleResize);
      this.resizeObserver.observe(this.element);
    }

    this.mountScrollbar();
    this.refreshGeometry({ useNativeOffset: true });
  }

  destroy() {
    this.cancelAnimationFrame();
    this.cancelGeometryRefresh();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.element.removeEventListener('wheel', this.handleWheel);
    this.element.removeEventListener('pointerdown', this.handlePointerDown);
    this.element.removeEventListener('click', this.handleClick, true);
    this.element.removeEventListener('scroll', this.handleScroll);
    this.document?.removeEventListener('pointermove', this.handlePointerMove);
    this.document?.removeEventListener('pointerup', this.handlePointerUp);
    this.document?.removeEventListener('pointercancel', this.handlePointerCancel);
    this.window?.removeEventListener?.('resize', this.handleResize);
    this.clearElasticSpacers();
    this.overlay?.remove();
    this.overlay = null;
    this.overlayTrack = null;
    this.overlayThumb = null;
    this.overlayHost = null;
    this.managedScrollTop = null;
    this.element.classList.remove('style-scroll-cue');
    this.element.classList.remove(
      'has-scroll-overflow',
      'is-scroll-grabbing',
      'is-scroll-dragging',
    );
  }

  scheduleGeometryRefresh() {
    if (this.geometryFrame) {
      return;
    }

    this.geometryFrame = this.requestFrame(this.handleGeometryFrame);
  }

  cancelGeometryRefresh() {
    if (!this.geometryFrame) {
      return;
    }

    this.cancelFrame(this.geometryFrame);
    this.geometryFrame = 0;
  }

  refreshGeometry({ useNativeOffset = false } = {}) {
    const clientHeight = Math.max(0, Number(this.element.clientHeight) || 0);
    const spacerExtent = this.topSpacerExtent + this.bottomSpacerExtent;
    const contentScrollHeight = Math.max(
      clientHeight,
      (Number(this.element.scrollHeight) || 0) - spacerExtent,
    );
    this.maxScrollCss = Math.max(0, contentScrollHeight - clientHeight);
    this.physics.setMaxOffset(this.toRootRunUnits(this.maxScrollCss));

    if (useNativeOffset && this.maxScrollCss > 0) {
      this.physics.snapTo(
        this.toRootRunUnits(
          Math.max(0, Math.min(this.maxScrollCss, Number(this.element.scrollTop) || 0)),
        ),
      );
    }

    const hasOverflow = clientHeight > 0 && this.maxScrollCss > 0;
    this.element.classList.toggle('has-scroll-overflow', hasOverflow);
    if (!hasOverflow) {
      this.physics.snapTo(0);
      this.clearElasticSpacers();
      this.setManagedScrollTop(0);
    } else {
      this.applyScroll();
    }
    this.updateScrollbar();
  }

  onWheel(event) {
    if (this.maxScrollCss <= 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const localDelta = this.toLocalWheelDelta(event);
    this.physics.scrollByElastic(
      this.toRootRunUnits(localDelta) *
        ROOT_RUN_STATION_WHEEL_SCROLL_FACTOR,
    );
    this.applyScroll();
    this.startAnimation();
  }

  onPointerDown(event) {
    if (
      this.maxScrollCss <= 0 ||
      event.isPrimary === false ||
      (Number.isFinite(event.button) && event.button > 0)
    ) {
      return;
    }

    this.suppressClickUntilMs = 0;
    this.activePointerId = event.pointerId ?? 1;
    this.activePointerType = event.pointerType ?? '';
    this.draggedPastThreshold = false;
    this.physics.beginDrag(
      this.toRootRunUnits(this.toLocalPointerY(event.clientY)),
      this.now(),
    );
    this.element.classList.add('is-scroll-grabbing');
  }

  onPointerMove(event) {
    if (!this.isMatchingPointer(event)) {
      return;
    }

    this.physics.dragTo(
      this.toRootRunUnits(this.toLocalPointerY(event.clientY)),
      this.now(),
    );
    this.draggedPastThreshold =
      this.physics.dragDistance >
      ROOT_RUN_STATION_CLICK_DRAG_THRESHOLD;
    this.element.classList.toggle(
      'is-scroll-dragging',
      this.draggedPastThreshold,
    );
    if (this.draggedPastThreshold && event.cancelable) {
      event.preventDefault();
    }
    this.applyScroll();
  }

  onPointerUp(event) {
    if (!this.isMatchingPointer(event)) {
      return;
    }

    const draggedPastThreshold = this.draggedPastThreshold;
    this.physics.endDrag();
    this.activePointerId = null;
    this.activePointerType = '';
    this.draggedPastThreshold = false;
    this.element.classList.remove('is-scroll-grabbing', 'is-scroll-dragging');
    if (draggedPastThreshold) {
      this.suppressClickUntilMs = this.now() + CLICK_SUPPRESSION_MS;
    }
    this.startAnimation();
  }

  onPointerCancel(event) {
    if (!this.isMatchingPointer(event)) {
      return;
    }

    this.physics.endDrag();
    this.activePointerId = null;
    this.activePointerType = '';
    this.draggedPastThreshold = false;
    this.element.classList.remove('is-scroll-grabbing', 'is-scroll-dragging');
    this.snapInsideBounds();
  }

  onClick(event) {
    if (this.now() > this.suppressClickUntilMs) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    this.suppressClickUntilMs = 0;
  }

  onNativeScroll() {
    if (this.topSpacer || this.bottomSpacer || this.physics.isDragging) {
      return;
    }

    const nativeOffset = Math.max(
      0,
      Math.min(this.maxScrollCss, Number(this.element.scrollTop) || 0),
    );
    if (
      this.managedScrollTop !== null &&
      Math.abs(nativeOffset - this.managedScrollTop) <= 0.5
    ) {
      this.updateScrollbar();
      return;
    }

    this.managedScrollTop = null;
    this.physics.snapTo(this.toRootRunUnits(nativeOffset));
    this.updateScrollbar();
  }

  tickAnimation(timestamp) {
    this.animationFrame = 0;
    const deltaSeconds =
      this.lastFrameTimeMs === null
        ? 1 / 60
        : Math.max(0, (timestamp - this.lastFrameTimeMs) / 1000);
    this.lastFrameTimeMs = timestamp;
    const moved = this.physics.update(deltaSeconds);
    if (moved) {
      this.applyScroll();
    }

    if (this.physics.isAnimating) {
      this.animationFrame = this.requestFrame(this.handleAnimationFrame);
      return;
    }

    this.lastFrameTimeMs = null;
    this.clearElasticSpacersIfSettled();
    this.updateScrollbar();
  }

  startAnimation() {
    if (this.animationFrame || this.physics.isDragging) {
      return;
    }

    this.lastFrameTimeMs = null;
    this.animationFrame = this.requestFrame(this.handleAnimationFrame);
  }

  cancelAnimationFrame() {
    if (!this.animationFrame) {
      return;
    }

    this.cancelFrame(this.animationFrame);
    this.animationFrame = 0;
    this.lastFrameTimeMs = null;
  }

  applyScroll() {
    const rawOffset = this.toIdleWizardUnits(this.physics.offset);
    const clampedOffset = Math.max(0, Math.min(this.maxScrollCss, rawOffset));

    if (rawOffset < 0) {
      this.removeBottomSpacer();
      this.ensureTopSpacer();
      this.setManagedScrollTop(Math.max(
        0,
        this.topSpacerExtent + rawOffset,
      ));
    } else if (rawOffset > this.maxScrollCss) {
      this.removeTopSpacer();
      this.ensureBottomSpacer();
      this.setManagedScrollTop(rawOffset);
    } else {
      this.clearElasticSpacers();
      this.setManagedScrollTop(clampedOffset);
    }

    this.updateScrollbar();
  }

  snapInsideBounds() {
    this.physics.snapTo(
      Math.max(
        0,
        Math.min(
          this.toRootRunUnits(this.maxScrollCss),
          this.physics.offset,
        ),
      ),
    );
    this.cancelAnimationFrame();
    this.applyScroll();
  }

  ensureTopSpacer() {
    if (this.topSpacer?.isConnected) {
      return;
    }

    const beforeHeight = Number(this.element.scrollHeight) || 0;
    this.topSpacer = this.createSpacer(
      'top',
      this.toIdleWizardUnits(ROOT_RUN_STATION_TOP_MAX_OVERSCROLL),
    );
    this.element.prepend(this.topSpacer);
    const afterHeight = Number(this.element.scrollHeight) || 0;
    this.topSpacerExtent = Math.max(
      Number.parseFloat(this.topSpacer.style.height) || 0,
      afterHeight - beforeHeight,
    );
  }

  ensureBottomSpacer() {
    if (this.bottomSpacer?.isConnected) {
      return;
    }

    const beforeHeight = Number(this.element.scrollHeight) || 0;
    this.bottomSpacer = this.createSpacer(
      'bottom',
      this.toIdleWizardUnits(ROOT_RUN_STATION_BOTTOM_MAX_OVERSCROLL),
    );
    this.element.append(this.bottomSpacer);
    const afterHeight = Number(this.element.scrollHeight) || 0;
    this.bottomSpacerExtent = Math.max(
      Number.parseFloat(this.bottomSpacer.style.height) || 0,
      afterHeight - beforeHeight,
    );
  }

  createSpacer(edge, height) {
    const spacer = this.document.createElement('div');
    spacer.className = 'style-station-scrollbar__elastic-spacer';
    spacer.dataset.scrollElasticEdge = edge;
    spacer.setAttribute('aria-hidden', 'true');
    spacer.style.height = `${height}px`;
    spacer.style.flexBasis = `${height}px`;
    return spacer;
  }

  removeTopSpacer() {
    this.topSpacer?.remove();
    this.topSpacer = null;
    this.topSpacerExtent = 0;
  }

  removeBottomSpacer() {
    this.bottomSpacer?.remove();
    this.bottomSpacer = null;
    this.bottomSpacerExtent = 0;
  }

  clearElasticSpacers() {
    this.removeTopSpacer();
    this.removeBottomSpacer();
  }

  clearElasticSpacersIfSettled() {
    if (!this.isOutsideBounds()) {
      this.clearElasticSpacers();
      this.setManagedScrollTop(Math.max(
        0,
        Math.min(this.maxScrollCss, this.toIdleWizardUnits(this.physics.offset)),
      ));
    }
  }

  setManagedScrollTop(offset) {
    const nextOffset = Math.max(0, Number(offset) || 0);
    this.managedScrollTop = nextOffset;
    this.element.scrollTop = nextOffset;
    this.managedScrollTop = Math.max(
      0,
      Number(this.element.scrollTop) || 0,
    );
  }

  mountScrollbar() {
    const overlay = this.document.createElement('div');
    const track = this.document.createElement('div');
    const thumb = this.document.createElement('div');
    overlay.className = 'style-station-scrollbar';
    track.className = 'style-station-scrollbar__track';
    thumb.className = 'style-station-scrollbar__thumb';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.hidden = true;
    overlay.append(track, thumb);

    this.overlayHost =
      this.element.closest(SCROLLBAR_HOST_SELECTOR) ?? this.document.body;
    if (this.overlayHost === this.document.body) {
      overlay.classList.add('style-station-scrollbar--viewport');
    }
    this.overlayHost.append(overlay);
    this.overlay = overlay;
    this.overlayTrack = track;
    this.overlayThumb = thumb;
  }

  updateScrollbar() {
    if (!this.overlay || !this.overlayThumb) {
      return;
    }

    const clientHeight = Math.max(0, Number(this.element.clientHeight) || 0);
    const elementRect = this.element.getBoundingClientRect?.();
    const visible =
      this.maxScrollCss > 0 &&
      clientHeight > 0 &&
      elementRect &&
      elementRect.width > 0 &&
      elementRect.height > 0 &&
      this.element.getClientRects?.().length !== 0;
    this.overlay.hidden = !visible;
    if (!visible) {
      return;
    }

    this.positionScrollbar(elementRect);
    const trackY = this.toIdleWizardUnits(SCROLLBAR_TRACK_Y);
    const trackWidth = this.toIdleWizardUnits(SCROLLBAR_TRACK_WIDTH);
    const trackHeight = clientHeight - trackY * 2;
    const contentHeight = clientHeight + this.maxScrollCss;
    const baseThumbHeight = Math.max(
      this.toIdleWizardUnits(
        ROOT_RUN_STATION_SCROLLBAR_MIN_THUMB_HEIGHT,
      ),
      (trackHeight * clientHeight) / contentHeight,
    );
    const rawOffset = this.toIdleWizardUnits(this.physics.offset);
    const overscrollTop = Math.max(0, -rawOffset);
    const overscrollBottom = Math.max(0, rawOffset - this.maxScrollCss);
    const compression = Math.min(
      baseThumbHeight - trackWidth * 2,
      Math.max(overscrollTop, overscrollBottom) *
        ROOT_RUN_STATION_SCROLLBAR_OVERSCROLL_COMPRESSION,
    );
    const thumbHeight = baseThumbHeight - compression;
    const thumbTravel = trackHeight - baseThumbHeight;
    const clampedOffset = Math.max(
      0,
      Math.min(this.maxScrollCss, rawOffset),
    );
    let thumbY =
      trackY + (thumbTravel * clampedOffset) / this.maxScrollCss;
    if (overscrollBottom > 0) {
      thumbY = trackY + trackHeight - thumbHeight;
    }
    this.overlayThumb.style.top = `${thumbY}px`;
    this.overlayThumb.style.height = `${thumbHeight}px`;
  }

  positionScrollbar(elementRect) {
    const hostRect = this.overlayHost?.getBoundingClientRect?.();
    const hostWidth =
      Number(this.overlayHost?.offsetWidth) ||
      Number(this.overlayHost?.clientWidth) ||
      0;
    const hostHeight =
      Number(this.overlayHost?.offsetHeight) ||
      Number(this.overlayHost?.clientHeight) ||
      0;
    const trackGap = this.toIdleWizardUnits(SCROLLBAR_TRACK_GAP);

    if (
      this.overlayHost !== this.document.body &&
      hostRect?.width > 0 &&
      hostRect?.height > 0 &&
      hostWidth > 0 &&
      hostHeight > 0
    ) {
      const scaleX = hostRect.width / hostWidth;
      const scaleY = hostRect.height / hostHeight;
      const hostOriginX =
        hostRect.left + (Number(this.overlayHost?.clientLeft) || 0) * scaleX;
      const hostOriginY =
        hostRect.top + (Number(this.overlayHost?.clientTop) || 0) * scaleY;
      this.overlay.classList.remove('style-station-scrollbar--viewport');
      this.overlay.style.left = `${
        (elementRect.right - hostOriginX) / scaleX + trackGap
      }px`;
      this.overlay.style.top = `${(elementRect.top - hostOriginY) / scaleY}px`;
      this.overlay.style.height = `${elementRect.height / scaleY}px`;
      this.overlay.style.transform = '';
      return;
    }

    const elementScale = this.getVisualScale();
    this.overlay.classList.add('style-station-scrollbar--viewport');
    this.overlay.style.left = `${elementRect.right + trackGap * elementScale}px`;
    this.overlay.style.top = `${elementRect.top}px`;
    this.overlay.style.height = `${elementRect.height / elementScale}px`;
    this.overlay.style.transform = `scale(${elementScale})`;
  }

  toLocalWheelDelta(event) {
    let delta = Number(event.deltaY) || 0;
    if (event.deltaMode === 1) {
      delta *= 16;
    } else if (event.deltaMode === 2) {
      delta *= Math.max(1, Number(this.element.clientHeight) || 1);
    }
    return delta / this.getVisualScale();
  }

  toLocalPointerY(clientY) {
    const rect = this.element.getBoundingClientRect();
    return (clientY - rect.top) / this.getVisualScale();
  }

  getVisualScale() {
    const rect = this.element.getBoundingClientRect?.();
    const clientHeight = Number(this.element.clientHeight) || 0;
    if (rect?.height > 0 && clientHeight > 0) {
      return rect.height / clientHeight;
    }
    return 1;
  }

  isMatchingPointer(event) {
    return (
      this.activePointerId !== null &&
      (event.pointerId ?? 1) === this.activePointerId
    );
  }

  isOutsideBounds() {
    return (
      this.physics.offset < 0 ||
      this.physics.offset > this.toRootRunUnits(this.maxScrollCss)
    );
  }

  now() {
    return this.window?.performance?.now?.() ?? Date.now();
  }

  requestFrame(callback) {
    const request =
      this.window?.requestAnimationFrame ?? globalThis.requestAnimationFrame;
    if (typeof request === 'function') {
      return request.call(this.window, callback);
    }
    return this.window?.setTimeout?.(() => callback(this.now()), 16) ?? 0;
  }

  cancelFrame(frame) {
    const cancel =
      this.window?.cancelAnimationFrame ?? globalThis.cancelAnimationFrame;
    if (typeof cancel === 'function') {
      cancel.call(this.window, frame);
      return;
    }
    this.window?.clearTimeout?.(frame);
  }

  toRootRunUnits(value) {
    return value / ROOT_RUN_TO_IDLE_WIZARD_SCROLL_SCALE;
  }

  toIdleWizardUnits(value) {
    return value * ROOT_RUN_TO_IDLE_WIZARD_SCROLL_SCALE;
  }
}

export class ScrollCueManager {
  constructor({ selector = SCROLL_CUE_SELECTOR } = {}) {
    this.selector = selector;
    this.root = null;
    this.window = null;
    this.observer = null;
    this.cues = new Map();
    this.scanFrame = 0;
    this.handleMutation = (mutations) => this.handleMutations(mutations);
  }

  mount(root) {
    if (!root || this.root) {
      return;
    }

    this.root = root;
    this.window = root.ownerDocument?.defaultView ?? globalThis;

    const MutationObserverCtor = this.window?.MutationObserver;

    if (typeof MutationObserverCtor === 'function') {
      this.observer = new MutationObserverCtor(this.handleMutation);
      this.observer.observe(root, {
        attributes: true,
        attributeFilter: ['class'],
        childList: true,
        subtree: true,
      });
    }

    this.scan();
  }

  unmount() {
    this.cancelScheduledScan();
    this.observer?.disconnect();
    this.observer = null;
    this.window = null;

    for (const cue of this.cues.values()) {
      cue.destroy();
    }

    this.cues.clear();
    this.root = null;
  }

  scheduleScan() {
    if (this.scanFrame) {
      return;
    }

    if (typeof requestAnimationFrame === 'function') {
      this.scanFrame = requestAnimationFrame(() => {
        this.scanFrame = 0;
        this.scan();
      });
      return;
    }

    this.scan();
  }

  cancelScheduledScan() {
    if (!this.scanFrame || typeof cancelAnimationFrame !== 'function') {
      this.scanFrame = 0;
      return;
    }

    cancelAnimationFrame(this.scanFrame);
    this.scanFrame = 0;
  }

  handleMutations(mutations = []) {
    let shouldScan = false;

    for (const mutation of mutations) {
      if (
        mutation.type === 'childList' &&
        !this.mutationOnlyChangesElasticSpacers(mutation)
      ) {
        this.findContainingCue(mutation.target)?.scheduleGeometryRefresh();
      }

      if (this.mutationMayChangeCueRegistration(mutation)) {
        shouldScan = true;
      }
    }

    if (shouldScan) {
      this.scheduleScan();
    }
  }

  mutationMayChangeCueRegistration(mutation) {
    if (mutation.type === 'attributes') {
      return mutation.attributeName === 'class';
    }

    if (mutation.type !== 'childList') {
      return false;
    }

    return [...mutation.addedNodes, ...mutation.removedNodes].some((node) =>
      this.elementMatchesOrContainsCue(node),
    );
  }

  mutationOnlyChangesElasticSpacers(mutation) {
    const changedNodes = [...mutation.addedNodes, ...mutation.removedNodes];
    return (
      changedNodes.length > 0 &&
      changedNodes.every((node) =>
        node?.classList?.contains('style-station-scrollbar__elastic-spacer'),
      )
    );
  }

  findContainingCue(node) {
    let element = this.isElement(node) ? node : node?.parentElement;

    while (element && element !== this.root) {
      const cue = this.cues.get(element);
      if (cue) {
        return cue;
      }
      element = element.parentElement;
    }

    return this.cues.get(this.root) ?? null;
  }

  elementMatchesOrContainsCue(node) {
    if (!this.isElement(node)) {
      return false;
    }

    return node.matches?.(this.selector) || Boolean(node.querySelector?.(this.selector));
  }

  isElement(node) {
    return node?.nodeType === 1;
  }

  scan() {
    if (!this.root) {
      return;
    }

    this.removeDetachedCues();

    for (const element of this.root.querySelectorAll(this.selector)) {
      this.ensureCue(element);
    }
  }

  ensureCue(element) {
    if (this.cues.has(element)) {
      return;
    }

    const cue = new ManagedStationScrollPane(element, {
      window: this.window,
    });
    this.cues.set(element, cue);
    cue.mount();
  }

  removeDetachedCues() {
    for (const [element, cue] of this.cues) {
      if (this.root.contains(element) && element.matches(this.selector)) {
        continue;
      }

      cue.destroy();
      this.cues.delete(element);
    }
  }
}
