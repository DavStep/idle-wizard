import { describe, expect, it } from 'vitest';

import { gameViewport } from './gameViewport.js';

describe('gameViewport', () => {
  it('matches the Root Run logical game resolution', () => {
    expect(gameViewport.width).toBe(390);
    expect(gameViewport.height).toBe(844);
    expect(gameViewport.aspectRatio).toBeCloseTo(390 / 844);
    expect(gameViewport.sourceScale).toBe(1);
  });
});
