/* @vitest-environment jsdom */

import { describe, expect, it, vi } from 'vitest';

import { TutorialPointerSpineManager } from './TutorialPointerSpineManager.js';

describe('TutorialPointerSpineManager', () => {
  it('loads the pointer Spine into a local Pixi canvas and controls playback', async () => {
    const pointer = document.createElement('span');
    const originalDevicePixelRatio = window.devicePixelRatio;
    Object.defineProperty(window, 'devicePixelRatio', {
      configurable: true,
      value: 2,
    });
    pointer.style.setProperty('--style-ui-scale', '3');
    const app = {
      init: vi.fn(async () => null),
      stage: { addChild: vi.fn() },
      ticker: {
        start: vi.fn(),
        stop: vi.fn(),
      },
      destroy: vi.fn(),
    };
    const Application = vi.fn(function Application() {
      return app;
    });
    const spine = {
      update: vi.fn(),
      getBounds: vi.fn(() => ({ x: 0, y: 0, width: 44, height: 64 })),
      scale: { set: vi.fn() },
      position: { set: vi.fn() },
      skeleton: { data: { animations: [{ name: 'click1' }] } },
      state: { setAnimation: vi.fn(), timeScale: 1 },
    };
    const assetManager = {
      loadSkeleton: vi.fn(async () => null),
      createSkeleton: vi.fn(async () => spine),
    };
    const manager = new TutorialPointerSpineManager({
      assetManager,
      importPixi: vi.fn(async () => ({ Application })),
      enabled: true,
    });

    try {
      manager.mount(pointer);
      await manager.whenReady();

      const canvas = pointer.querySelector('.tutorial-layer__pointer-spine');

      expect(canvas).not.toBeNull();
      expect(pointer.dataset.spineReady).toBe('true');
      expect(assetManager.loadSkeleton).toHaveBeenCalledWith({
        key: 'tutorial:pointer',
        skeletonSrc: '/tutorial/pointer/pointer.skel',
        atlasSrc: '/tutorial/pointer/pointer.atlas',
      });
      expect(assetManager.createSkeleton).toHaveBeenCalledWith({
        key: 'tutorial:pointer',
        autoUpdate: true,
        ticker: app.ticker,
      });
      expect(app.init).toHaveBeenCalledWith(
        expect.objectContaining({
          canvas,
          width: 76,
          height: 90,
          backgroundAlpha: 0,
          resolution: 6,
        }),
      );
      expect(app.stage.addChild).toHaveBeenCalledWith(spine);
      expect(spine.scale.set).toHaveBeenCalledWith(40 / 44);
      expect(spine.state.setAnimation).toHaveBeenCalledWith(0, 'click1', true);
      expect(app.ticker.stop).toHaveBeenCalled();

      manager.setVisible(true);
      expect(spine.state.timeScale).toBe(1);
      expect(app.ticker.start).toHaveBeenCalled();

      manager.setMotionEnabled(false);
      expect(spine.state.timeScale).toBe(0);
      expect(app.ticker.stop).toHaveBeenCalledTimes(2);

      manager.unmount();

      expect(pointer.dataset.spineReady).toBeUndefined();
      expect(app.destroy).toHaveBeenCalled();
    } finally {
      Object.defineProperty(window, 'devicePixelRatio', {
        configurable: true,
        value: originalDevicePixelRatio,
      });
    }
  });
});
