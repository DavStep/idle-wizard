// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { ACCOUNT_LINK_CHOICE_OVERWRITE_ACCOUNT } from './AppAccountLinkChoiceManager.js';
import { AppLifecycleManager } from './AppLifecycleManager.js';

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

function createLifecycle({ accountLinkChoiceManager, authFacade } = {}) {
  const root = document.createElement('div');
  const shell = document.createElement('main');
  const stage = document.createElement('section');
  let backendCallbacks = null;
  let retryCallback = null;
  const authFacadeFake = authFacade ?? {
    getPendingAccountLinkSave: vi.fn(() => null),
    clearPendingAccountLinkSave: vi.fn(),
    getSnapshot: vi.fn(() => ({ oidc: { authenticated: false } })),
  };

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
      loadPersistenceSave: vi.fn(() => true),
      savePersistenceSnapshot: vi.fn(),
    },
    backendFacade: {
      prepare: vi.fn(),
      start: vi.fn((callbacks) => {
        backendCallbacks = callbacks;
        return Promise.resolve({ ok: true });
      }),
      stop: vi.fn(),
      getAuthFacade: vi.fn(() => authFacadeFake),
    },
    playerFacade: {},
    onlineGateManager: {
      mount: vi.fn(() => stage.append(document.createElement('div'))),
      showConnecting: vi.fn(),
      showOffline: vi.fn(),
      hide: vi.fn(),
      unmount: vi.fn(),
    },
    accountLinkChoiceManager: accountLinkChoiceManager ?? {
      mount: vi.fn(),
      choose: vi.fn(() => Promise.resolve('forget_device')),
      unmount: vi.fn(),
    },
    connectionRetryManager: {
      reset: vi.fn(),
      clear: vi.fn(),
      schedule: vi.fn((callback) => {
        retryCallback = callback;
        return 1000;
      }),
    },
    deployRefreshManager: {
      mount: vi.fn(),
      unmount: vi.fn(),
    },
  });

  return {
    lifecycle,
    stage,
    authFacade: authFacadeFake,
    getBackendCallbacks: () => backendCallbacks,
    getRetryCallback: () => retryCallback,
  };
}

