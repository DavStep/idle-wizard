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
