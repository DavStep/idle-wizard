// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import { FirstRunIntroViewManager } from './FirstRunIntroViewManager.js';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('FirstRunIntroViewManager', () => {
  it('does not freeze a transparent backdrop when the first step advances quickly', () => {
    vi.useFakeTimers();
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      transform: 'matrix(1.02, 0, 0, 1.02, 0, 0)',
      opacity: '0',
      filter: 'saturate(0.96) contrast(1.02)',
    });
    const stage = document.createElement('section');
    const manager = new FirstRunIntroViewManager();
    manager.mount(stage);
    manager.show();

    manager.advance();

    expect(manager.refs.backdropLayer.style.transform).not.toBe('');
    expect(manager.refs.backdropLayer.style.opacity).toBe('');
    expect(manager.refs.backdropLayer.style.filter).toBe('');

    vi.runAllTimers();

    expect(manager.root.dataset.step).toBe('defeated');
    expect(manager.refs.advance.disabled).toBe(false);
  });
});
