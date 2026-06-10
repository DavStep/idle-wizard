import { describe, expect, it } from 'vitest';

import { RenderLoopManager } from './RenderLoopManager.js';

describe('RenderLoopManager', () => {
  it('keeps render delta capped while exposing uncapped timer delta', () => {
    const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = () => 2;

    try {
      const manager = new RenderLoopManager();
      const frames = [];
      manager.onFrame = (frame) => frames.push(frame);
      manager.lastTime = 1_000;
      manager.frameId = 1;

      manager.tick(3_500);

      expect(frames).toEqual([
        {
          time: 3_500,
          deltaSeconds: 0.1,
          timerDeltaSeconds: 2.5,
        },
      ]);
    } finally {
      globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    }
  });
});
