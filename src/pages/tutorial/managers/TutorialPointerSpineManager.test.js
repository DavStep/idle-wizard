/* @vitest-environment jsdom */

import { describe, expect, it, vi } from 'vitest';

import {
  TutorialPointerSpineManager,
  resolvePublicAssetUrl,
} from './TutorialPointerSpineManager.js';

describe('TutorialPointerSpineManager', () => {
  it('resolves public pointer asset URLs against the deployed base path', () => {
    expect(
      resolvePublicAssetUrl('tutorial/pointer/pointer.skel', '/idle-wizard/'),
    ).toBe('/idle-wizard/tutorial/pointer/pointer.skel');
    expect(
      resolvePublicAssetUrl('/tutorial/pointer/pointer.atlas', '/idle-wizard'),
    ).toBe('/idle-wizard/tutorial/pointer/pointer.atlas');
    expect(resolvePublicAssetUrl('tutorial/pointer/pointer.skel', '/')).toBe(
      '/tutorial/pointer/pointer.skel',
    );
  });

  it('waits for a graphics runtime before loading the Spine pointer by default', () => {
    const pointer = document.createElement('span');
    const importPixi = vi.fn(async () => ({}));
    const manager = new TutorialPointerSpineManager({ importPixi });

    manager.mount(pointer);

    expect(importPixi).not.toHaveBeenCalled();
    expect(pointer.dataset.spineReady).toBeUndefined();
    expect(pointer.querySelector('.tutorial-layer__pointer-spine')).not.toBeNull();
  });

  it('loads the pointer Spine by default when WebGL is available', async () => {
    const pointer = document.createElement('span');
    const originalDevicePixelRatio = window.devicePixelRatio;
    const originalWebGLRenderingContext = window.WebGLRenderingContext;
    Object.defineProperty(window, 'devicePixelRatio', {
      configurable: true,
      value: 2,
    });
    Object.defineProperty(window, 'WebGLRenderingContext', {
      configurable: true,
      value: function WebGLRenderingContext() {},
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
      assetBaseUrl: '/idle-wizard/',
    });

    try {
      manager.mount(pointer);
      await manager.whenReady();

      const canvas = pointer.querySelector('.tutorial-layer__pointer-spine');

      expect(canvas).not.toBeNull();
      expect(pointer.dataset.spineReady).toBe('true');
      expect(assetManager.loadSkeleton).toHaveBeenCalledWith({
        key: 'tutorial:pointer',
        skeletonSrc: '/idle-wizard/tutorial/pointer/pointer.skel',
        atlasSrc: '/idle-wizard/tutorial/pointer/pointer.atlas',
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
          preserveDrawingBuffer: true,
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
      Object.defineProperty(window, 'WebGLRenderingContext', {
        configurable: true,
        value: originalWebGLRenderingContext,
      });
    }
  });
});
