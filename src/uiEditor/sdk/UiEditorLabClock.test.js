import { describe, expect, it, vi } from 'vitest';

import { UiEditorLabClock } from './UiEditorLabClock.js';

describe('UiEditorLabClock', () => {
  it('plays, advances deterministically, pauses, and resets', () => {
    let frameCallback = null;
    let now = 100;
    const listener = vi.fn();
    const clock = new UiEditorLabClock({
      cancelFrame: vi.fn(),
      now: () => now,
      requestFrame: vi.fn((callback) => {
        frameCallback = callback;
        return 7;
      }),
    });
    clock.subscribe(listener);

    expect(clock.play()).toBe(true);
    now = 160;
    frameCallback(160);
    expect(clock.now()).toBe(60);
    expect(clock.advance(40)).toBe(true);
    expect(clock.now()).toBe(100);
    expect(clock.pause()).toBe(true);
    clock.reset(25);
    expect(clock.now()).toBe(25);
    expect(listener).toHaveBeenCalled();
  });
});

