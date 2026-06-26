export function preventNativeWorldGestureDefault(event) {
  if (event?.type?.startsWith?.('touch')) {
    const touchCount = event.touches?.length ?? event.targetTouches?.length ?? 0;

    if (touchCount < 2) {
      return;
    }
  }

  if (event.cancelable !== false) {
    event.preventDefault();
  }
}

const WORLD_GESTURE_DEFAULT_EVENTS = [
  'touchstart',
  'touchmove',
  'gesturestart',
  'gesturechange',
];

const WORLD_GESTURE_DEFAULT_OPTIONS = { capture: true, passive: false };

export function addNativeWorldGestureDefaultGuards(
  listener = preventNativeWorldGestureDefault,
  target = globalThis.document,
) {
  if (!target?.addEventListener || !target?.removeEventListener) {
    return () => {};
  }

  for (const eventName of WORLD_GESTURE_DEFAULT_EVENTS) {
    target.addEventListener(eventName, listener, WORLD_GESTURE_DEFAULT_OPTIONS);
  }

  return () => {
    for (const eventName of WORLD_GESTURE_DEFAULT_EVENTS) {
      target.removeEventListener(eventName, listener, WORLD_GESTURE_DEFAULT_OPTIONS);
    }
  };
}
