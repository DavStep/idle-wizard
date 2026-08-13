import { UI_HELD_RELEASE_HAPTIC_MS } from '../../../app/haptics/hapticTiming.js';
import {
  InputRegistrationStore,
  isInputRegistrationAvailable,
  resolveRegistrationBoolean,
} from './InputRegistrationStore.js';
import {
  clamp,
  finiteNumber,
  inputDelta,
  isDisplayObjectDescendant,
  pointCenter,
  pointDistance,
  pointInDisplayObject,
  preventInputDefault,
  resolveInputPoint,
} from './InputGeometry.js';

export const PIXI_INPUT_DEFAULTS = Object.freeze({
  touchPressSlop: 22,
  mousePressSlop: 12,
  gestureLock: 10,
  axisLockRatio: 1.25,
  swipeCommitRatio: 1.15,
  swipeThreshold: 48,
  dragThreshold: 12,
});

const ROOT_EVENT_NAMES = Object.freeze([
  'pointerdown',
  'globalpointermove',
  'pointerup',
  'pointerupoutside',
  'pointercancel',
  'clickcapture',
  'pointertapcapture',
  'wheel',
]);

const CANVAS_EVENT_NAMES = Object.freeze([
  'keydown',
  'copy',
  'cut',
  'paste',
]);

/**
 * One retained input boundary for all production Pixi UI. Registrations are
 * mutable data; the root/canvas event handler sets are mounted only once.
 */
export class PixiInputRouter {
  constructor({
    hapticsFacade = null,
    uiClickSoundFacade = null,
    touchPressSlop = PIXI_INPUT_DEFAULTS.touchPressSlop,
    mousePressSlop = PIXI_INPUT_DEFAULTS.mousePressSlop,
    gestureLock = PIXI_INPUT_DEFAULTS.gestureLock,
    axisLockRatio = PIXI_INPUT_DEFAULTS.axisLockRatio,
    swipeCommitRatio = PIXI_INPUT_DEFAULTS.swipeCommitRatio,
    swipeThreshold = PIXI_INPUT_DEFAULTS.swipeThreshold,
    dragThreshold = PIXI_INPUT_DEFAULTS.dragThreshold,
    heldReleaseHapticMs = UI_HELD_RELEASE_HAPTIC_MS,
    now = defaultNow,
  } = {}) {
    this.hapticsFacade = hapticsFacade;
    this.uiClickSoundFacade = uiClickSoundFacade;
    this.touchPressSlop = positiveOr(touchPressSlop, 22);
    this.mousePressSlop = positiveOr(mousePressSlop, 12);
    this.gestureLock = positiveOr(gestureLock, 10);
    this.axisLockRatio = positiveOr(axisLockRatio, 1.25);
    this.swipeCommitRatio = positiveOr(swipeCommitRatio, 1.15);
    this.swipeThreshold = positiveOr(swipeThreshold, 48);
    this.dragThreshold = positiveOr(dragThreshold, 12);
    this.heldReleaseHapticMs = positiveOr(
      heldReleaseHapticMs,
      UI_HELD_RELEASE_HAPTIC_MS,
    );
    this.now = now;

    this.store = new InputRegistrationStore();
    this.root = null;
    this.canvas = null;
    this.mounted = false;
    this.pointers = new Map();
    this.activePinch = null;
    this.modals = [];
    this.focusedId = null;
    this.backHandler = null;
    this.escapeHandler = null;
    this.nextGeneratedRegistrationId = 1;
    this.nextModalOrder = 1;
    this.originalCanvasTabIndex = null;
    this.canvasHadTabIndex = false;

    this.rootHandlers = Object.freeze({
      pointerdown: (event) => this.onPointerDown(event),
      globalpointermove: (event) => this.onPointerMove(event),
      pointerup: (event) => this.onPointerUp(event),
      pointerupoutside: (event) => this.onPointerUp(event),
      pointercancel: (event) => this.onPointerCancel(event),
      clickcapture: (event) => this.onNativeActivation(event),
      pointertapcapture: (event) => this.onNativeActivation(event),
      wheel: (event) => this.onWheel(event),
    });
    this.canvasHandlers = Object.freeze({
      keydown: (event) => this.onKeyDown(event),
      copy: (event) => this.onClipboard(event, 'copy'),
      cut: (event) => this.onClipboard(event, 'cut'),
      paste: (event) => this.onClipboard(event, 'paste'),
    });
  }

  mount({ root, canvas } = {}) {
    if (!root?.on || !root?.off) {
      throw new Error('PixiInputRouter requires a Pixi root event target.');
    }

    if (!canvas?.addEventListener || !canvas?.removeEventListener) {
      throw new Error('PixiInputRouter requires the existing game canvas.');
    }

    if (this.mounted && this.root === root && this.canvas === canvas) {
      return this;
    }

    if (this.mounted) {
      this.unmount();
    }

    this.root = root;
    this.canvas = canvas;

    for (const eventName of ROOT_EVENT_NAMES) {
      this.root.on(eventName, this.rootHandlers[eventName]);
    }

    for (const eventName of CANVAS_EVENT_NAMES) {
      this.canvas.addEventListener(eventName, this.canvasHandlers[eventName]);
    }

    this.canvasHadTabIndex = this.canvas.hasAttribute?.('tabindex') ?? false;
    this.originalCanvasTabIndex =
      this.canvas.getAttribute?.('tabindex') ?? null;
    this.canvas.tabIndex = 0;
    this.mounted = true;
    return this;
  }

  unmount() {
    if (!this.mounted) {
      return;
    }

    for (const eventName of ROOT_EVENT_NAMES) {
      this.root.off(eventName, this.rootHandlers[eventName]);
    }

    for (const eventName of CANVAS_EVENT_NAMES) {
      this.canvas.removeEventListener(
        eventName,
        this.canvasHandlers[eventName],
      );
    }

    if (this.canvasHadTabIndex) {
      this.canvas.setAttribute?.('tabindex', this.originalCanvasTabIndex);
    } else {
      this.canvas.removeAttribute?.('tabindex');
    }

    this.cancelAllPointers('unmount');
    this.blurFocus();
    this.root = null;
    this.canvas = null;
    this.mounted = false;
  }

  destroy() {
    this.unmount();
    this.modals.length = 0;
    this.store.clear();
    this.backHandler = null;
    this.escapeHandler = null;
  }

  registerPressTarget(displayObjectOrDescriptor, descriptor = null) {
    return this.register(
      'press',
      this.normalizeRegistrationDescriptor(
        'press',
        displayObjectOrDescriptor,
        descriptor,
      ),
    );
  }

  registerScrollRegion(displayObjectOrDescriptor, descriptor = null) {
    return this.register(
      'scroll',
      this.normalizeRegistrationDescriptor(
        'scroll',
        displayObjectOrDescriptor,
        descriptor,
      ),
    );
  }

