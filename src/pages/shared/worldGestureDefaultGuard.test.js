// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { addNativeWorldGestureDefaultGuards } from './worldGestureDefaultGuard.js';

function createTouchEvent(type, touchCount) {
  const event = new window.Event(type, {
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(event, 'touches', {
    value: Array.from({ length: touchCount }, (_, index) => ({ identifier: index })),
  });
  return event;
}

describe('worldGestureDefaultGuard', () => {
  it('blocks document-level multi-touch gestures and removes the guard', () => {
    const target = new window.EventTarget();
    const removeGuards = addNativeWorldGestureDefaultGuards(undefined, target);
    const singleTouchStart = createTouchEvent('touchstart', 1);
    const multiTouchMove = createTouchEvent('touchmove', 2);
    const gestureStart = new window.Event('gesturestart', {
      bubbles: true,
      cancelable: true,
    });

    target.dispatchEvent(singleTouchStart);
    target.dispatchEvent(multiTouchMove);
    target.dispatchEvent(gestureStart);

    expect(singleTouchStart.defaultPrevented).toBe(false);
    expect(multiTouchMove.defaultPrevented).toBe(true);
    expect(gestureStart.defaultPrevented).toBe(true);

    removeGuards();

    const afterRemoveMove = createTouchEvent('touchmove', 2);
    target.dispatchEvent(afterRemoveMove);

    expect(afterRemoveMove.defaultPrevented).toBe(false);
  });
});
