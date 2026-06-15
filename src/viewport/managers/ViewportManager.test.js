/* @vitest-environment jsdom */

import { describe, expect, it, vi } from 'vitest';

import { ViewportManager } from './ViewportManager.js';

describe('ViewportManager', () => {
  it('stages the initial control reveal and clears it after startup', () => {
    vi.useFakeTimers();

    try {
      const parent = document.createElement('main');
      const manager = new ViewportManager({ viewport: { width: 1080, height: 2170 } });

      const stage = manager.mount(parent);

      expect(stage.classList.contains('is-control-revealing')).toBe(true);

      vi.advanceTimersByTime(720);

      expect(stage.classList.contains('is-control-revealing')).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
