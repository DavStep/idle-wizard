// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getTimerProgressSnapshotForTest,
  setTimerProgressFill,
  stopTimerProgressFill,
} from './timerProgress.js';

describe('timerProgress', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.replaceChildren();
  });

  it('derives progress from total and remaining time', () => {
    expect(
      getTimerProgressSnapshotForTest(
        {
          progress: 0.1,
          remainingMs: 28_000,
          totalMs: 30_000,
        },
        100,
      ),
    ).toMatchObject({
      endTime: 28_100,
      progress: expect.closeTo(0.0667, 4),
      remainingMs: 28_000,
      totalMs: 30_000,
    });
  });

  it('starts continuous fill and reports the same derived timer state to labels', () => {
    const fill = document.createElement('span');
    const updates = [];
    let frameCallback = null;

    document.body.append(fill);
    vi.useFakeTimers();

    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: vi.fn((callback) => {
        frameCallback = callback;
        return 1;
      }),
    });

    setTimerProgressFill(
      fill,
      {
        progress: 0.1,
        remainingMs: 28_000,
        totalMs: 30_000,
      },
      {
        onUpdate: (snapshot) => updates.push(snapshot),
      },
    );

    expect(updates[0]).toMatchObject({
      percent: 7,
      progress: expect.closeTo(0.0667, 4),
      remainingMs: 28_000,
    });
    expect(fill.style.transform).toBe('scaleX(0.0667)');

    frameCallback();

    expect(fill.classList.contains('is-progress-running')).toBe(true);
    expect(fill.style.transition).toBe('transform 28000ms linear');
    expect(fill.style.transform).toBe('scaleX(1)');

    stopTimerProgressFill(fill, 0);
  });

  it('updates labels at the next displayed-second boundary', () => {
    const fill = document.createElement('span');
    const updates = [];
    let frameCallback = null;

    document.body.append(fill);
    vi.useFakeTimers();

    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: vi.fn((callback) => {
        frameCallback = callback;
        return 1;
      }),
    });

    setTimerProgressFill(
      fill,
      {
        progress: 0.25,
        remainingMs: 1_500,
        totalMs: 2_000,
      },
      {
        onUpdate: (snapshot) => updates.push(snapshot),
      },
    );
    frameCallback();

    vi.advanceTimersByTime(500);

    expect(updates.at(-1)).toMatchObject({
      percent: 50,
      progress: 0.5,
      remainingMs: 1_000,
    });

    vi.advanceTimersByTime(1_000);

    expect(updates.at(-1)).toMatchObject({
      percent: 100,
      progress: 1,
      remainingMs: 0,
    });
  });
});
