// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { CanvasManager } from './CanvasManager.js';

describe('CanvasManager', () => {
  it('mounts the Pixi canvas without starting the DOM mirror by default', () => {
    const stage = document.createElement('section');
    const manager = new CanvasManager({
      viewport: {
        width: 1080,
        height: 2170,
      },
    });

    const canvas = manager.mount(stage);

    expect(canvas.className).toBe('game-canvas game-pixi-canvas');
    expect(canvas.width).toBe(1080);
    expect(canvas.height).toBe(2170);
    expect(canvas.style.width).toBe('100%');
    expect(canvas.style.height).toBe('100%');
    expect(stage.dataset.pixiMirror).toBeUndefined();
    expect(manager.getPixiApp()).toBeNull();
    expect(manager.getPixiLayers()).toBeNull();
  });
});
