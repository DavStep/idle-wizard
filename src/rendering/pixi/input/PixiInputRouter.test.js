import { describe, expect, it, vi } from 'vitest';

import { UI_HELD_RELEASE_HAPTIC_MS } from '../../../app/haptics/hapticTiming.js';
import { PixiInputRouter } from './PixiInputRouter.js';

describe('PixiInputRouter', () => {
  it('notifies pointer-down observers without claiming the press path', () => {
    const harness = createHarness();
    const target = displayObject(harness.root);
    const observer = vi.fn();
    const unsubscribe = harness.router.subscribePointerDown(observer);

    harness.emitRoot('pointerdown', pointerEvent(target, 1, 12, 18));

    expect(observer).toHaveBeenCalledWith(
      expect.objectContaining({
        point: { x: 12, y: 18 },
        target,
      }),
    );
    unsubscribe();
    harness.emitRoot('pointerdown', pointerEvent(target, 2, 20, 24));
    expect(observer).toHaveBeenCalledTimes(1);
  });

  it('pulses on touch down, validates quick release with slop, and does not pulse again', () => {
    let nowMs = 1000;
    const harness = createHarness({
      touchPressSlop: 20,
      now: () => nowMs,
    });
    const button = displayObject(harness.root);
    const activate = vi.fn();
    const pressChanges = vi.fn();
    harness.router.registerPressTarget({
      id: 'button',
      displayObject: button,
      onActivate: activate,
      onPressChange: pressChanges,
    });

    harness.emitRoot('pointerdown', pointerEvent(button, 1, 10, 10));
    harness.emitRoot('globalpointermove', pointerEvent(button, 1, 25, 10));

    expect(pressChanges).toHaveBeenLastCalledWith(
      true,
      expect.objectContaining({ registrationId: 'button' }),
    );
    expect(harness.haptics.playUiTap).toHaveBeenCalledTimes(1);

    nowMs += UI_HELD_RELEASE_HAPTIC_MS - 1;
    harness.emitRoot('pointerup', pointerEvent(button, 1, 25, 10));

    expect(activate).toHaveBeenCalledTimes(1);
    expect(pressChanges).toHaveBeenLastCalledWith(
      false,
      expect.objectContaining({ registrationId: 'button' }),
    );
    expect(harness.haptics.playUiTap).toHaveBeenCalledTimes(1);
    expect(harness.sound.playClick).toHaveBeenCalledTimes(1);
    expect(harness.canvas.setPointerCapture).toHaveBeenCalledWith(1);
    expect(harness.canvas.releasePointerCapture).toHaveBeenCalledWith(1);

    const followUpTap = pointerEvent(button, 1, 25, 10);
    harness.emitRoot('pointertapcapture', followUpTap);
    expect(followUpTap.preventDefault).toHaveBeenCalledTimes(1);
    expect(followUpTap.stopImmediatePropagation).toHaveBeenCalledTimes(1);

    harness.emitRoot('pointerdown', pointerEvent(button, 2, 10, 10));
    harness.emitRoot('globalpointermove', pointerEvent(button, 2, 40, 10));
    harness.emitRoot('pointerup', pointerEvent(button, 2, 40, 10));

    expect(activate).toHaveBeenCalledTimes(1);
    expect(harness.haptics.playUiTap).toHaveBeenCalledTimes(2);
    expect(harness.sound.playClick).toHaveBeenCalledTimes(1);
  });

  it('pulses again only when a held touch releases on its original control', () => {
    let nowMs = 1000;
    const harness = createHarness({ now: () => nowMs });
    const button = displayObject(harness.root);
    const activate = vi.fn();
    harness.router.registerPressTarget({
      id: 'held-button',
      displayObject: button,
      onActivate: activate,
    });

    harness.emitRoot('pointerdown', pointerEvent(button, 1, 10, 10));
    expect(harness.haptics.playUiTap).toHaveBeenCalledTimes(1);
    expect(activate).not.toHaveBeenCalled();

    nowMs += UI_HELD_RELEASE_HAPTIC_MS;
    expect(activate).not.toHaveBeenCalled();
    expect(harness.haptics.playUiTap).toHaveBeenCalledTimes(1);

    harness.emitRoot('pointerup', pointerEvent(button, 1, 10, 10));

    expect(activate).toHaveBeenCalledTimes(1);
    expect(harness.haptics.playUiTap).toHaveBeenCalledTimes(2);
  });

  it('activates an adjacent action without dismissing the focused text entry', () => {
    const harness = createHarness();
    const field = displayObject(harness.root);
    const send = displayObject(harness.root);
    const fieldFocusChanged = vi.fn();
    const activate = vi.fn();
    harness.router.registerPressTarget({
      id: 'composer',
      displayObject: field,
      onActivate: vi.fn(),
      onFocusChange: fieldFocusChanged,
    });
    harness.router.registerPressTarget({
      id: 'send',
      displayObject: send,
      onActivate: activate,
      preserveFocus: true,
    });
    harness.router.focus('composer');
    harness.canvas.focus.mockClear();
    fieldFocusChanged.mockClear();

    harness.emitRoot('pointerdown', pointerEvent(send, 1, 10, 10));
    harness.emitRoot('pointerup', pointerEvent(send, 1, 10, 10));

    expect(harness.canvas.focus).not.toHaveBeenCalled();
    expect(fieldFocusChanged).not.toHaveBeenCalled();
    expect(harness.router.getFocusedId()).toBe('composer');
    expect(activate).toHaveBeenCalledTimes(1);
  });

  it('keeps focused text entry when WebView retargets its tap to the canvas', () => {
    const harness = createHarness();
    const field = displayObject(harness.root, {
      x: 20,
      y: 40,
      width: 220,
      height: 30,
    });
    const fieldFocusChanged = vi.fn();
    harness.router.registerPressTarget({
      id: 'composer',
      displayObject: field,
      fallbackHitTest: true,
      onActivate: vi.fn(),
      onFocusChange: fieldFocusChanged,
    });
    harness.router.focus('composer');
    fieldFocusChanged.mockClear();

    harness.emitRoot(
      'pointerdown',
      pointerEvent(harness.root, 1, 80, 55),
    );

    expect(fieldFocusChanged).not.toHaveBeenCalled();
    expect(harness.router.getFocusedId()).toBe('composer');
  });

  it('turns a drag into one drop and never activates the pressed source', () => {
    const harness = createHarness({ dragThreshold: 5 });
    const source = displayObject(harness.root);
    const drop = displayObject(harness.root, { x: 100, y: 0, width: 50, height: 50 });
    const activate = vi.fn();
    const dragStart = vi.fn(() => ({ itemKey: 'sage' }));
    const dragMove = vi.fn();
    const sourceEnd = vi.fn();
    const targetDrop = vi.fn();
    harness.router.registerPressTarget({
      id: 'source-press',
      displayObject: source,
      onActivate: activate,
    });
    harness.router.registerDragSource({
      id: 'source-drag',
      displayObject: source,
      threshold: 5,
      onDragStart: dragStart,
      onDragMove: dragMove,
      onDragEnd: sourceEnd,
    });
    harness.router.registerDropTarget({
      id: 'cauldron',
      displayObject: drop,
      onDrop: targetDrop,
    });

    harness.emitRoot('pointerdown', pointerEvent(source, 1, 10, 10));
    harness.emitRoot('globalpointermove', pointerEvent(source, 1, 30, 10));
    harness.emitRoot('pointerup', pointerEvent(drop, 1, 110, 10));

    expect(dragStart).toHaveBeenCalledTimes(1);
    expect(dragMove).toHaveBeenCalledTimes(1);
    expect(targetDrop).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { itemKey: 'sage' },
        sourceId: 'source-drag',
        dropTargetId: 'cauldron',
      }),
    );
    expect(sourceEnd).toHaveBeenCalledWith(
      expect.objectContaining({ accepted: true, dropTargetId: 'cauldron' }),
    );
    expect(activate).not.toHaveBeenCalled();
    expect(harness.haptics.playUiTap).toHaveBeenCalledTimes(1);
  });

  it('pulses valid touch down while disabled and selected controls stay silent', () => {
    const harness = createHarness();
    const rejected = displayObject(harness.root);
    const disabled = displayObject(harness.root);
    const selected = displayObject(harness.root);
    const rejectedActivate = vi.fn(() => false);
    const disabledActivate = vi.fn();
    const selectedActivate = vi.fn();
    harness.router.registerPressTarget({
      id: 'rejected',
      displayObject: rejected,
      onActivate: rejectedActivate,
    });
    harness.router.registerPressTarget({
      id: 'disabled',
      displayObject: disabled,
      enabled: false,
      onActivate: disabledActivate,
    });
    harness.router.registerPressTarget({
      id: 'selected',
      displayObject: selected,
      selected: true,
      onActivate: selectedActivate,
    });

    for (const [pointerId, target] of [
      [1, rejected],
      [2, disabled],
      [3, selected],
    ]) {
      harness.emitRoot('pointerdown', pointerEvent(target, pointerId, 10, 10));
      harness.emitRoot('pointerup', pointerEvent(target, pointerId, 10, 10));
    }

    expect(rejectedActivate).toHaveBeenCalledTimes(1);
    expect(disabledActivate).not.toHaveBeenCalled();
    expect(selectedActivate).not.toHaveBeenCalled();
    expect(harness.haptics.playUiTap).toHaveBeenCalledTimes(1);
    expect(harness.sound.playClick).not.toHaveBeenCalled();
  });

  it('blocks background input under the top modal and routes only its outside press', () => {
    const harness = createHarness();
    const background = displayObject(harness.root);
    const modalRoot = displayObject(harness.root);
    const modalButton = displayObject(modalRoot);
    const backgroundActivate = vi.fn();
    const modalActivate = vi.fn();
    const outsidePress = vi.fn();
    harness.router.registerPressTarget({
      id: 'background',
      displayObject: background,
      onActivate: backgroundActivate,
    });
    harness.router.registerPressTarget({
      id: 'modal-button',
      displayObject: modalButton,
      modalId: 'settings',
      onActivate: modalActivate,
    });
    harness.router.pushModal({
      id: 'settings',
      root: modalRoot,
      onOutsidePress: outsidePress,
    });

    harness.emitRoot('pointerdown', pointerEvent(background, 1, 5, 5));
    harness.emitRoot('pointerup', pointerEvent(background, 1, 5, 5));

    expect(backgroundActivate).not.toHaveBeenCalled();
    expect(outsidePress).toHaveBeenCalledTimes(1);
    expect(harness.sound.playClick).not.toHaveBeenCalled();

    harness.emitRoot('pointerdown', pointerEvent(modalButton, 2, 20, 20));
    harness.emitRoot('pointerup', pointerEvent(modalButton, 2, 20, 20));

    expect(modalActivate).toHaveBeenCalledTimes(1);
    expect(harness.haptics.playUiTap).toHaveBeenCalledTimes(1);
  });

  it('routes an opted-in modal control when a tutorial overlay owns the event path', () => {
    const harness = createHarness();
    const modalRoot = displayObject(harness.root, {
      x: 40,
      y: 40,
      width: 120,
      height: 120,
    });
    const modalButton = displayObject(modalRoot, {
      x: 50,
      y: 50,
      width: 80,
      height: 30,
    });
    const tutorialOverlay = displayObject(harness.root, {
      x: 0,
      y: 0,
      width: 360,
      height: 724,
    });
    const modalActivate = vi.fn();
    const outsidePress = vi.fn();
    harness.router.registerPressTarget({
      id: 'modal-tutorial-target',
      displayObject: modalButton,
      fallbackHitTest: true,
      onActivate: modalActivate,
    });
    harness.router.pushModal({
      id: 'shop.stall',
      root: modalRoot,
      onOutsidePress: outsidePress,
    });

    expect(
      harness.router.resolvePressTarget(
        tutorialOverlay,
        { x: 70, y: 70 },
      )?.id,
    ).toBe('modal-tutorial-target');

    harness.emitRoot(
      'pointerdown',
      pointerEvent(tutorialOverlay, 1, 70, 70),
    );
    harness.emitRoot(
      'pointerup',
      pointerEvent(tutorialOverlay, 1, 70, 70),
    );

    expect(modalActivate).toHaveBeenCalledTimes(1);
    expect(outsidePress).not.toHaveBeenCalled();
  });

  it('keeps a higher-priority experience modal above a later connectivity gate', () => {
    const harness = createHarness();
    const introRoot = displayObject(harness.root);
    const introButton = displayObject(introRoot);
    const onlineGate = displayObject(harness.root);
    const advance = vi.fn();
    harness.router.registerPressTarget({
      id: 'intro-advance',
      displayObject: introButton,
      onActivate: advance,
    });

    harness.router.pushModal({
      id: 'experience.firstRunIntro',
      root: introRoot,
      priority: 100,
    });
    harness.router.pushModal({
      id: 'gate.online',
      root: onlineGate,
    });

    expect(harness.router.getTopModal()?.id).toBe(
      'experience.firstRunIntro',
    );
    harness.emitRoot('pointerdown', pointerEvent(introButton, 1, 20, 20));
    harness.emitRoot('pointerup', pointerEvent(introButton, 1, 20, 20));
    expect(advance).toHaveBeenCalledTimes(1);
  });

  it('restores semantic focus through retained nested modal lifecycles', () => {
    const harness = createHarness();
    const background = displayObject(harness.root);
    const firstRoot = displayObject(harness.root);
    const firstButton = displayObject(firstRoot);
    const secondRoot = displayObject(harness.root);
    const secondButton = displayObject(secondRoot);
    harness.router.registerPressTarget({
      id: 'background',
      displayObject: background,
      onActivate: vi.fn(),
    });
    harness.router.registerPressTarget({
      id: 'first-button',
      displayObject: firstButton,
      onActivate: vi.fn(),
    });
    harness.router.registerPressTarget({
      id: 'second-button',
      displayObject: secondButton,
      onActivate: vi.fn(),
    });

    expect(harness.router.focus('background')).toBe(true);
    harness.router.pushModal({
      id: 'first',
      root: firstRoot,
    });
    expect(harness.router.getFocusedId()).toBe('first-button');

    harness.router.pushModal({
      id: 'second',
      root: secondRoot,
    });
    expect(harness.router.getFocusedId()).toBe('second-button');

    expect(harness.router.popModal('second')).toBe(true);
    expect(harness.router.getFocusedId()).toBe('first-button');

    expect(harness.router.popModal('first')).toBe(true);
    expect(harness.router.getFocusedId()).toBe('background');
  });

  it('does not leave focus on a closing modal when it had no opener', () => {
    const harness = createHarness();
    const modalRoot = displayObject(harness.root);
    const modalButton = displayObject(modalRoot);
    const background = displayObject(harness.root);
    harness.router.registerPressTarget({
      id: 'modal-button',
      displayObject: modalButton,
      onActivate: vi.fn(),
    });
    harness.router.registerPressTarget({
      id: 'background',
      displayObject: background,
      onActivate: vi.fn(),
    });

    harness.router.pushModal({
      id: 'modal',
      root: modalRoot,
    });
    expect(harness.router.getFocusedId()).toBe('modal-button');

    expect(harness.router.popModal('modal')).toBe(true);
    expect(harness.router.getFocusedId()).toBe('background');
  });

  it('arbitrates nested vertical scroll before horizontal page swipe', () => {
    const harness = createHarness({
      gestureLock: 8,
      swipeThreshold: 30,
    });
    const page = displayObject(harness.root);
    const scrollView = displayObject(page);
    let offset = 50;
    const onScroll = vi.fn((nextOffset) => {
      offset = nextOffset;
    });
    const onSwipe = vi.fn();
    harness.router.registerScrollRegion({
      id: 'dialog-list',
      displayObject: scrollView,
      getOffset: () => offset,
      maxOffset: 200,
      onScroll,
    });
    harness.router.registerPageSwipe({
      id: 'page-swipe',
      displayObject: page,
      onSwipe,
    });

    harness.emitRoot('pointerdown', pointerEvent(scrollView, 1, 100, 100));
    harness.emitRoot('globalpointermove', pointerEvent(scrollView, 1, 102, 140));
    harness.emitRoot('pointerup', pointerEvent(scrollView, 1, 102, 140));

    expect(onScroll).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ source: 'scroll' }),
    );
    expect(onSwipe).not.toHaveBeenCalled();

    harness.emitRoot('pointerdown', pointerEvent(scrollView, 2, 100, 100));
    harness.emitRoot('globalpointermove', pointerEvent(scrollView, 2, 40, 102));
    harness.emitRoot('pointerup', pointerEvent(scrollView, 2, 40, 102));

    expect(onSwipe).toHaveBeenCalledWith(
      expect.objectContaining({ direction: 'next' }),
    );
  });

  it('lets a scroll pane suppress child activation only past its drag threshold', () => {
    const harness = createHarness({
      gestureLock: 10,
      touchPressSlop: 22,
    });
    const scrollView = displayObject(harness.root);
    const button = displayObject(scrollView);
    const activate = vi.fn();
    let startY = 0;
    let maximumDragDistance = 0;

    harness.router.registerPressTarget({
      id: 'scroll-child',
      displayObject: button,
      onActivate: activate,
    });
    harness.router.registerScrollRegion({
      id: 'station-scroll',
      displayObject: scrollView,
      getOffset: () => 50,
      maxOffset: 200,
      onScrollPointerDown: ({ point }) => {
        startY = point.y;
        maximumDragDistance = 0;
      },
      onScrollPointerMove: ({ point }) => {
        maximumDragDistance = Math.max(
          maximumDragDistance,
          Math.abs(point.y - startY),
        );
      },
      onScrollPointerUp: () => maximumDragDistance > 10,
    });

    harness.emitRoot('pointerdown', pointerEvent(button, 1, 100, 100));
    harness.emitRoot('globalpointermove', pointerEvent(button, 1, 109, 109));
    harness.emitRoot('pointerup', pointerEvent(button, 1, 109, 109));
    expect(activate).toHaveBeenCalledTimes(1);

    harness.emitRoot('pointerdown', pointerEvent(button, 2, 100, 100));
    harness.emitRoot('globalpointermove', pointerEvent(button, 2, 111, 111));
    harness.emitRoot('pointerup', pointerEvent(button, 2, 111, 111));
    expect(activate).toHaveBeenCalledTimes(1);
  });

  it('honors page-swipe exclusions and lets an owned pan win', () => {
    const harness = createHarness({
      gestureLock: 5,
      swipeThreshold: 20,
    });
    const page = displayObject(harness.root);
    const world = displayObject(page);
    const excluded = displayObject(page);
    const swipe = vi.fn();
    const pan = vi.fn();
    harness.router.registerPageSwipe({
      id: 'page',
      displayObject: page,
      onSwipe: swipe,
    });
    harness.router.registerPanSurface({
      id: 'world',
      displayObject: world,
      onPan: pan,
    });
    harness.router.registerPressTarget({
      id: 'excluded',
      displayObject: excluded,
      excludePageSwipe: true,
      onActivate: vi.fn(),
    });

    harness.emitRoot('pointerdown', pointerEvent(world, 1, 100, 100));
    harness.emitRoot('globalpointermove', pointerEvent(world, 1, 50, 100));
    harness.emitRoot('pointerup', pointerEvent(world, 1, 50, 100));

    expect(pan).toHaveBeenCalledWith(
      expect.objectContaining({
        movement: expect.objectContaining({
          screen: { x: -50, y: 0 },
        }),
      }),
    );
    expect(swipe).not.toHaveBeenCalled();

    harness.emitRoot('pointerdown', pointerEvent(excluded, 2, 100, 100));
    harness.emitRoot('globalpointermove', pointerEvent(excluded, 2, 50, 100));
    harness.emitRoot('pointerup', pointerEvent(excluded, 2, 50, 100));

    expect(swipe).not.toHaveBeenCalled();
  });

  it('promotes two pointers on one surface to one deterministic pinch', () => {
    const harness = createHarness();
    const world = displayObject(harness.root);
    const press = vi.fn();
    const pinchStart = vi.fn();
    const pinch = vi.fn();
    const pinchEnd = vi.fn();
    harness.router.registerPressTarget({
      id: 'world-press',
      displayObject: world,
      onActivate: press,
    });
    harness.router.registerPinchSurface({
      id: 'world-pinch',
      displayObject: world,
      onPinchStart: pinchStart,
      onPinch: pinch,
      onPinchEnd: pinchEnd,
    });

    harness.emitRoot('pointerdown', pointerEvent(world, 1, 0, 0));
    harness.emitRoot(
      'pointerdown',
      pointerEvent(world, 2, 100, 0, { isPrimary: false }),
    );
    harness.emitRoot(
      'globalpointermove',
      pointerEvent(world, 2, 200, 0, { isPrimary: false }),
    );
    harness.emitRoot('pointerup', pointerEvent(world, 1, 0, 0));
    harness.emitRoot(
      'pointerup',
      pointerEvent(world, 2, 200, 0, { isPrimary: false }),
    );

    expect(pinchStart).toHaveBeenCalledTimes(1);
    expect(pinch).toHaveBeenCalledWith(
      expect.objectContaining({
        scale: 2,
        deltaScale: 2,
        pointers: [1, 2],
      }),
    );
    expect(pinchEnd).toHaveBeenCalledWith(
      expect.objectContaining({ cancelled: false, reason: 'pointerup' }),
    );
    expect(press).not.toHaveBeenCalled();
    expect(harness.haptics.playUiTap).toHaveBeenCalledTimes(2);
  });

  it('cycles semantic focus, activates by keyboard, and routes clipboard callbacks', () => {
    const harness = createHarness();
    const first = displayObject(harness.root);
    const second = displayObject(harness.root);
    const focusFirst = vi.fn();
    const focusSecond = vi.fn();
    const activateSecond = vi.fn();
    const paste = vi.fn();
    harness.router.registerPressTarget({
      id: 'first',
      displayObject: first,
      focusOrder: 1,
      onActivate: vi.fn(),
      onFocusChange: focusFirst,
    });
    harness.router.registerPressTarget({
      id: 'second',
      displayObject: second,
      focusOrder: 2,
      onActivate: activateSecond,
      onFocusChange: focusSecond,
      onPaste: paste,
    });

    harness.emitCanvas('keydown', keyboardEvent('Tab'));
    harness.emitCanvas('keydown', keyboardEvent('Tab'));
    harness.emitCanvas('keydown', keyboardEvent('Enter'));
    harness.emitCanvas('paste', clipboardEvent('spell'));

    expect(harness.router.getFocusedId()).toBe('second');
    expect(focusFirst).toHaveBeenCalledWith(
      true,
      expect.objectContaining({ registrationId: 'first' }),
    );
    expect(focusSecond).toHaveBeenCalledWith(
      true,
      expect.objectContaining({ registrationId: 'second' }),
    );
    expect(activateSecond).toHaveBeenCalledTimes(1);
    expect(paste).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'paste', text: 'spell' }),
    );
    expect(harness.sound.playClick).toHaveBeenCalledTimes(1);
    expect(harness.haptics.playUiTap).not.toHaveBeenCalled();
  });

  it('clears focused text-entry controls when a press starts elsewhere', () => {
    const harness = createHarness();
    const field = displayObject(harness.root);
    const background = displayObject(harness.root);
    const focusChanges = vi.fn();
    harness.router.registerPressTarget({
      id: 'message-field',
      displayObject: field,
      onActivate: vi.fn(),
      onFocusChange: focusChanges,
    });

    harness.emitRoot('pointerdown', pointerEvent(field, 1, 10, 10));
    harness.emitRoot('pointerup', pointerEvent(field, 1, 10, 10));
    harness.emitRoot('pointerdown', pointerEvent(background, 2, 80, 80));

    expect(harness.router.getFocusedId()).toBeNull();
    expect(focusChanges).toHaveBeenLastCalledWith(
      false,
      expect.objectContaining({ registrationId: 'message-field' }),
    );
  });

  it('routes Escape and native back through only the top modal', () => {
    const harness = createHarness();
    const firstRoot = displayObject(harness.root);
    const secondRoot = displayObject(harness.root);
    const firstBack = vi.fn();
    const secondBack = vi.fn();
    const globalBack = vi.fn();
    harness.router.setBackHandler(globalBack);
    harness.router.pushModal({
      id: 'first',
      root: firstRoot,
      onBack: firstBack,
    });
    harness.router.pushModal({
      id: 'second',
      root: secondRoot,
      onBack: secondBack,
    });

    harness.emitCanvas('keydown', keyboardEvent('Escape'));
    expect(secondBack).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'escape', modalId: 'second' }),
    );
    expect(firstBack).not.toHaveBeenCalled();
    expect(globalBack).not.toHaveBeenCalled();

    harness.router.popModal('second');
    expect(harness.router.handleBack({ source: 'native' })).toBe(true);
    expect(firstBack).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'native', modalId: 'first' }),
    );
  });

  it('mounts each root/canvas handler once while registrations update in place', () => {
    const harness = createHarness();
    const button = displayObject(harness.root);
    const oldActivate = vi.fn();
    const nextActivate = vi.fn();
    const handle = harness.router.registerPressTarget({
      id: 'stable',
      displayObject: button,
      onActivate: oldActivate,
    });

    harness.router.mount({ root: harness.root, canvas: harness.canvas });
    handle.update({ onActivate: nextActivate });
    harness.emitRoot('pointerdown', pointerEvent(button, 1, 10, 10));
    harness.emitRoot('pointerup', pointerEvent(button, 1, 10, 10));

    expect(harness.root.on).toHaveBeenCalledTimes(8);
    expect(harness.canvas.addEventListener).toHaveBeenCalledTimes(4);
    expect(oldActivate).not.toHaveBeenCalled();
    expect(nextActivate).toHaveBeenCalledTimes(1);

    handle.unregister();
    expect(harness.root.on).toHaveBeenCalledTimes(8);
    expect(harness.canvas.addEventListener).toHaveBeenCalledTimes(4);
  });
});

