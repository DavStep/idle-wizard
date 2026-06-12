// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { AppLifecycleManager } from './AppLifecycleManager.js';

function createLifecycle() {
  const root = document.createElement('div');
  const shell = document.createElement('main');
  const stage = document.createElement('section');
  let backendCallbacks = null;

  const lifecycle = new AppLifecycleManager({
    shellManager: {
      mount: vi.fn(() => {
        root.append(shell);
        return shell;
      }),
      unmount: vi.fn(() => shell.remove()),
    },
    viewportFacade: {
      mount: vi.fn(() => {
        shell.append(stage);
        return stage;
      }),
      unmount: vi.fn(() => stage.remove()),
    },
    renderFacade: {
      mount: vi.fn(),
      unmount: vi.fn(),
      startFrameLoop: vi.fn(),
      stopFrameLoop: vi.fn(),
    },
    pagesFacade: {
      mount: vi.fn(),
      unmount: vi.fn(),
    },
    ecsFacade: {
      createWorld: vi.fn(),
      destroyWorld: vi.fn(),
      update: vi.fn(),
    },
    gameplayFacade: {
      initialize: vi.fn(),
      shutdown: vi.fn(),
      afterUpdate: vi.fn(),
    },
    backendFacade: {
      prepare: vi.fn(),
      start: vi.fn((callbacks) => {
        backendCallbacks = callbacks;
        return Promise.resolve({ ok: true });
      }),
      stop: vi.fn(),
    },
    playerFacade: {},
    onlineGateManager: {
      mount: vi.fn(() => stage.append(document.createElement('div'))),
      showConnecting: vi.fn(),
      showOffline: vi.fn(),
      hide: vi.fn(),
      unmount: vi.fn(),
    },
    deployRefreshManager: {
      mount: vi.fn(),
      unmount: vi.fn(),
    },
  });

  return {
    lifecycle,
    stage,
    getBackendCallbacks: () => backendCallbacks,
  };
}

describe('AppLifecycleManager', () => {
  it('does not run the game loop until the server connects', async () => {
    const { lifecycle, stage, getBackendCallbacks } = createLifecycle();

    lifecycle.start();
    await Promise.resolve();

    expect(lifecycle.onlineGateManager.showConnecting).toHaveBeenCalledTimes(1);
    expect(lifecycle.deployRefreshManager.mount).toHaveBeenCalledWith(stage);
    expect(lifecycle.renderFacade.startFrameLoop).not.toHaveBeenCalled();

    getBackendCallbacks().onOnline();

    expect(lifecycle.onlineGateManager.hide).toHaveBeenCalledTimes(1);
    expect(lifecycle.renderFacade.startFrameLoop).toHaveBeenCalledTimes(1);
  });

  it('stops the game loop and blocks input when the server disconnects', async () => {
    const { lifecycle, getBackendCallbacks } = createLifecycle();

    lifecycle.start();
    await Promise.resolve();
    getBackendCallbacks().onOnline();
    getBackendCallbacks().onOffline({ reason: 'disconnect' });

    expect(lifecycle.renderFacade.stopFrameLoop).toHaveBeenCalledTimes(1);
    expect(lifecycle.onlineGateManager.showOffline).toHaveBeenCalledWith('disconnect');
  });

  it('unmounts the deploy refresh gate when the app stops', async () => {
    const { lifecycle } = createLifecycle();

    lifecycle.start();
    await Promise.resolve();
    lifecycle.stop();

    expect(lifecycle.deployRefreshManager.unmount).toHaveBeenCalledTimes(1);
  });

  it('keeps the gate up when backend startup fails', async () => {
    const { lifecycle } = createLifecycle();
    lifecycle.backendFacade.start.mockResolvedValueOnce({
      ok: false,
      reason: 'bindings_missing',
    });

    lifecycle.start();
    await Promise.resolve();
    await Promise.resolve();

    expect(lifecycle.renderFacade.startFrameLoop).not.toHaveBeenCalled();
    expect(lifecycle.onlineGateManager.showOffline).toHaveBeenCalledWith('bindings_missing');
  });
});
