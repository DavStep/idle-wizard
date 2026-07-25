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

    runtime.activatePage('workshop');
    runtime.openDialog('settings', { page: 1 });
    runtime.closeDialog('settings');
    runtime.openDialog('settings', { page: 2 });

    expect(dialogFactory).toHaveBeenCalledTimes(1);
    expect(runtime.getStats().pages.registered).toBe(1);
    expect(runtime.getStats().dialogs.constructed).toBe(1);
  });
});