  registerDragSource(displayObjectOrDescriptor, descriptor = null) {
    return this.register(
      'drag',
      this.normalizeRegistrationDescriptor(
        'drag',
        displayObjectOrDescriptor,
        descriptor,
      ),
    );
  }

  registerDropTarget(displayObjectOrDescriptor, descriptor = null) {
    return this.register(
      'drop',
      this.normalizeRegistrationDescriptor(
        'drop',
        displayObjectOrDescriptor,
        descriptor,
      ),
    );
  }

  registerPanSurface(displayObjectOrDescriptor, descriptor = null) {
    return this.register('pan', {
      excludePageSwipe: true,
      ...this.normalizeRegistrationDescriptor(
        'pan',
        displayObjectOrDescriptor,
        descriptor,
      ),
    });
  }

  registerPinchSurface(displayObjectOrDescriptor, descriptor = null) {
    return this.register('pinch', {
      excludePageSwipe: true,
      ...this.normalizeRegistrationDescriptor(
        'pinch',
        displayObjectOrDescriptor,
        descriptor,
      ),
    });
  }

  registerPageSwipe(displayObjectOrDescriptor, descriptor = null) {
    return this.register(
      'swipe',
      this.normalizeRegistrationDescriptor(
        'swipe',
        displayObjectOrDescriptor,
        descriptor,
      ),
    );
  }

  /**
   * Compatibility entry point for retained primitives. New feature code should
   * prefer the explicit registerScrollRegion/registerDragSource/etc methods.
   */
  registerGestureSurface(displayObjectOrDescriptor, descriptor = null) {
    const normalized = this.normalizeRegistrationDescriptor(
      descriptor?.kind ?? displayObjectOrDescriptor?.kind ?? 'pan',
      displayObjectOrDescriptor,
      descriptor,
    );
    const kind = normalized.kind ?? 'pan';
    delete normalized.kind;

    if (kind === 'scroll') {
      const displayObject = normalized.displayObject;
      return this.registerScrollRegion({
        ...normalized,
        getOffset:
          normalized.getOffset ??
          (() => Number(displayObject?.scrollY) || 0),
        getMaxOffset:
          normalized.getMaxOffset ??
          (() => Number(displayObject?.maxScrollY) || 0),
        onScroll:
          normalized.onScroll ??
          ((offset, context) => {
            if (typeof displayObject?.scrollTo === 'function') {
              return displayObject.scrollTo(offset);
            }
            return normalized.onMove?.({
              ...context,
              deltaY: context.previousOffset - offset,
            });
          }),
      });
    }

    if (kind === 'drag') {
      return this.registerDragSource({
        ...normalized,
        onDragStart: normalized.onDragStart ?? normalized.onStart,
        onDragMove: normalized.onDragMove ?? normalized.onMove,
        onDragEnd: normalized.onDragEnd ?? normalized.onEnd,
        onDragCancel: normalized.onDragCancel ?? normalized.onCancel,
      });
    }

    if (kind === 'pinch') {
      return this.registerPinchSurface(normalized);
    }

    if (kind === 'swipe') {
      return this.registerPageSwipe(normalized);
    }

    return this.registerPanSurface({
      ...normalized,
      onPanStart: normalized.onPanStart ?? normalized.onStart,
      onPan: normalized.onPan ?? normalized.onMove,
      onPanEnd: normalized.onPanEnd ?? normalized.onEnd,
      onPanCancel: normalized.onPanCancel ?? normalized.onCancel,
    });
  }

  register(kind, descriptor) {
    const registration = this.store.register(kind, descriptor);
    const unregister = () => this.unregister(registration.id);
    unregister.id = registration.id;
    unregister.update = (patch) =>
      this.updateRegistration(registration.id, patch);
    unregister.unregister = unregister;
    return Object.freeze(unregister);
  }

  normalizeRegistrationDescriptor(
    kind,
    displayObjectOrDescriptor,
    descriptor,
  ) {
    const normalized =
      descriptor === null
        ? { ...(displayObjectOrDescriptor ?? {}) }
        : {
            ...(descriptor ?? {}),
            displayObject: displayObjectOrDescriptor,
          };
    const displayObject = normalized.displayObject;
    if (!normalized.id) {
      const label = String(displayObject?.label ?? `${kind}-target`)
        .trim()
        .replace(/\s+/g, '-');
      normalized.id =
        `${kind}:${label || 'target'}:${this.nextGeneratedRegistrationId++}`;
    }
    return normalized;
  }

  updateRegistration(id, patch) {
    if (this.activePinch?.registration.id === id) {
      this.endPinch(true, 'registration-updated');
    }

    for (const pointer of [...this.pointers.values()]) {
      if (pointerUsesRegistration(pointer, id)) {
        this.cancelPointer(pointer, 'registration-updated');
      }
    }

    const registration = this.store.update(id, patch);

    if (
      this.focusedId === id &&
      (!this.isFocusable(registration) ||
        !this.isRegistrationAllowed(registration))
    ) {
      this.blurFocus();
    }

    return registration;
  }

  unregister(id) {
    if (!this.store.get(id)) {
      return false;
    }

    if (this.activePinch?.registration.id === id) {
      this.endPinch(true, 'unregistered');
    }

    for (const pointer of [...this.pointers.values()]) {
      if (pointerUsesRegistration(pointer, id)) {
        this.cancelPointer(pointer, 'unregistered');
      }
    }

    if (this.focusedId === id) {
      this.blurFocus();
    }

    return this.store.unregister(id);
  }

  pushModal({
    id,
    root = null,
    containsDisplayObject = null,
    containsRegistration = null,
    onOutsidePress = null,
    onBack = null,
    onEscape = null,
    outsideFeedback = false,
    autoFocus = true,
    priority = 0,
  } = {}) {
    const modalId = validateId(id, 'Pixi modal');
    if (this.modals.some((modal) => modal.id === modalId)) {
      throw new Error(`Pixi modal "${modalId}" is already on the stack.`);
    }

    const modal = {
      id: modalId,
      root,
      containsDisplayObject,
      containsRegistration,
      onOutsidePress,
      onBack,
      onEscape,
      outsideFeedback: Boolean(outsideFeedback),
      priority: finiteNumber(priority, 0),
      order: this.nextModalOrder++,
      previousFocusId: this.focusedId,
    };
    this.cancelAllPointers('modal-changed');
    this.modals.push(modal);

    if (autoFocus) {
      this.focusFirst();
    } else if (!this.isFocusedTargetAllowed()) {
      this.blurFocus();
    }

    return Object.freeze({
      id: modalId,
      update: (patch) => this.updateModal(modalId, patch),
      unregister: () => this.popModal(modalId),
    });
  }

