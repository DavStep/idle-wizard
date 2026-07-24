// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { gameViewport } from '../../viewport/gameViewport.js';
import {
  CanvasManager,
  resolveCanvasPresentation,
} from './CanvasManager.js';

describe('CanvasManager', () => {
  it('mounts an inert semantic canvas when the UI renderer is unsupported', () => {
    const stage = document.createElement('section');
    const manager = new CanvasManager({
      viewport: gameViewport,
    });

    const canvas = manager.mount(stage);

    expect(canvas.className).toBe('game-canvas game-pixi-canvas');
    expect(canvas.width).toBe(390);
    expect(canvas.height).toBe(844);
    expect(canvas.style.width).toBe('390px');
    expect(canvas.style.height).toBe('844px');
    expect(canvas.style.left).toBe('50%');
    expect(canvas.style.top).toBe('50%');
    expect(canvas.style.transform).toBe('translate(-50%, -50%)');
    expect(canvas.getAttribute('aria-hidden')).toBe('true');
    expect(stage.dataset.rootRunUiRenderer).toBeUndefined();
    expect(manager.getPixiApp()).toBeNull();
    expect(manager.getPixiLayers()).toBeNull();

    manager.unmount();
  });

  it('fails open through the active retained renderer manager', () => {
    const stage = document.createElement('section');
    const manager = new CanvasManager({
      viewport: gameViewport,
      uiRendererEnabled: true,
      isUiRendererSupported: () => false,
    });
    const failOpen = vi.fn();

    manager.mount(stage);
    manager.uiRendererManager = { failOpen };
    manager.failOpenUiRenderer(new Error('render failed'));

    expect(failOpen).toHaveBeenCalledOnce();
    expect(stage.dataset.rootRunUiRenderer).toBe('fallback');

    manager.uiRendererManager = null;
    manager.unmount();
  });

  it('registers the Spine render pipe before initializing the shared Pixi app', async () => {
    const order = [];
    const stage = document.createElement('section');
    stage.getBoundingClientRect = () => ({
      width: 390,
      height: 844,
    });

    class Container {
      constructor() {
        this.scale = { set: vi.fn() };
      }

      addChild(...children) {
        this.children = children;
      }
    }

    class Application {
      constructor() {
        order.push('construct');
        this.stage = new Container();
        this.renderer = {
          resolution: 1,
          resize: vi.fn(),
        };
      }

      async init() {
        order.push('init');
      }

      destroy() {}
    }

    const manager = new CanvasManager({
      viewport: gameViewport,
      uiRendererEnabled: false,
      importSpineRuntime: async () => {
        order.push('spine');
      },
      importPixi: async () => {
        order.push('pixi');
        return { Application, Container };
      },
    });

    manager.mount(stage);
    await manager.whenReady();

    expect(order).toEqual(['spine', 'pixi', 'construct', 'init']);

    manager.unmount();
  });

  it('keeps stale async initialization from crossing an unmount and remount', async () => {
    const firstStage = document.createElement('section');
    const secondStage = document.createElement('section');
    firstStage.getBoundingClientRect = secondStage.getBoundingClientRect = () => ({
      width: 390,
      height: 844,
    });
    let resolveFirstSpine;
    let resolveSecondInit;
    let spineImportCount = 0;
    const firstSpineImport = new Promise((resolve) => {
      resolveFirstSpine = resolve;
    });
    const secondAppInit = new Promise((resolve) => {
      resolveSecondInit = resolve;
    });

    class Container {
      constructor() {
        this.scale = { set: vi.fn() };
      }

      addChild(...children) {
        this.children = children;
      }
    }

    class Application {
      constructor() {
        this.stage = new Container();
        this.renderer = {
          resolution: 1,
          resize: vi.fn(),
        };
      }

      async init() {
        await secondAppInit;
      }

      destroy() {}
    }

    const manager = new CanvasManager({
      viewport: gameViewport,
      uiRendererEnabled: false,
      importSpineRuntime: async () => {
        spineImportCount += 1;
        if (spineImportCount === 1) {
          await firstSpineImport;
        }
      },
      importPixi: async () => ({ Application, Container }),
    });

    manager.mount(firstStage);
    const staleReadyPromise = manager.whenReady();
    manager.unmount();
    const secondCanvas = manager.mount(secondStage);
    const currentReadyPromise = manager.whenReady();
    const currentInitPromise = manager.initPromise;

    resolveFirstSpine();
    await staleReadyPromise;

    expect(manager.canvas).toBe(secondCanvas);
    expect(manager.initPromise).toBe(currentInitPromise);
    expect(manager.getPixiApp()).toBeNull();

    resolveSecondInit();
    await currentReadyPromise;

    expect(manager.canvas).toBe(secondCanvas);
    expect(manager.getPixiApp()).toBeInstanceOf(Application);
    expect(secondStage.dataset.rootRunUiRenderer).toBeUndefined();

    manager.unmount();
  });

  it('uses the viewport source scale for Pixi UI layers', () => {
    class Container {
      constructor() {
        this.scale = { set: vi.fn() };
      }

      addChild(...children) {
        this.children = children;
      }
    }

    const manager = new CanvasManager({ viewport: gameViewport });
    const layers = manager.createLayers({ Container });

    expect(layers.sourceScale).toBe(1);
    expect(layers.sourceWidth).toBe(390);
    expect(layers.sourceHeight).toBe(844);
    expect(layers.ui.scale.set).toHaveBeenCalledWith(1);
    expect(layers.popup.scale.set).toHaveBeenCalledWith(1);
    expect(layers.overlay.scale.set).toHaveBeenCalledWith(1);
  });

  it('matches Root Run contain-fit presentation at the authored viewport', () => {
    expect(
      resolveCanvasPresentation({
        designWidth: 390,
        designHeight: 844,
        availableWidth: 390,
        availableHeight: 844,
        devicePixelRatio: 3,
      }),
    ).toEqual({
      cssWidth: 390,
      cssHeight: 844,
      renderResolution: 3,
    });
  });

  it('folds contain downscaling into renderer resolution', () => {
    const presentation = resolveCanvasPresentation({
      designWidth: 390,
      designHeight: 844,
      availableWidth: 360,
      availableHeight: 800,
      devicePixelRatio: 3,
    });

    expect(presentation.cssWidth).toBe(360);
    expect(presentation.cssHeight).toBe(779);
    expect(presentation.renderResolution).toBeCloseTo((360 / 390) * 3);
  });

  it('folds contain upscaling into renderer resolution', () => {
    const presentation = resolveCanvasPresentation({
      designWidth: 390,
      designHeight: 844,
      availableWidth: 430,
      availableHeight: 932,
      devicePixelRatio: 3,
    });

    expect(presentation.cssWidth).toBe(430);
    expect(presentation.cssHeight).toBe(930);
    expect(presentation.renderResolution).toBeCloseTo((430 / 390) * 3);
  });

  it('resizes the backing store and restores CSS contain size after autoDensity', () => {
    let availableWidth = 390;
    let availableHeight = 844;
    let onResize = null;
    const disconnect = vi.fn();
    const stage = document.createElement('section');
    stage.getBoundingClientRect = () => ({
      width: availableWidth,
      height: availableHeight,
    });
    const manager = new CanvasManager({
      viewport: gameViewport,
      getDevicePixelRatio: () => 3,
      resizeObserverFactory: (callback) => {
        onResize = callback;
        return {
          observe: vi.fn(),
          disconnect,
        };
      },
    });
    const canvas = manager.mount(stage);
    const resize = vi.fn(() => {
      canvas.style.width = '390px';
      canvas.style.height = '844px';
    });
    manager.app = {
      renderer: {
        resolution: 3,
        resize,
      },
    };

    availableWidth = 360;
    availableHeight = 800;
    onResize();

    expect(resize).toHaveBeenCalledWith(
      390,
      844,
      expect.closeTo((360 / 390) * 3),
    );
    expect(canvas.style.width).toBe('360px');
    expect(canvas.style.height).toBe('779px');

    manager.app = null;
    manager.unmount();
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
