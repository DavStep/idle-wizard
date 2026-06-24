// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { PixiProgressOverlayManager } from './PixiProgressOverlayManager.js';

class FakeContainer {
  constructor() {
    this.children = [];
    this.destroyed = false;
  }

  addChild(child) {
    this.children.push(child);
    return child;
  }

  destroy() {
    this.destroyed = true;
  }
}

class FakeGraphics {
  constructor() {
    this.visible = true;
    this.destroyed = false;
    this.rectArgs = null;
    this.fillArgs = null;
  }

  clear() {
    this.rectArgs = null;
    this.fillArgs = null;
  }

  rect(x, y, width, height) {
    this.rectArgs = { x, y, width, height };
  }

  fill(fill) {
    this.fillArgs = fill;
  }

  destroy() {
    this.destroyed = true;
  }
}

function setRect(element, rect) {
  element.getBoundingClientRect = () => ({
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  });
}

function createManager({ enabled = true } = {}) {
  const stage = document.createElement('section');
  const canvas = document.createElement('canvas');
  const progress = document.createElement('span');
  const fill = document.createElement('span');
  const rootLayer = new FakeContainer();
  const layers = {
    root: rootLayer,
    sourceScale: 3,
  };
  const whenPixiReady = vi.fn(async () => layers);
  const manager = new PixiProgressOverlayManager({
    enabled,
    viewport: { width: 1080, height: 2170 },
    whenPixiReady,
    getLayers: () => layers,
    getCanvas: () => canvas,
    loadPrimitives: async () => ({
      Container: FakeContainer,
      Graphics: FakeGraphics,
    }),
    getComputedStyle: (element) => {
      if (element === progress) {
        return {
          borderLeftWidth: '1px',
          borderRightWidth: '1px',
          borderTopWidth: '1px',
          borderBottomWidth: '1px',
        };
      }

      if (element === fill) {
        return {
          backgroundColor: 'rgb(26, 26, 26)',
        };
      }

      return {
        getPropertyValue: (name) => (name === '--style-text' ? '#1a1a1a' : ''),
      };
    },
  });

  setRect(canvas, { left: 0, top: 0, width: 540, height: 1085 });
  setRect(progress, { left: 10, top: 20, width: 100, height: 10 });
  manager.mount(stage);

  return {
    manager,
    progress,
    fill,
    rootLayer,
    whenPixiReady,
  };
}

describe('PixiProgressOverlayManager', () => {
  it('does nothing when disabled', () => {
    const { manager, progress, fill, whenPixiReady } = createManager({ enabled: false });
    const controller = manager.registerBar('garden:plot:1', {
      progressElement: progress,
      fillElement: fill,
    });

    expect(controller.setProgress(0.5)).toBe(false);

    expect(whenPixiReady).not.toHaveBeenCalled();
    expect(fill.style.visibility).toBe('');
  });

  it('draws a retained Pixi fill over the progress content box', async () => {
    const { manager, progress, fill, rootLayer } = createManager();
    const controller = manager.registerBar('garden:plot:1', {
      progressElement: progress,
      fillElement: fill,
    });

    controller.setProgress(0.5);
    await manager.ensureReady();

    const overlayRoot = rootLayer.children[0];
    const graphic = overlayRoot.children[0];

    expect(graphic.rectArgs).toEqual({
      x: 23,
      y: 43,
      width: 97,
      height: 14,
    });
    expect(graphic.fillArgs).toEqual({ color: 0x1a1a1a, alpha: 1 });
    expect(graphic.visible).toBe(true);
    expect(fill.style.visibility).toBe('hidden');
    expect(controller.isActive()).toBe(true);
  });

  it('restores the DOM fill when hidden or unmounted', async () => {
    const { manager, progress, fill } = createManager();
    const controller = manager.registerBar('garden:plot:1', {
      progressElement: progress,
      fillElement: fill,
    });

    fill.style.visibility = 'visible';
    controller.setProgress(0.5);
    await manager.ensureReady();

    expect(fill.style.visibility).toBe('hidden');

    controller.hide();

    expect(fill.style.visibility).toBe('visible');
    expect(controller.isActive()).toBe(false);

    controller.setProgress(0.5);
    await manager.ensureReady();
    manager.unmount();

    expect(fill.style.visibility).toBe('visible');
  });
});