  updateModal(id, patch = {}) {
    const modal = this.modals.find((candidate) => candidate.id === id);
    if (!modal) {
      throw new Error(`Unknown Pixi modal "${id}".`);
    }

    const modalId = modal.id;
    const order = modal.order;
    const previousFocusId = modal.previousFocusId;
    const priority =
      patch.priority === undefined
        ? modal.priority
        : finiteNumber(patch.priority, modal.priority);
    Object.assign(modal, patch, {
      id: modalId,
      order,
      priority,
      previousFocusId,
    });
    if (!this.isFocusedTargetAllowed()) {
      this.focusFirst();
    }

    return modal;
  }

  popModal(id = this.getTopModal()?.id) {
    const index = this.modals.findIndex((modal) => modal.id === id);
    if (index < 0) {
      return false;
    }

    const modal = this.modals[index];
    const wasTopModal = this.getTopModal() === modal;
    this.cancelAllPointers('modal-changed');
    this.modals.splice(index, 1);
    if (wasTopModal) {
      if (
        !modal.previousFocusId ||
        !this.focus(modal.previousFocusId)
      ) {
        this.focusFirst({ excludeModal: modal });
      }
    } else if (!this.isFocusedTargetAllowed()) {
      this.focusFirst();
    }

    return true;
  }

  getTopModal() {
    let top = null;
    for (const modal of this.modals) {
      if (
        !top ||
        modal.priority > top.priority ||
        (modal.priority === top.priority && modal.order > top.order)
      ) {
        top = modal;
      }
    }
    return top;
  }

  setBackHandler(handler) {
    this.backHandler = typeof handler === 'function' ? handler : null;
  }

  setEscapeHandler(handler) {
    this.escapeHandler = typeof handler === 'function' ? handler : null;
  }

  handleBack({ source = 'native', event = null } = {}) {
    const modal = this.getTopModal();
    const modalHandler =
      source === 'escape'
        ? modal?.onEscape ?? modal?.onBack
        : modal?.onBack;

    if (modalHandler) {
      const result = modalHandler({ source, event, modalId: modal.id });
      if (result !== false) {
        return true;
      }
    } else if (modal) {
      return true;
    }

    if (source === 'escape' && this.escapeHandler) {
      const result = this.escapeHandler({ source, event });
      if (result !== false) {
        return true;
      }
    }

    if (this.backHandler) {
      return this.backHandler({ source, event }) !== false;
    }

    return false;
  }

  focus(id) {
    const registration = this.store.get(id);
    if (
      registration?.kind !== 'press' ||
      !this.isFocusable(registration) ||
      !this.isRegistrationAllowed(registration)
    ) {
      return false;
    }

    if (this.focusedId === id) {
      return true;
    }

    const previous = this.store.get(this.focusedId);
    this.focusedId = id;
    this.canvas?.focus?.({ preventScroll: true });
    previous?.onFocusChange?.(false, this.focusContext(previous));
    registration.onFocusChange?.(true, this.focusContext(registration));
    return true;
  }

  blurFocus() {
    const previous = this.store.get(this.focusedId);
    this.focusedId = null;
    previous?.onFocusChange?.(false, this.focusContext(previous));
  }

  focusFirst(options = {}) {
    const focusable = this.getFocusableTargets(options);
    if (focusable.length === 0) {
      this.blurFocus();
      return false;
    }

    return this.focus(focusable[0].id);
  }

  moveFocus(offset) {
    const focusable = this.getFocusableTargets();
    if (focusable.length === 0) {
      this.blurFocus();
      return false;
    }

    const currentIndex = focusable.findIndex(
      (registration) => registration.id === this.focusedId,
    );
    const startIndex = currentIndex < 0 ? (offset < 0 ? 0 : -1) : currentIndex;
    const nextIndex =
      (startIndex + offset + focusable.length) % focusable.length;
    return this.focus(focusable[nextIndex].id);
  }

  getFocusedId() {
    return this.focusedId;
  }

  onPointerDown(event) {
    if (event?.button > 0) {
      return;
    }

    const pointerId = resolvePointerId(event);
    const existing = this.pointers.get(pointerId);
    if (existing) {
      this.cancelPointer(existing, 'replaced');
    }

    const point = resolveInputPoint(event);
    const pointerType = String(event?.pointerType ?? 'mouse');
    const modal = this.getTopModal();
    this.canvas?.focus?.({ preventScroll: true });

    const resolvedPress = this.resolvePressTarget(
      event?.target,
      point.global,
    );
    if (
      this.focusedId !== null &&
      resolvedPress?.id !== this.focusedId
    ) {
      this.blurFocus();
    }
    if (
      modal &&
      !this.isDisplayObjectInsideModal(event?.target, modal) &&
      !this.isRegistrationInsideModal(resolvedPress, modal)
    ) {
      const blockedPointer = this.createPointer({
        event,
        pointerId,
        pointerType,
        point,
        blockedModal: modal,
      });
      this.pointers.set(pointerId, blockedPointer);
      this.capturePointer(pointerId);
      preventInputDefault(event, { immediate: true });
      return;
    }

    const pointer = this.createPointer({
      event,
      pointerId,
      pointerType,
      point,
      resolvedPress,
    });
    this.pointers.set(pointerId, pointer);
    this.capturePointer(pointerId);

    if (pointer.press) {
      this.uiClickSoundFacade?.unlock?.();
      this.setPressState(pointer, true, event);
      if (this.pointers.get(pointer.id) !== pointer) {
        return;
      }

      if (this.isFocusable(pointer.press)) {
        this.focus(pointer.press.id);
      }

      this.playPointerHaptic(pointer.press, pointer);
    }

    this.beginPendingScrolls(pointer, event);
    this.tryBeginPinch(pointer, event);
  }

  onPointerMove(event) {
    const pointer = this.pointers.get(resolvePointerId(event));
    if (!pointer) {
      return;
    }

    this.updatePointerPoint(pointer, event);

    if (this.activePinch?.pointerIds.has(pointer.id)) {
      this.updatePinch(event);
      return;
    }

    if (pointer.blockedModal || pointer.consumed) {
      if (
        pointDistance(pointer.start.screen, pointer.current.screen) >
        this.pressSlopFor(pointer)
      ) {
        pointer.moved = true;
      }
      return;
    }

    pointer.previewedScrollIds.clear();
    this.updatePendingScrolls(pointer, event);
    const movement = this.pointerMovement(pointer);
    const distance = pointDistance(pointer.start.screen, pointer.current.screen);
    if (distance > this.pressSlopFor(pointer)) {
      pointer.moved = true;
      this.setPressState(pointer, false, event);
    }

    if (!pointer.owner) {
      this.claimGesture(pointer, movement, distance, event);
    }

    if (pointer.owner) {
      this.updateOwnedGesture(pointer, movement, event);
      preventInputDefault(event);
    }
  }

