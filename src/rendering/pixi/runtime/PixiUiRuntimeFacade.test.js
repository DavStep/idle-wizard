import { Container } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { PixiUiRuntimeFacade } from './PixiUiRuntimeFacade.js';

function createView(label) {
  return {
    root: Object.assign(new Container(), { label }),
    bind: vi.fn(),
    applyTheme: vi.fn(),
    layout: vi.fn(),
    activate: vi.fn(function activate() {
      this.root.visible = true;
    }),
    deactivate: vi.fn(function deactivate() {
      this.root.visible = false;
    }),
    destroy: vi.fn(function destroy() {
      this.root.destroy({ children: true });
    }),
  };
}

function createHarness() {
  const layerNames = [
    'root',
    'background',
    'pageWorlds',
    'pageUi',
    'globalChrome',
    'dialogs',
    'tooltips',
    'tutorial',
    'transient',
    'interactionLocks',
  ];
  const layers = Object.fromEntries(layerNames.map((name) => [name, new Container()]));
  const application = { stage: new Container() };
  const projection = { sourceScale: 3, authoredOffsetX: 0 };
  const projectionListeners = new Set();
  const applicationManager = {
    canvas: {},
    initialize: vi.fn(async () => {}),
    getLayers: () => layers,
    getApplication: () => application,
    getProjection: () => projection,
    subscribeProjection: vi.fn((listener, { emitCurrent }) => {
      projectionListeners.add(listener);
      if (emitCurrent) listener(projection);
      return () => projectionListeners.delete(listener);
    }),
    applyTheme: vi.fn(),
    setSplashViewportActive: vi.fn(),
    destroy: vi.fn(),
  };
  const theme = { revisionKey: 'test' };
  const themeListeners = new Set();
  const inputRouter = {
    mount: vi.fn(),
    destroy: vi.fn(),
  };
  const themeManager = {
    mount: vi.fn(),
    getSnapshot: () => theme,
    subscribe: vi.fn((listener, { emitCurrent }) => {
      themeListeners.add(listener);
      if (emitCurrent) listener(theme);
      return () => themeListeners.delete(listener);
    }),
    destroy: vi.fn(),
  };
  return {
    layers,
    application,
    applicationManager,
    inputRouter,
    themeManager,
    assetManager: {
      loadAll: vi.fn(async () => {}),
      destroy: vi.fn(),
    },
  };
}

describe('PixiUiRuntimeFacade', () => {
  it('mounts the central input router on the interactive Pixi stage', async () => {
    const harness = createHarness();
    const runtime = new PixiUiRuntimeFacade(harness);

    await runtime.initialize();

    expect(harness.inputRouter.mount).toHaveBeenCalledWith({
      root: harness.application.stage,
      canvas: harness.applicationManager.canvas,
    });
  });

  it('locks the viewport from text-entry activation before keyboard inset events', async () => {
    const harness = createHarness();
    let activeStateListener = null;
    harness.applicationManager.setTextEntryActive = vi.fn();
    harness.applicationManager.setKeyboardMetrics = vi.fn();
    harness.textEntryService = {
      subscribeActiveState: vi.fn((listener, { emitCurrent }) => {
        activeStateListener = listener;
        if (emitCurrent) {
          listener(false);
        }
        return vi.fn();
      }),
      subscribeKeyboardInset: vi.fn(() => vi.fn()),
      destroy: vi.fn(),
    };
    const runtime = new PixiUiRuntimeFacade(harness);

    await runtime.initialize();
    activeStateListener(true);

    expect(harness.applicationManager.setTextEntryActive).toHaveBeenNthCalledWith(
      1,
      false,
    );
    expect(harness.applicationManager.setTextEntryActive).toHaveBeenNthCalledWith(
      2,
      true,
    );
  });

  it('shows the startup view while remaining production assets load', async () => {
    const harness = createHarness();
    let finishRemainingAssets = null;
    harness.assetManager.loadCritical = vi.fn(async () => {});
    harness.assetManager.loadRemaining = vi.fn(
      ({ onProgress }) =>
        new Promise((resolve) => {
          onProgress(0.25);
          finishRemainingAssets = () => {
            onProgress(1);
            resolve();
          };
        }),
    );
    const startupView = Object.assign(new Container(), {
      applyTheme: vi.fn(),
      layout: vi.fn(),
      setProgress: vi.fn(),
    });
    const runtime = new PixiUiRuntimeFacade({
      ...harness,
      startupViewFactory: vi.fn(() => startupView),
    });

    const initializePromise = runtime.initialize();
    await vi.waitFor(() => {
      expect(harness.assetManager.loadRemaining).toHaveBeenCalledTimes(1);
    });

    expect(harness.assetManager.loadCritical).toHaveBeenCalledTimes(1);
    expect(startupView.parent).toBe(harness.layers.interactionLocks);
    expect(startupView.setProgress).toHaveBeenLastCalledWith(0.25);
    expect(
      harness.applicationManager.setSplashViewportActive,
    ).toHaveBeenCalledWith(true);

    finishRemainingAssets();
    await initializePromise;

    expect(startupView.setProgress).toHaveBeenLastCalledWith(1);
    expect(startupView.destroyed).toBe(true);
    expect(
      harness.applicationManager.setSplashViewportActive,
    ).toHaveBeenLastCalledWith(false);
  });

  it('eagerly constructs pages/globals and constructs each dialog only once', async () => {
    const harness = createHarness();
    const pageFactory = vi.fn(() => createView('page'));
    const globalFactory = vi.fn(() => createView('chrome'));
    const dialogFactory = vi.fn(() => createView('dialog'));
    const runtime = new PixiUiRuntimeFacade(harness);
    runtime
      .registerPage('workshop', pageFactory)
      .registerGlobalSurface('chrome', globalFactory)
      .registerDialog('settings', dialogFactory);

    await runtime.initialize();
    expect(pageFactory).toHaveBeenCalledTimes(1);
    expect(globalFactory).toHaveBeenCalledTimes(1);
    expect(dialogFactory).not.toHaveBeenCalled();
    expect(runtime.getDialogIds()).toEqual(['settings']);

    runtime.activatePage('workshop');
    runtime.openDialog('settings', { page: 1 });
    runtime.closeDialog('settings');
    runtime.openDialog('settings', { page: 2 });

    expect(dialogFactory).toHaveBeenCalledTimes(1);
    expect(runtime.getStats().pages.registered).toBe(1);
    expect(runtime.getStats().dialogs.constructed).toBe(1);
  });
});