function createHarness(options = {}) {
  const root = new FakePixiRoot();
  root.visible = true;
  root.renderable = true;
  root.eventMode = 'static';
  const canvas = new FakeCanvas();
  const haptics = { playUiTap: vi.fn() };
  const sound = { unlock: vi.fn(), playClick: vi.fn() };
  const router = new PixiInputRouter({
    hapticsFacade: haptics,
    uiClickSoundFacade: sound,
    ...options,
  });
  router.mount({ root, canvas });

  return {
    root,
    canvas,
    haptics,
    sound,
    router,
    emitRoot: (type, event) => root.emit(type, event),
    emitCanvas: (type, event) => canvas.emit(type, event),
  };
}

class FakePixiRoot {
  constructor() {
    this.listeners = new Map();
    this.parent = null;
    this.on = vi.fn((type, listener) => {
      let listeners = this.listeners.get(type);
      if (!listeners) {
        listeners = new Set();
        this.listeners.set(type, listeners);
      }
      listeners.add(listener);
    });
    this.off = vi.fn((type, listener) => {
      this.listeners.get(type)?.delete(listener);
    });
  }

  emit(type, event) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

class FakeCanvas {
  constructor() {
    this.listeners = new Map();
    this.attributes = new Map();
    this.tabIndex = -1;
    this.setPointerCapture = vi.fn();
    this.releasePointerCapture = vi.fn();
    this.focus = vi.fn();
    this.addEventListener = vi.fn((type, listener) => {
      let listeners = this.listeners.get(type);
      if (!listeners) {
        listeners = new Set();
        this.listeners.set(type, listeners);
      }
      listeners.add(listener);
    });
    this.removeEventListener = vi.fn((type, listener) => {
      this.listeners.get(type)?.delete(listener);
    });
  }

  emit(type, event) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }
}

function displayObject(
  parent,
  bounds = { x: 0, y: 0, width: 100, height: 100 },
) {
  return {
    parent,
    visible: true,
    renderable: true,
    eventMode: 'static',
    getBounds: () => bounds,
  };
}

function pointerEvent(target, pointerId, x, y, options = {}) {
  return {
    target,
    pointerId,
    pointerType: options.pointerType ?? 'touch',
    isPrimary: options.isPrimary ?? true,
    button: options.button ?? 0,
    clientX: x,
    clientY: y,
    global: { x, y },
    cancelable: true,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    stopImmediatePropagation: vi.fn(),
  };
}

function keyboardEvent(key, options = {}) {
  return {
    key,
    shiftKey: Boolean(options.shiftKey),
    cancelable: true,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  };
}

function clipboardEvent(text) {
  return {
    cancelable: true,
    clipboardData: {
      getData: vi.fn(() => text),
    },
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  };
}