  onPointerUp(event) {
    const pointerId = resolvePointerId(event);
    const pointer = this.pointers.get(pointerId);
    if (!pointer) {
      return;
    }

    this.updatePointerPoint(pointer, event);

    if (this.activePinch?.pointerIds.has(pointer.id)) {
      this.endPinch(false, 'pointerup', event);
      this.finishPointer(pointer);
      preventInputDefault(event);
      return;
    }

    if (pointer.blockedModal) {
      const withinSlop =
        pointDistance(pointer.start.screen, pointer.current.screen) <=
        this.pressSlopFor(pointer);
      if (withinSlop && pointer.blockedModal === this.getTopModal()) {
        const result = pointer.blockedModal.onOutsidePress?.({
          modalId: pointer.blockedModal.id,
          point: pointer.current.global,
          screenPoint: pointer.current.screen,
          event,
        });
        this.confirmFeedback(
          result,
          this.activationContext(null, pointer, event, 'modal-outside'),
          pointer.blockedModal.outsideFeedback,
        );
      }

      this.finishPointer(pointer);
      preventInputDefault(event, { immediate: true });
      return;
    }

    if (pointer.owner) {
      this.finishOwnedGesture(pointer, event, false);
      this.finishPointer(pointer);
      preventInputDefault(event);
      return;
    }

    if (this.finishPendingScrolls(pointer, event, false)) {
      pointer.moved = true;
    }
    const shouldActivate =
      pointer.pressActive &&
      !pointer.moved &&
      this.isRegistrationAllowed(pointer.press) &&
      this.isReleaseOnPress(pointer, event);
    this.setPressState(pointer, false, event, {
      confirmed: shouldActivate,
    });
    if (this.pointers.get(pointer.id) !== pointer) {
      return;
    }

    if (shouldActivate) {
      if (this.now() - pointer.startedAtMs >= this.heldReleaseHapticMs) {
        this.playPointerHaptic(pointer.press, pointer);
      }
      this.activateRegistration(
        pointer.press,
        this.activationContext(pointer.press, pointer, event, 'pointer'),
      );
      preventInputDefault(event);
    }

    this.finishPointer(pointer);
  }

  onPointerCancel(event) {
    const pointer = this.pointers.get(resolvePointerId(event));
    if (!pointer) {
      return;
    }

    if (this.activePinch?.pointerIds.has(pointer.id)) {
      this.endPinch(true, 'pointercancel', event);
    }

    this.cancelPointer(pointer, 'pointercancel', event);
  }

  onNativeActivation(event) {
    // The router has already validated and dispatched activation on pointerup.
    // Block Pixi's follow-up click/tap so legacy child listeners cannot double
    // activate or hit a newly opened modal backdrop after retargeting.
    preventInputDefault(event, { immediate: true });
  }

  onWheel(event) {
    const registration = this.getEligibleCandidates(event?.target, 'scroll')[0];
    if (!registration) {
      return;
    }

    const point = resolveInputPoint(event);
    const context = this.gestureContext(registration, null, event, {
      point: point.global,
      screenPoint: point.screen,
      source: 'wheel',
    });
    if (typeof registration.onWheelInput === 'function') {
      const handled = registration.onWheelInput({
        ...context,
        deltaY: finiteNumber(event?.deltaY, 0),
        deltaMode: finiteNumber(event?.deltaMode, 0),
      });
      if (handled !== false || registration.consumeAtBounds !== false) {
        preventInputDefault(event);
      }
      return;
    }

    const currentOffset = this.getScrollOffset(registration);
    const scale = this.getContentScale(registration, context);
    const nextOffset = this.clampScrollOffset(
      registration,
      currentOffset + finiteNumber(event?.deltaY, 0) *
        finiteNumber(registration.wheelScale, 1) *
        scale,
    );
    const changed = nextOffset !== currentOffset;

    if (
      registration.onScrollStart?.({
        ...context,
        offset: currentOffset,
      }) === false ||
      !this.isRegistrationAllowed(registration)
    ) {
      return;
    }

    registration.onScroll?.(nextOffset, {
      ...context,
      offset: nextOffset,
      previousOffset: currentOffset,
    });
    if (this.isRegistrationAllowed(registration)) {
      registration.onScrollEnd?.({
        ...context,
        offset: nextOffset,
        changed,
      });
    }

    if (changed || registration.consumeAtBounds !== false) {
      preventInputDefault(event);
    }
  }

  onKeyDown(event) {
    const focused = this.store.get(this.focusedId);
    if (
      focused &&
      this.isRegistrationAllowed(focused) &&
      focused.onKeyDown?.({
        event,
        registration: focused,
        router: this,
      }) === true
    ) {
      preventInputDefault(event);
      return;
    }

    if (event.key === 'Tab') {
      preventInputDefault(event);
      this.moveFocus(event.shiftKey ? -1 : 1);
      return;
    }

    if (event.key === 'Escape') {
      if (this.handleBack({ source: 'escape', event })) {
        preventInputDefault(event);
      }
      return;
    }

    if (
      focused &&
      (event.key === 'Enter' || event.key === ' ') &&
      this.isRegistrationAllowed(focused)
    ) {
      preventInputDefault(event);
      this.uiClickSoundFacade?.unlock?.();
      this.activateRegistration(
        focused,
        this.activationContext(focused, null, event, 'keyboard'),
      );
    }
  }

  onClipboard(event, type) {
    const focused = this.store.get(this.focusedId);
    if (!focused || !this.isRegistrationAllowed(focused)) {
      return;
    }

    const callbackName =
      type === 'copy' ? 'onCopy' : type === 'cut' ? 'onCut' : 'onPaste';
    const callback = focused[callbackName];
    if (typeof callback !== 'function') {
      return;
    }

    const result = callback({
      event,
      type,
      text:
        type === 'paste'
          ? event.clipboardData?.getData?.('text/plain') ?? ''
          : undefined,
      registration: focused,
      router: this,
    });

    if (result !== false) {
      preventInputDefault(event);
    }
  }

  beginPendingScrolls(pointer, event) {
    for (const registration of pointer.candidates.scroll) {
      if (
        typeof registration.onScrollPointerDown !== 'function' ||
        !this.isRegistrationAllowed(registration)
      ) {
        continue;
      }

      const context = this.gestureContext(
        registration,
        pointer,
        event,
        {
          source: 'scroll',
          phase: 'pointerdown',
        },
      );
      if (registration.onScrollPointerDown(context) !== false) {
        pointer.pendingScrollIds.add(registration.id);
      }
    }
  }

