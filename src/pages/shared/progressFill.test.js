// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import { setProgressFill, stopProgressFill } from './progressFill.js';

describe('progressFill', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sets progress through transform without requiring animation support', () => {
    const fill = document.createElement('span');

    setProgressFill(fill, 0.25);

    expect(fill.classList.contains('is-smooth-progress-fill')).toBe(true);
    expect(fill.style.width).toBe('100%');
    expect(fill.style.transform).toBe('scaleX(0.25)');
    expect(fill.style.transition).toBe('none');
  });

  it('starts one compositor transition toward timer completion', () => {
    const fill = document.createElement('span');
    const getComputedStyle = vi.spyOn(window, 'getComputedStyle');
    let frameCallback = null;
    const requestAnimationFrame = vi.fn((callback) => {
      frameCallback = callback;
      return 1;
    });

    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: requestAnimationFrame,
    });

    setProgressFill(fill, 0.25, { smooth: true, remainingMs: 1_500 });

    expect(fill.style.transform).toBe('scaleX(0.25)');
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);

    frameCallback();

    expect(getComputedStyle).toHaveBeenCalledWith(fill);
    expect(fill.classList.contains('is-progress-running')).toBe(true);
    expect(fill.style.transition).toBe('transform 1500ms linear');
    expect(fill.style.transform).toBe('scaleX(1)');

    fill.dispatchEvent(new window.TransitionEvent('transitionend', { propertyName: 'transform' }));

    expect(fill.classList.contains('is-progress-running')).toBe(false);
  });

  it('softens stepped progress without running a full timer transition', () => {
    const fill = document.createElement('span');
    const requestAnimationFrame = vi.fn();

    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: requestAnimationFrame,
    });

    setProgressFill(fill, 0.5, {
      smooth: 'step',
      remainingMs: 6_000,
      stepMs: 120,
    });

    expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(fill.classList.contains('is-smooth-progress-fill')).toBe(true);
    expect(fill.classList.contains('is-progress-running')).toBe(false);
    expect(fill.style.transition).toBe('transform 120ms linear');
    expect(fill.style.transform).toBe('scaleX(0.5)');
  });

  it('keeps stepped progress smoothing when remaining time is not supplied', () => {
    const fill = document.createElement('span');

    setProgressFill(fill, 0.5, {
      smooth: 'step',
      stepMs: 120,
    });

    expect(fill.style.transition).toBe('transform 120ms linear');
    expect(fill.style.transform).toBe('scaleX(0.5)');
  });

  it('caps stepped progress smoothing by remaining time', () => {
    const fill = document.createElement('span');

    setProgressFill(fill, 0.98, {
      smooth: 'step',
      remainingMs: 80,
      stepMs: 480,
    });

    expect(fill.style.transition).toBe('transform 80ms linear');
    expect(fill.style.transform).toBe('scaleX(0.98)');
  });

  it('stops active progress immediately', () => {
    const fill = document.createElement('span');

    stopProgressFill(fill, 0);

    expect(fill.style.width).toBe('100%');
    expect(fill.style.transform).toBe('scaleX(0)');
    expect(fill.classList.contains('is-progress-running')).toBe(false);
  });
});