describe('AppLifecycleManager', () => {
  it('does not run the game loop until the server connects', async () => {
    const { lifecycle, stage, getBackendCallbacks } = createLifecycle();

    lifecycle.start();
    await flushPromises();

    expect(lifecycle.onlineGateManager.showConnecting).toHaveBeenCalledTimes(1);
    expect(lifecycle.deployRefreshManager.mount).toHaveBeenCalledWith(stage);
    expect(lifecycle.renderFacade.startFrameLoop).not.toHaveBeenCalled();

    getBackendCallbacks().onOnline();

    expect(lifecycle.onlineGateManager.hide).toHaveBeenCalledTimes(1);
    expect(lifecycle.renderFacade.startFrameLoop).toHaveBeenCalledTimes(1);
  });

  it('stops the game loop and blocks input when the server disconnects', async () => {
    const { lifecycle, getBackendCallbacks, getRetryCallback } = createLifecycle();

    lifecycle.start();
    await flushPromises();
    getBackendCallbacks().onOnline();
    getBackendCallbacks().onOffline({ reason: 'disconnect' });

    expect(lifecycle.renderFacade.stopFrameLoop).toHaveBeenCalledTimes(1);
    expect(lifecycle.onlineGateManager.showConnecting).toHaveBeenCalledTimes(2);
    expect(lifecycle.onlineGateManager.showOffline).not.toHaveBeenCalled();
    expect(lifecycle.connectionRetryManager.schedule).toHaveBeenCalledTimes(1);

    getRetryCallback()();
    await flushPromises();

    expect(lifecycle.backendFacade.start).toHaveBeenCalledTimes(2);
  });

  it('reconnects when gameplay save sync times out', async () => {
    const { lifecycle, getBackendCallbacks, getRetryCallback } = createLifecycle();

    lifecycle.start();
    await flushPromises();
    getBackendCallbacks().onOnline();
    getBackendCallbacks().onOffline({ reason: 'gameplay_save_timeout' });

    expect(lifecycle.renderFacade.stopFrameLoop).toHaveBeenCalledTimes(1);
    expect(lifecycle.onlineGateManager.showConnecting).toHaveBeenCalledTimes(2);
    expect(lifecycle.onlineGateManager.showOffline).not.toHaveBeenCalled();
    expect(lifecycle.connectionRetryManager.schedule).toHaveBeenCalledTimes(1);

    getRetryCallback()();
    await flushPromises();

    expect(lifecycle.backendFacade.start).toHaveBeenCalledTimes(2);
  });

  it('does not reconnect when the account is active elsewhere', async () => {
    const { lifecycle, getBackendCallbacks } = createLifecycle();

    lifecycle.start();
    await flushPromises();
    getBackendCallbacks().onOnline();
    getBackendCallbacks().onOffline({ reason: 'account_in_use' });

    expect(lifecycle.renderFacade.stopFrameLoop).toHaveBeenCalledTimes(1);
    expect(lifecycle.onlineGateManager.showOffline).toHaveBeenCalledWith(
      'account_in_use',
    );
    expect(lifecycle.connectionRetryManager.clear).toHaveBeenCalledTimes(1);
    expect(lifecycle.connectionRetryManager.schedule).not.toHaveBeenCalled();
  });

  it('keeps connecting and retries when backend startup hits a transient error', async () => {
    const { lifecycle, getRetryCallback } = createLifecycle();
    lifecycle.backendFacade.start.mockRejectedValueOnce(new Error('server booting'));

    lifecycle.start();
    await flushPromises();

    expect(lifecycle.renderFacade.startFrameLoop).not.toHaveBeenCalled();
    expect(lifecycle.onlineGateManager.showConnecting).toHaveBeenCalledTimes(2);
    expect(lifecycle.onlineGateManager.showOffline).not.toHaveBeenCalled();
    expect(lifecycle.connectionRetryManager.schedule).toHaveBeenCalledTimes(1);

    getRetryCallback()();
    await flushPromises();

    expect(lifecycle.backendFacade.start).toHaveBeenCalledTimes(2);
  });

  it('unmounts the deploy refresh gate when the app stops', async () => {
    const { lifecycle } = createLifecycle();

    lifecycle.start();
    await flushPromises();
    lifecycle.stop();

    expect(lifecycle.deployRefreshManager.unmount).toHaveBeenCalledTimes(1);
  });

  it('mounts and unmounts the account link choice gate with the stage', async () => {
    const accountLinkChoiceManager = {
      mount: vi.fn(),
      choose: vi.fn(() => Promise.resolve('forget_device')),
      unmount: vi.fn(),
    };
    const { lifecycle, stage } = createLifecycle({ accountLinkChoiceManager });

    lifecycle.start();
    await flushPromises();
    lifecycle.stop();

    expect(accountLinkChoiceManager.mount).toHaveBeenCalledWith(stage);
    expect(accountLinkChoiceManager.unmount).toHaveBeenCalledTimes(1);
  });

  it('overwrites the connected account when selected after Google login', async () => {
    const deviceSave = { tasks: { currentLevel: 4 } };
    const accountSave = { tasks: { currentLevel: 2 } };
    const accountLinkChoiceManager = {
      mount: vi.fn(),
      choose: vi.fn(() => Promise.resolve(ACCOUNT_LINK_CHOICE_OVERWRITE_ACCOUNT)),
      unmount: vi.fn(),
    };
    const authFacade = {
      getPendingAccountLinkSave: vi.fn(() => deviceSave),
      clearPendingAccountLinkSave: vi.fn(),
      getSnapshot: vi.fn(() => ({ oidc: { authenticated: true } })),
    };
    const { lifecycle } = createLifecycle({ accountLinkChoiceManager, authFacade });

    await lifecycle.handleGameplaySaveReady({ save: accountSave });

    expect(lifecycle.onlineGateManager.hide).toHaveBeenCalledTimes(1);
    expect(accountLinkChoiceManager.choose).toHaveBeenCalledWith({
      deviceSave,
      accountSave,
    });
    expect(authFacade.clearPendingAccountLinkSave).toHaveBeenCalledTimes(1);
    expect(lifecycle.gameplayFacade.loadPersistenceSave).toHaveBeenCalledWith(
      deviceSave,
      lifecycle.ecsFacade,
    );
    expect(lifecycle.gameplayFacade.savePersistenceSnapshot).toHaveBeenCalledTimes(1);
  });

  it('keeps the device save without prompting when a new Google account has no save', async () => {
    const deviceSave = { tasks: { currentLevel: 4 } };
    const accountLinkChoiceManager = {
      mount: vi.fn(),
      choose: vi.fn(() => Promise.resolve(ACCOUNT_LINK_CHOICE_OVERWRITE_ACCOUNT)),
      unmount: vi.fn(),
    };
    const authFacade = {
      getPendingAccountLinkSave: vi.fn(() => deviceSave),
      clearPendingAccountLinkSave: vi.fn(),
      getSnapshot: vi.fn(() => ({ oidc: { authenticated: true } })),
    };
    const { lifecycle } = createLifecycle({ accountLinkChoiceManager, authFacade });

    await lifecycle.handleGameplaySaveReady({ save: null });

    expect(lifecycle.onlineGateManager.hide).toHaveBeenCalledTimes(1);
    expect(accountLinkChoiceManager.choose).not.toHaveBeenCalled();
    expect(authFacade.clearPendingAccountLinkSave).toHaveBeenCalledTimes(1);
    expect(lifecycle.gameplayFacade.loadPersistenceSave).toHaveBeenCalledWith(
      deviceSave,
      lifecycle.ecsFacade,
    );
    expect(lifecycle.gameplayFacade.savePersistenceSnapshot).toHaveBeenCalledTimes(1);
  });

  it('forgets the device save when selected after Google login', async () => {
    const deviceSave = { tasks: { currentLevel: 4 } };
    const accountSave = { tasks: { currentLevel: 2 } };
    const accountLinkChoiceManager = {
      mount: vi.fn(),
      choose: vi.fn(() => Promise.resolve('forget_device')),
      unmount: vi.fn(),
    };
    const authFacade = {
      getPendingAccountLinkSave: vi.fn(() => deviceSave),
      clearPendingAccountLinkSave: vi.fn(),
      getSnapshot: vi.fn(() => ({ oidc: { authenticated: true } })),
    };
    const { lifecycle } = createLifecycle({ accountLinkChoiceManager, authFacade });

    await lifecycle.handleGameplaySaveReady({ save: accountSave });

    expect(lifecycle.gameplayFacade.loadPersistenceSave).toHaveBeenCalledWith(
      accountSave,
      lifecycle.ecsFacade,
    );
    expect(lifecycle.gameplayFacade.savePersistenceSnapshot).toHaveBeenCalledTimes(1);
  });

  it('keeps the gate up when backend startup fails', async () => {
    const { lifecycle } = createLifecycle();
    lifecycle.backendFacade.start.mockResolvedValueOnce({
      ok: false,
      reason: 'bindings_missing',
    });

    lifecycle.start();
    await flushPromises();

    expect(lifecycle.renderFacade.startFrameLoop).not.toHaveBeenCalled();
    expect(lifecycle.onlineGateManager.showOffline).toHaveBeenCalledWith('bindings_missing');
    expect(lifecycle.connectionRetryManager.schedule).not.toHaveBeenCalled();
  });
});