  updatePendingScrolls(pointer, event) {
    for (const registrationId of [...pointer.pendingScrollIds]) {
      const registration = this.store.get(registrationId);
      if (
        !registration ||
        !this.isRegistrationAllowed(registration) ||
        typeof registration.onScrollPointerMove !== 'function'
      ) {
        pointer.pendingScrollIds.delete(registrationId);
        continue;
      }

      registration.onScrollPointerMove(
        this.gestureContext(registration, pointer, event, {
          movement: this.pointerMovement(pointer),
          source: 'scroll',
          phase: 'pointermove',
        }),
      );
      pointer.previewedScrollIds.add(registrationId);
    }
  }

  finishPendingScrolls(pointer, event, cancelled) {
    let suppressActivation = false;

    for (const registrationId of [...pointer.pendingScrollIds]) {
      const registration = this.store.get(registrationId);
      pointer.pendingScrollIds.delete(registrationId);
      if (
        !registration ||
        typeof registration.onScrollPointerUp !== 'function'
      ) {
        continue;
      }

      const result = registration.onScrollPointerUp(
        this.gestureContext(registration, pointer, event, {
          cancelled,
          source: 'scroll',
          phase: cancelled ? 'pointercancel' : 'pointerup',
        }),
      );
      suppressActivation =
        suppressActivation ||
        result === true ||
        result?.suppressActivation === true;
    }

    pointer.previewedScrollIds.clear();
    return suppressActivation;
  }

  createPointer({
    event,
    pointerId,
    pointerType,
    point,
    blockedModal = null,
    resolvedPress = undefined,
  }) {
    const press = blockedModal
      ? null
      : resolvedPress ??
        this.resolvePressTarget(event?.target, point.global);
    const drag = blockedModal
      ? []
      : this.getEligibleCandidates(event?.target, 'drag', point.global);
    const scroll = blockedModal
      ? []
      : this.getEligibleCandidates(event?.target, 'scroll');
    const pan = blockedModal
      ? []
      : this.getEligibleCandidates(event?.target, 'pan');
    const pinch = blockedModal
      ? []
      : this.getEligibleCandidates(event?.target, 'pinch');
    const excludesPageSwipe =
      blockedModal !== null ||
      drag.length > 0 ||
      pan.length > 0 ||
      pinch.length > 0 ||
      this.pathExcludesPageSwipe(event?.target);
    const swipe = excludesPageSwipe
      ? []
      : this.getEligibleCandidates(event?.target, 'swipe');

    return {
      id: pointerId,
      pointerType,
      start: point,
      current: point,
      previous: point,
      press,
      pressActive: false,
      startedAtMs: this.now(),
      moved: false,
      consumed: false,
      blockedModal,
      candidates: { drag, scroll, pan, pinch, swipe },
      pendingScrollIds: new Set(),
      previewedScrollIds: new Set(),
      owner: null,
    };
  }

  claimGesture(pointer, movement, distance, event) {
    if (
      pointer.candidates.drag.some(
        (registration) =>
          distance >= positiveOr(registration.threshold, this.dragThreshold),
      )
    ) {
      if (this.beginDrag(pointer, event, distance)) {
        return;
      }

      if (this.pointers.get(pointer.id) !== pointer) {
        return;
      }
    }

    const axis = resolveGestureAxis(
      movement.screen,
      this.gestureLock,
      this.axisLockRatio,
    );
    if (!axis) {
      return;
    }

    if (axis === 'vertical') {
      if (this.beginScroll(pointer, event)) {
        return;
      }

      if (this.pointers.get(pointer.id) !== pointer) {
        return;
      }

      this.beginPan(pointer, event);
      return;
    }

    if (this.beginPan(pointer, event)) {
      return;
    }

    if (this.pointers.get(pointer.id) !== pointer) {
      return;
    }

    this.beginSwipe(pointer, event);
  }

  beginDrag(pointer, event, distance) {
    for (const registration of pointer.candidates.drag) {
      if (distance < positiveOr(registration.threshold, this.dragThreshold)) {
        continue;
      }

      const context = this.gestureContext(registration, pointer, event, {
        source: 'drag',
      });
      const data = registration.onDragStart?.(context);
      if (data === false) {
        continue;
      }

      if (
        this.pointers.get(pointer.id) !== pointer ||
        !this.isRegistrationAllowed(registration)
      ) {
        return false;
      }

      this.setPressState(pointer, false, event);
      this.finishPendingScrolls(pointer, event, true);
      pointer.owner = {
        kind: 'drag',
        registration,
        data,
      };
      return true;
    }

    return false;
  }

  beginScroll(pointer, event) {
    for (const registration of pointer.candidates.scroll) {
      const context = this.gestureContext(registration, pointer, event, {
        source: 'scroll',
      });
      const startOffset = this.getScrollOffset(registration);
      if (
        registration.onScrollStart?.({
          ...context,
          offset: startOffset,
        }) === false
      ) {
        continue;
      }

      if (
        this.pointers.get(pointer.id) !== pointer ||
        !this.isRegistrationAllowed(registration)
      ) {
        return false;
      }

      this.setPressState(pointer, false, event);
      pointer.owner = {
        kind: 'scroll',
        registration,
        startOffset,
      };
      return true;
    }

    return false;
  }

  beginPan(pointer, event) {
    for (const registration of pointer.candidates.pan) {
      const context = this.gestureContext(registration, pointer, event, {
        source: 'pan',
      });
      if (registration.onPanStart?.(context) === false) {
        continue;
      }

      if (
        this.pointers.get(pointer.id) !== pointer ||
        !this.isRegistrationAllowed(registration)
      ) {
        return false;
      }

      this.setPressState(pointer, false, event);
      this.finishPendingScrolls(pointer, event, true);
      pointer.owner = { kind: 'pan', registration };
      return true;
    }

    return false;
  }

  beginSwipe(pointer, event) {
    for (const registration of pointer.candidates.swipe) {
      const context = this.gestureContext(registration, pointer, event, {
        source: 'swipe',
      });
      if (registration.onSwipeStart?.(context) === false) {
        continue;
      }

      if (
        this.pointers.get(pointer.id) !== pointer ||
        !this.isRegistrationAllowed(registration)
      ) {
        return false;
      }

      this.setPressState(pointer, false, event);
      this.finishPendingScrolls(pointer, event, true);
      pointer.owner = { kind: 'swipe', registration };
      return true;
    }

    return false;
  }

  updateOwnedGesture(pointer, movement, event) {
    const owner = pointer.owner;
    if (!owner) {
      return;
    }

    const context = this.gestureContext(owner.registration, pointer, event, {
      movement,
      source: owner.kind,
    });

    switch (owner.kind) {
      case 'drag':
        owner.registration.onDragMove?.({
          ...context,
          data: owner.data,
        });
        break;
      case 'scroll': {
        if (
          typeof owner.registration.onScrollPointerMove === 'function'
        ) {
          if (
            !pointer.previewedScrollIds.has(owner.registration.id)
          ) {
            owner.registration.onScrollPointerMove(context);
          }
          break;
        }

        const scale = this.getContentScale(owner.registration, context);
        const offset = this.clampScrollOffset(
          owner.registration,
          owner.startOffset - movement.screen.y * scale,
        );
        owner.registration.onScroll?.(offset, {
          ...context,
          offset,
          previousOffset: this.getScrollOffset(owner.registration),
        });
        break;
      }
      case 'pan':
        owner.registration.onPan?.(context);
        break;
      case 'swipe':
        owner.registration.onSwipeMove?.(context);
        break;
      default:
        break;
    }
  }

