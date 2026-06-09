import { describe, expect, it } from 'vitest';

import { gameViewport } from './gameViewport.js';

describe('gameViewport', () => {
  it('keeps the authored mobile viewport at 1080x2170', () => {
    expect(gameViewport.width).toBe(1080);
    expect(gameViewport.height).toBe(2170);
    expect(gameViewport.aspectRatio).toBeCloseTo(1080 / 2170);
  });
});