  finishOwnedGesture(pointer, event, cancelled) {
    const owner = pointer.owner;
    if (!owner) {
      return;
    }

    const movement = this.pointerMovement(pointer);
    const context = this.gestureContext(owner.registration, pointer, event, {
      movement,
      cancelled,
      source: owner.kind,
    });

    switch (owner.kind) {
      case 'drag':
        this.finishDrag(owner, pointer, event, cancelled, context);
        break;
      case 'scroll':
        if (
          typeof owner.registration.onScrollPointerUp === 'function'
        ) {
          owner.registration.onScrollPointerUp({
            ...context,
            offset: this.getScrollOffset(owner.registration),
          });
          pointer.pendingScrollIds.delete(owner.registration.id);
        } else {
          owner.registration.onScrollEnd?.({
            ...context,
            offset: this.getScrollOffset(owner.registration),
          });
        }
        break;
      case 'pan':
        if (cancelled) {
          owner.registration.onPanCancel?.(context);
        } else {
          owner.registration.onPanEnd?.(context);
        }
        break;
      case 'swipe':
        this.finishSwipe(owner.registration, context, cancelled);
        break;
      default:
        break;
    }

    pointer.owner = null;
  }

  finishDrag(owner, pointer, event, cancelled, context) {
    if (cancelled) {
      owner.registration.onDragCancel?.({
        ...context,
        data: owner.data,
        reason: 'cancelled',
      });
      return;
    }

    const dropTarget = this.resolveDropTarget(event?.target, pointer, owner);
    let accepted = false;

    if (dropTarget) {
      const dropContext = {
        ...context,
        data: owner.data,
        sourceId: owner.registration.id,
        dropTargetId: dropTarget.id,
      };
      accepted = dropTarget.onDrop?.(dropContext) !== false;
    }

    if (accepted) {
      owner.registration.onDragEnd?.({
        ...context,
        data: owner.data,
        accepted: true,
        dropTargetId: dropTarget.id,
      });
    } else {
      owner.registration.onDragCancel?.({
        ...context,
        data: owner.data,
        accepted: false,
        reason: 'no-drop-target',
      });
    }
  }

  finishSwipe(registration, context, cancelled) {
    const deltaX = context.movement.screen.x;
    const deltaY = context.movement.screen.y;
    const threshold = positiveOr(registration.threshold, this.swipeThreshold);
    const committed =
      !cancelled &&
      Math.abs(deltaX) >= threshold &&
      Math.abs(deltaX) > Math.abs(deltaY) * this.swipeCommitRatio;

    if (committed) {
      registration.onSwipe?.({
        ...context,
        direction: deltaX < 0 ? 'next' : 'previous',
      });
    }

    registration.onSwipeEnd?.({ ...context, committed });
  }

  tryBeginPinch(pointer, event) {
    if (this.activePinch || pointer.candidates.pinch.length === 0) {
      return false;
    }

    for (const other of this.pointers.values()) {
      if (
        other === pointer ||
        other.blockedModal ||
        other.consumed ||
        other.owner?.kind === 'drag'
      ) {
        continue;
      }

      const registration = pointer.candidates.pinch.find((candidate) =>
        other.candidates.pinch.some(
          (otherCandidate) => otherCandidate.id === candidate.id,
        ),
      );

      if (!registration) {
        continue;
      }

      const startDistance = pointDistance(
        other.current.screen,
        pointer.current.screen,
      );
      if (startDistance <= 0) {
        continue;
      }

      if (other.owner) {
        this.finishOwnedGesture(other, event, true);
      }
      if (pointer.owner) {
        this.finishOwnedGesture(pointer, event, true);
      }
      this.setPressState(other, false, event);
      this.setPressState(pointer, false, event);
      this.finishPendingScrolls(other, event, true);
      this.finishPendingScrolls(pointer, event, true);

      const context = this.pinchContext(
        registration,
        other,
        pointer,
        event,
        {
          scale: 1,
          deltaScale: 1,
        },
      );
      if (registration.onPinchStart?.(context) === false) {
        continue;
      }

      if (
        this.pointers.get(other.id) !== other ||
        this.pointers.get(pointer.id) !== pointer ||
        !this.isRegistrationAllowed(registration)
      ) {
        return false;
      }

      this.activePinch = {
        registration,
        pointerIds: new Set([other.id, pointer.id]),
        startDistance,
        lastScale: 1,
        startScreenCenter: pointCenter(
          other.current.screen,
          pointer.current.screen,
        ),
        startGlobalCenter: pointCenter(
          other.current.global,
          pointer.current.global,
        ),
      };
      other.owner = { kind: 'pinch', registration };
      pointer.owner = { kind: 'pinch', registration };
      preventInputDefault(event);
      return true;
    }

    return false;
  }

  updatePinch(event) {
    const pinch = this.activePinch;
    if (!pinch) {
      return;
    }

    const [firstId, secondId] = [...pinch.pointerIds];
    const first = this.pointers.get(firstId);
    const second = this.pointers.get(secondId);
    if (!first || !second) {
      this.endPinch(true, 'missing-pointer', event);
      return;
    }

    const distance = pointDistance(first.current.screen, second.current.screen);
    const scale = distance / pinch.startDistance;
    const context = this.pinchContext(
      pinch.registration,
      first,
      second,
      event,
      {
        scale,
        deltaScale: scale / pinch.lastScale,
        startScreenCenter: pinch.startScreenCenter,
        startGlobalCenter: pinch.startGlobalCenter,
      },
    );
    pinch.lastScale = scale;
    pinch.registration.onPinch?.(context);
    preventInputDefault(event);
  }

  endPinch(cancelled, reason, event = null) {
    const pinch = this.activePinch;
    if (!pinch) {
      return false;
    }

    const [firstId, secondId] = [...pinch.pointerIds];
    const first = this.pointers.get(firstId);
    const second = this.pointers.get(secondId);
    const context =
      first && second
        ? this.pinchContext(pinch.registration, first, second, event, {
            scale: pinch.lastScale,
            deltaScale: 1,
            cancelled,
            reason,
          })
        : {
            registration: pinch.registration,
            cancelled,
            reason,
            event,
            router: this,
          };

    pinch.registration.onPinchEnd?.(context);
    for (const pointerId of pinch.pointerIds) {
      const pointer = this.pointers.get(pointerId);
      if (pointer) {
        pointer.owner = null;
        pointer.consumed = true;
        pointer.moved = true;
        this.setPressState(pointer, false, event);
      }
    }

    this.activePinch = null;
    return true;
  }

  pinchContext(registration, first, second, event, extra = {}) {
    const screenCenter = pointCenter(first.current.screen, second.current.screen);
    const globalCenter = pointCenter(first.current.global, second.current.global);
    return {
      registration,
      registrationId: registration.id,
      point: globalCenter,
      screenPoint: screenCenter,
      pointers: Object.freeze([first.id, second.id]),
      event,
      router: this,
      ...extra,
    };
  }

  resolveDropTarget(target, pointer, owner) {
    const pathCandidates = this.getEligibleCandidates(target, 'drop');
    const scannedCandidates = this.store
      .getRegistrations('drop')
      .filter(
        (registration) =>
          !pathCandidates.includes(registration) &&
          this.isRegistrationAllowed(registration),
      )
      .sort(compareRegistrationPriority);
    const candidates = [...pathCandidates, ...scannedCandidates];

    for (const registration of candidates) {
      const hit =
        pathCandidates.includes(registration) ||
        pointInDisplayObject(
          registration.displayObject,
          pointer.current.global,
          0,
          registration.hitTest,
        );
      if (!hit) {
        continue;
      }

      const context = this.gestureContext(registration, pointer, null, {
        data: owner.data,
        sourceId: owner.registration.id,
        source: 'drop-test',
      });
      if (registration.accepts?.(owner.data, context) === false) {
        continue;
      }

      return registration;
    }

    return null;
  }

  activateRegistration(registration, context) {
    if (
      !registration ||
      !this.isRegistrationAllowed(registration) ||
      resolveRegistrationBoolean(registration.selected, false) ||
      resolveRegistrationBoolean(registration.interactive, true) === false ||
      typeof registration.onActivate !== 'function'
    ) {
      return false;
    }

    const result = registration.onActivate(context);
    this.confirmFeedback(result, context, registration.feedback !== false);
    return result !== false;
  }

  confirmFeedback(result, context, enabled = true) {
    if (!enabled || result === false) {
      return;
    }

    if (isPromiseLike(result)) {
      result
        .then((resolved) => {
          if (resolved !== false) {
            this.playConfirmedFeedback(context);
          }
        })
        .catch(() => {});
      return;
    }

    this.playConfirmedFeedback(context);
  }

  playConfirmedFeedback(context) {
    if (context?.registration?.sound !== false) {
      this.uiClickSoundFacade?.playClick?.();
    }
  }

  playPointerHaptic(registration, pointer) {
    if (
      pointer?.pointerType !== 'mouse' &&
      resolveRegistrationBoolean(registration?.haptic, true) !== false
    ) {
      this.hapticsFacade?.playUiTap?.();
    }
  }

  setPressState(pointer, pressing, event, extra = {}) {
    if (!pointer.press || pointer.pressActive === pressing) {
      return;
    }

    pointer.pressActive = pressing;
    pointer.press.onPressChange?.(
      pressing,
      {
        ...this.activationContext(pointer.press, pointer, event, 'press'),
        confirmed: pressing ? false : extra.confirmed === true,
        cancelled: pressing ? false : extra.confirmed !== true,
      },
    );
  }

  isReleaseOnPress(pointer, event) {
    const releasePresses = this.getEligibleCandidates(event?.target, 'press');
    if (releasePresses.some((registration) => registration.id === pointer.press.id)) {
      return true;
    }

    return pointInDisplayObject(
      pointer.press.displayObject,
      pointer.current.global,
      this.pressSlopFor(pointer),
      pointer.press.hitTest,
    );
  }

  getEligibleCandidates(target, kind, fallbackPoint = null) {
    const pathCandidates = this.store
      .getCandidates(target, kind)
      .map((candidate) => candidate.registration)
      .filter((registration) => this.isRegistrationAllowed(registration));
    const pathIds = new Set(
      pathCandidates.map((registration) => registration.id),
    );
    const fallbackCandidates = fallbackPoint
      ? this.store
          .getRegistrations(kind)
          .filter(
            (registration) =>
              !pathIds.has(registration.id) &&
              registration.fallbackHitTest === true &&
              this.isRegistrationAllowed(registration) &&
              pointInDisplayObject(
                registration.displayObject,
                fallbackPoint,
                0,
                registration.hitTest,
              ),
          )
          .sort(compareRegistrationPriority)
      : [];

    return [...pathCandidates, ...fallbackCandidates].filter(
      (registration) =>
        kind !== 'press' ||
        !resolveRegistrationBoolean(registration.selected, false),
    );
  }

  resolvePressTarget(target, point) {
    const pathTarget = this.getEligibleCandidates(target, 'press')[0] ?? null;
    if (pathTarget) {
      return pathTarget;
    }

    return (
      this.store
        .getRegistrations('press')
        .filter(
          (registration) =>
            registration.fallbackHitTest === true &&
            this.isRegistrationAllowed(registration) &&
            !resolveRegistrationBoolean(registration.selected, false),
        )
        .sort(compareRegistrationPriority)
        .find((registration) =>
          pointInDisplayObject(
            registration.displayObject,
            point,
            0,
            registration.hitTest,
          ),
        ) ?? null
    );
  }

  isRegistrationAllowed(registration) {
    if (
      this.store.get(registration?.id) !== registration ||
      !isInputRegistrationAvailable(registration) ||
      resolveRegistrationBoolean(registration.interactive, true) === false
    ) {
      return false;
    }

    const modal = this.getTopModal();
    if (!modal) {
      return !registration.modalId;
    }

    if (registration.modalId) {
      return registration.modalId === modal.id;
    }

    if (typeof modal.containsRegistration === 'function') {
      return Boolean(modal.containsRegistration(registration));
    }

    return Boolean(
      modal.root &&
        isDisplayObjectDescendant(registration.displayObject, modal.root),
    );
  }

  isDisplayObjectInsideModal(displayObject, modal) {
    if (typeof modal.containsDisplayObject === 'function') {
      return Boolean(modal.containsDisplayObject(displayObject));
    }

    if (modal.root && isDisplayObjectDescendant(displayObject, modal.root)) {
      return true;
    }

    let current = displayObject;
    while (current) {
      if (
        this.store
          .getDisplayObjectRegistrations(current)
          .some((registration) => registration.modalId === modal.id)
      ) {
        return true;
      }

      current = current.parent ?? null;
    }

    return false;
  }

  pathExcludesPageSwipe(displayObject) {
    let current = displayObject;

    while (current) {
      if (
        this.store
          .getDisplayObjectRegistrations(current)
          .some(
            (registration) =>
              this.isRegistrationAllowed(registration) &&
              resolveRegistrationBoolean(
                registration.excludePageSwipe,
                false,
              ),
          )
      ) {
        return true;
      }

      current = current.parent ?? null;
    }

    return false;
  }

  isFocusable(registration) {
    return Boolean(
      registration?.kind === 'press' &&
        resolveRegistrationBoolean(registration.focusable, true) &&
        isInputRegistrationAvailable(registration),
    );
  }

  getFocusableTargets({ excludeModal = null } = {}) {
    return this.store
      .getRegistrations('press')
      .filter(
        (registration) =>
          this.isFocusable(registration) &&
          this.isRegistrationAllowed(registration) &&
          !this.isRegistrationInsideModal(registration, excludeModal),
      )
      .sort((left, right) => {
        const leftOrder = finiteNumber(left.focusOrder, left.order);
        const rightOrder = finiteNumber(right.focusOrder, right.order);
        return leftOrder - rightOrder || left.order - right.order;
      });
  }

  isFocusedTargetAllowed() {
    const registration = this.store.get(this.focusedId);
    return Boolean(
      registration &&
        this.isFocusable(registration) &&
        this.isRegistrationAllowed(registration),
    );
  }

  isRegistrationInsideModal(registration, modal) {
    if (!registration || !modal) {
      return false;
    }
    if (registration.modalId) {
      return registration.modalId === modal.id;
    }
    if (typeof modal.containsRegistration === 'function') {
      return Boolean(modal.containsRegistration(registration));
    }
    return Boolean(
      modal.root &&
        isDisplayObjectDescendant(
          registration.displayObject,
          modal.root,
        ),
    );
  }

  focusContext(registration) {
    return {
      registration,
      registrationId: registration?.id ?? null,
      router: this,
    };
  }

  activationContext(registration, pointer, event, source) {
    const point = pointer?.current ?? resolveInputPoint(event);
    return {
      registration,
      registrationId: registration?.id ?? null,
      source,
      pointerId: pointer?.id ?? null,
      pointerType: pointer?.pointerType ?? null,
      point: point.global,
      screenPoint: point.screen,
      event,
      router: this,
    };
  }

  gestureContext(registration, pointer, event, extra = {}) {
    const point = pointer?.current ?? resolveInputPoint(event);
    return {
      registration,
      registrationId: registration.id,
      pointerId: pointer?.id ?? null,
      pointerType: pointer?.pointerType ?? null,
      point: point.global,
      screenPoint: point.screen,
      event,
      router: this,
      ...extra,
    };
  }

  pointerMovement(pointer) {
    return Object.freeze({
      global: inputDelta(pointer.start.global, pointer.current.global),
      screen: inputDelta(pointer.start.screen, pointer.current.screen),
      stepGlobal: inputDelta(pointer.previous.global, pointer.current.global),
      stepScreen: inputDelta(pointer.previous.screen, pointer.current.screen),
    });
  }

  updatePointerPoint(pointer, event) {
    pointer.previous = pointer.current;
    pointer.current = resolveInputPoint(event);
  }

  pressSlopFor(pointer) {
    return positiveOr(
      pointer.press?.slop,
      pointer.pointerType === 'mouse'
        ? this.mousePressSlop
        : this.touchPressSlop,
    );
  }

  getScrollOffset(registration) {
    return finiteNumber(registration.getOffset?.(), 0);
  }

  getScrollMax(registration) {
    if (typeof registration.getMaxOffset === 'function') {
      return Math.max(0, finiteNumber(registration.getMaxOffset(), 0));
    }

    if (registration.maxOffset !== undefined) {
      return Math.max(0, finiteNumber(registration.maxOffset, 0));
    }

    const contentHeight = finiteNumber(
      registration.getContentHeight?.() ?? registration.contentHeight,
      0,
    );
    const viewportHeight = finiteNumber(
      registration.getViewportHeight?.() ?? registration.viewportHeight,
      0,
    );
    return Math.max(0, contentHeight - viewportHeight);
  }

  clampScrollOffset(registration, offset) {
    return clamp(offset, 0, this.getScrollMax(registration));
  }

  getContentScale(registration, context) {
    const value =
      typeof registration.contentScale === 'function'
        ? registration.contentScale(context)
        : registration.contentScale;
    return positiveOr(value, 1);
  }

  capturePointer(pointerId) {
    try {
      this.canvas?.setPointerCapture?.(pointerId);
    } catch {
      // WebView can reject capture for synthetic or already-ended pointers.
    }
  }

  releasePointer(pointerId) {
    try {
      this.canvas?.releasePointerCapture?.(pointerId);
    } catch {
      // Capture is automatically lost on pointerup/cancel in some browsers.
    }
  }

  finishPointer(pointer) {
    this.setPressState(pointer, false, null);
    this.releasePointer(pointer.id);
    this.pointers.delete(pointer.id);
  }

  cancelPointer(pointer, reason, event = null) {
    if (!this.pointers.has(pointer.id)) {
      return;
    }

    if (pointer.owner && pointer.owner.kind !== 'pinch') {
      this.finishOwnedGesture(pointer, event, true);
    } else {
      this.finishPendingScrolls(pointer, event, true);
    }

    this.setPressState(pointer, false, event);
    pointer.cancelled = true;
    pointer.cancelReason = reason;
    this.finishPointer(pointer);
  }

  cancelAllPointers(reason) {
    if (this.activePinch) {
      this.endPinch(true, reason);
    }

    for (const pointer of [...this.pointers.values()]) {
      this.cancelPointer(pointer, reason);
    }
  }
}

function resolveGestureAxis(delta, threshold, ratio) {
  const absX = Math.abs(delta.x);
  const absY = Math.abs(delta.y);

  if (absX < threshold && absY < threshold) {
    return null;
  }

  if (absX >= threshold && absX >= absY * ratio) {
    return 'horizontal';
  }

  if (absY >= threshold && absY >= absX * ratio) {
    return 'vertical';
  }

  return null;
}

function pointerUsesRegistration(pointer, id) {
  if (pointer.press?.id === id || pointer.owner?.registration?.id === id) {
    return true;
  }

  return Object.values(pointer.candidates).some((registrations) =>
    registrations.some((registration) => registration.id === id),
  );
}

function compareRegistrationPriority(left, right) {
  return right.priority - left.priority || left.order - right.order;
}

function resolvePointerId(event) {
  return event?.pointerId ?? event?.nativeEvent?.pointerId ?? 1;
}

function validateId(id, label) {
  const value = String(id ?? '').trim();
  if (!value) {
    throw new Error(`${label} requires a stable id.`);
  }

  return value;
}

function positiveOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function defaultNow() {
  if (
    typeof performance !== 'undefined' &&
    typeof performance.now === 'function'
  ) {
    return performance.now();
  }

  return Date.now();
}

function isPromiseLike(value) {
  return Boolean(value && typeof value.then === 'function');
}
