// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { ACCOUNT_LINK_CHOICE_OVERWRITE_ACCOUNT } from './AppAccountLinkChoiceManager.js';
import {
  FRESH_START_CHOICE_CONNECT_ACCOUNT,
  FRESH_START_CHOICE_START_FRESH,
} from './AppFreshStartChoiceManager.js';
import { AppLifecycleManager } from './AppLifecycleManager.js';

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

function createLifecycle({
  accountLinkChoiceManager,
  authFacade,
  freshStartChoiceManager,
  maintenanceFacade,
  pagesFacade,
  playerFacade,
  reload,
} = {}) {
  const root = document.createElement('div');
  const shell = document.createElement('main');
  const stage = document.createElement('section');
  let backendCallbacks = null;
  let retryCallback = null;
  let maintenanceListener = null;
  const authFacadeFake = authFacade ?? {
    getPendingAccountLinkSave: vi.fn(() => null),
    clearPendingAccountLinkSave: vi.fn(),
    getSnapshot: vi.fn(() => ({ oidc: { authenticated: false } })),
    signInWithGoogle: vi.fn(() => Promise.resolve({ ok: false, reason: 'disabled' })),
  };
  const maintenanceFacadeFake = maintenanceFacade ?? {
    getSnapshot: vi.fn(() => ({
      mode: 'off',
      message: 'maintenance in progress',
      active: false,
      updatedAtMs: 0,
    })),
    subscribe: vi.fn((listener) => {
      maintenanceListener = listener;
      listener(maintenanceFacadeFake.getSnapshot());
      return vi.fn();
    }),
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
    pagesFacade: pagesFacade ?? {
      mount: vi.fn(),
      unmount: vi.fn(),
      resetTutorialProgress: vi.fn(),
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
      savePersistenceSnapshotAndFlush: vi.fn(() => Promise.resolve(true)),
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
    playerFacade: playerFacade ?? {},
    maintenanceFacade: maintenanceFacadeFake,
    onlineGateManager: {
      mount: vi.fn(() => stage.append(document.createElement('div'))),
      showConnecting: vi.fn(),
      showOffline: vi.fn(),
      showMaintenance: vi.fn(),
      hide: vi.fn(),
      unmount: vi.fn(),
    },
    accountLinkChoiceManager: accountLinkChoiceManager ?? {
      mount: vi.fn(),
      choose: vi.fn(() => Promise.resolve('forget_device')),
      unmount: vi.fn(),
    },
    freshStartChoiceManager: freshStartChoiceManager ?? {
      mount: vi.fn(),
      choose: vi.fn(() => Promise.resolve(FRESH_START_CHOICE_START_FRESH)),
      unmount: vi.fn(),
    },
    interactionLockManager: {
      mount: vi.fn(),
      lock: vi.fn(),
      unlock: vi.fn(),
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
    reload: reload ?? vi.fn(),
  });

  return {
    lifecycle,
    stage,
    authFacade: authFacadeFake,
    maintenanceFacade: maintenanceFacadeFake,
    getBackendCallbacks: () => backendCallbacks,
    getRetryCallback: () => retryCallback,
    setMaintenance: (snapshot) => maintenanceListener?.(snapshot),
  };
}

describe('AppLifecycleManager', () => {
  it('does not run the game loop until the server connects', async () => {
    const { lifecycle, stage, getBackendCallbacks } = createLifecycle();

    lifecycle.start();
    await flushPromises();

    expect(lifecycle.onlineGateManager.showConnecting).toHaveBeenCalledTimes(1);
    expect(lifecycle.interactionLockManager.mount).toHaveBeenCalledWith(stage);
    expect(lifecycle.interactionLockManager.lock).toHaveBeenCalledWith('connecting');
    expect(lifecycle.deployRefreshManager.mount).toHaveBeenCalledWith(stage);
    expect(lifecycle.renderFacade.startFrameLoop).not.toHaveBeenCalled();

    getBackendCallbacks().onOnline();

    expect(lifecycle.onlineGateManager.hide).toHaveBeenCalledTimes(1);
    expect(lifecycle.interactionLockManager.unlock).toHaveBeenCalledTimes(1);
    expect(lifecycle.renderFacade.startFrameLoop).toHaveBeenCalledTimes(1);
  });

  it('stops the game loop and blocks input when the server disconnects', async () => {
    const { lifecycle, getBackendCallbacks, getRetryCallback } = createLifecycle();

    lifecycle.start();
    await flushPromises();
    getBackendCallbacks().onOnline();
    getBackendCallbacks().onOffline({ reason: 'disconnect' });

    expect(lifecycle.interactionLockManager.lock).toHaveBeenLastCalledWith(
      'disconnect',
    );
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

    expect(lifecycle.interactionLockManager.lock).toHaveBeenLastCalledWith(
      'account_in_use',
    );
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

    expect(lifecycle.interactionLockManager.unmount).toHaveBeenCalledTimes(1);
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

  it('mounts and unmounts the fresh start choice gate with the stage', async () => {
    const freshStartChoiceManager = {
      mount: vi.fn(),
      choose: vi.fn(() => Promise.resolve(FRESH_START_CHOICE_START_FRESH)),
      unmount: vi.fn(),
    };
    const { lifecycle, stage } = createLifecycle({ freshStartChoiceManager });

    lifecycle.start();
    await flushPromises();
    lifecycle.stop();

    expect(freshStartChoiceManager.mount).toHaveBeenCalledWith(stage);
    expect(freshStartChoiceManager.unmount).toHaveBeenCalledTimes(1);
  });

  it('pauses gameplay and flushes the last save when maintenance drains', async () => {
    const { lifecycle, getBackendCallbacks, setMaintenance } = createLifecycle();

    lifecycle.start();
    await flushPromises();
    getBackendCallbacks().onOnline();

    expect(lifecycle.renderFacade.startFrameLoop).toHaveBeenCalledTimes(1);

    setMaintenance({
      mode: 'drain',
      message: 'maintenance in progress',
      active: true,
      updatedAtMs: 10,
    });

    expect(lifecycle.renderFacade.stopFrameLoop).toHaveBeenCalledTimes(1);
    expect(lifecycle.gameplayFacade.savePersistenceSnapshotAndFlush).toHaveBeenCalledTimes(1);
    expect(lifecycle.onlineGateManager.showMaintenance).toHaveBeenLastCalledWith(
      expect.objectContaining({ mode: 'drain', saving: true }),
    );

    await flushPromises();

    const settledMaintenanceCall =
      lifecycle.onlineGateManager.showMaintenance.mock.calls.at(-1)?.[0];
    expect(settledMaintenanceCall).toMatchObject({ mode: 'drain' });
    expect(settledMaintenanceCall.saving).toBeUndefined();
    expect(lifecycle.renderFacade.startFrameLoop).toHaveBeenCalledTimes(1);
  });

  it('blocks gameplay without flushing when maintenance is locked', async () => {
    const { lifecycle, getBackendCallbacks, setMaintenance } = createLifecycle();

    lifecycle.start();
    await flushPromises();
    getBackendCallbacks().onOnline();

    setMaintenance({
      mode: 'locked',
      message: 'maintenance in progress',
      active: true,
      updatedAtMs: 11,
    });

    expect(lifecycle.interactionLockManager.lock).toHaveBeenLastCalledWith(
      'maintenance',
    );
    expect(lifecycle.renderFacade.stopFrameLoop).toHaveBeenCalledTimes(1);
    expect(lifecycle.gameplayFacade.savePersistenceSnapshotAndFlush).not.toHaveBeenCalled();
    expect(lifecycle.onlineGateManager.showMaintenance).toHaveBeenLastCalledWith(
      expect.objectContaining({ mode: 'locked' }),
    );
  });

  it('resumes gameplay when maintenance turns off', async () => {
    const { lifecycle, getBackendCallbacks, setMaintenance } = createLifecycle();

    lifecycle.start();
    await flushPromises();
    getBackendCallbacks().onOnline();
    setMaintenance({
      mode: 'locked',
      message: 'maintenance in progress',
      active: true,
      updatedAtMs: 12,
    });

    setMaintenance({
      mode: 'off',
      message: 'maintenance in progress',
      active: false,
      updatedAtMs: 13,
    });

    expect(lifecycle.onlineGateManager.hide).toHaveBeenCalledTimes(2);
    expect(lifecycle.renderFacade.startFrameLoop).toHaveBeenCalledTimes(2);
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
    const { lifecycle } = createLifecycle({
      accountLinkChoiceManager,
      authFacade,
      playerFacade: {
        getSnapshot: vi.fn(() => ({ username: 'Mira' })),
      },
    });

    await lifecycle.handleGameplaySaveReady({ save: accountSave });

    expect(lifecycle.onlineGateManager.hide).toHaveBeenCalledTimes(1);
    expect(accountLinkChoiceManager.choose).toHaveBeenCalledWith({
      deviceSave,
      accountSave,
      accountUsername: 'Mira',
    });
    expect(authFacade.clearPendingAccountLinkSave).toHaveBeenCalledTimes(1);
    expect(lifecycle.gameplayFacade.loadPersistenceSave).toHaveBeenCalledWith(
      deviceSave,
      lifecycle.ecsFacade,
    );
    expect(lifecycle.gameplayFacade.savePersistenceSnapshot).toHaveBeenCalledTimes(1);
  });

  it('asks before loading fresh gameplay data for an anonymous empty save', async () => {
    const freshStartChoiceManager = {
      mount: vi.fn(),
      choose: vi.fn(() => Promise.resolve(FRESH_START_CHOICE_START_FRESH)),
      unmount: vi.fn(),
    };
    const { lifecycle } = createLifecycle({ freshStartChoiceManager });
    lifecycle.gameplayFacade.loadPersistenceSave.mockReturnValueOnce(false);

    await lifecycle.handleGameplaySaveReady({ save: null });

    expect(lifecycle.onlineGateManager.hide).toHaveBeenCalledTimes(1);
    expect(freshStartChoiceManager.choose).toHaveBeenCalledWith({
      authSnapshot: { oidc: { authenticated: false } },
      statusText: null,
    });
    expect(
      lifecycle.onlineGateManager.hide.mock.invocationCallOrder[0],
    ).toBeLessThan(freshStartChoiceManager.choose.mock.invocationCallOrder[0]);
    expect(lifecycle.gameplayFacade.loadPersistenceSave).toHaveBeenCalledWith(
      null,
      lifecycle.ecsFacade,
    );
    expect(lifecycle.pagesFacade.resetTutorialProgress).toHaveBeenCalledTimes(1);
    expect(lifecycle.gameplayFacade.savePersistenceSnapshot).toHaveBeenCalledTimes(1);
  });

  it('resets old tutorial progress before loading fresh gameplay data', async () => {
    const freshStartChoiceManager = {
      mount: vi.fn(),
      choose: vi.fn(() => Promise.resolve(FRESH_START_CHOICE_START_FRESH)),
      unmount: vi.fn(),
    };
    const pagesFacade = {
      mount: vi.fn(),
      unmount: vi.fn(),
      resetTutorialProgress: vi.fn(),
    };
    const { lifecycle } = createLifecycle({ freshStartChoiceManager, pagesFacade });
    lifecycle.gameplayFacade.loadPersistenceSave.mockReturnValueOnce(false);

    await lifecycle.handleGameplaySaveReady({ save: null });

    expect(pagesFacade.resetTutorialProgress).toHaveBeenCalledTimes(1);
    expect(
      pagesFacade.resetTutorialProgress.mock.invocationCallOrder[0],
    ).toBeLessThan(
      lifecycle.gameplayFacade.loadPersistenceSave.mock.invocationCallOrder[0],
    );
  });

  it('connects an account from the fresh start dialog before fresh data is saved', async () => {
    const freshStartChoiceManager = {
      mount: vi.fn(),
      choose: vi
        .fn()
        .mockResolvedValueOnce(FRESH_START_CHOICE_CONNECT_ACCOUNT)
        .mockResolvedValueOnce(FRESH_START_CHOICE_START_FRESH),
      unmount: vi.fn(),
    };
    const authFacade = {
      getPendingAccountLinkSave: vi.fn(() => null),
      clearPendingAccountLinkSave: vi.fn(),
      getSnapshot: vi.fn(() => ({ oidc: { authenticated: false, enabled: true } })),
      signInWithGoogle: vi.fn(() =>
        Promise.resolve({ ok: false, reason: 'native_cancelled' }),
      ),
    };
    const { lifecycle } = createLifecycle({ freshStartChoiceManager, authFacade });

    await lifecycle.handleGameplaySaveReady({ save: null });

    expect(authFacade.signInWithGoogle).toHaveBeenCalledTimes(1);
    expect(freshStartChoiceManager.choose).toHaveBeenNthCalledWith(2, {
      authSnapshot: { oidc: { authenticated: false, enabled: true } },
      statusText: 'login cancelled',
    });
    expect(lifecycle.gameplayFacade.loadPersistenceSave).toHaveBeenCalledWith(
      null,
      lifecycle.ecsFacade,
    );
    expect(lifecycle.pagesFacade.resetTutorialProgress).toHaveBeenCalledTimes(1);
  });

  it('shows web-unavailable fresh-start login failures as unavailable', async () => {
    const freshStartChoiceManager = {
      mount: vi.fn(),
      choose: vi
        .fn()
        .mockResolvedValueOnce(FRESH_START_CHOICE_CONNECT_ACCOUNT)
        .mockResolvedValueOnce(FRESH_START_CHOICE_START_FRESH),
      unmount: vi.fn(),
    };
    const authFacade = {
      getPendingAccountLinkSave: vi.fn(() => null),
      clearPendingAccountLinkSave: vi.fn(),
      getSnapshot: vi.fn(() => ({ oidc: { authenticated: false, enabled: true } })),
      signInWithGoogle: vi.fn(() =>
        Promise.resolve({ ok: false, reason: 'web_unavailable' }),
      ),
    };
    const { lifecycle } = createLifecycle({ freshStartChoiceManager, authFacade });

    await lifecycle.handleGameplaySaveReady({ save: null });

    expect(freshStartChoiceManager.choose).toHaveBeenNthCalledWith(2, {
      authSnapshot: { oidc: { authenticated: false, enabled: true } },
      statusText: 'login unavailable',
    });
  });

  it('does not ask fresh start questions when the account has a save', async () => {
    const freshStartChoiceManager = {
      mount: vi.fn(),
      choose: vi.fn(() => Promise.resolve(FRESH_START_CHOICE_START_FRESH)),
      unmount: vi.fn(),
    };
    const save = { tasks: { currentLevel: 3 } };
    const { lifecycle } = createLifecycle({ freshStartChoiceManager });

    await lifecycle.handleGameplaySaveReady({ save });

    expect(freshStartChoiceManager.choose).not.toHaveBeenCalled();
    expect(lifecycle.pagesFacade.resetTutorialProgress).not.toHaveBeenCalled();
    expect(lifecycle.gameplayFacade.loadPersistenceSave).toHaveBeenCalledWith(
      save,
      lifecycle.ecsFacade,
    );
  });

  it('does not ask fresh start questions for an authenticated account with no save', async () => {
    const freshStartChoiceManager = {
      mount: vi.fn(),
      choose: vi.fn(() => Promise.resolve(FRESH_START_CHOICE_START_FRESH)),
      unmount: vi.fn(),
    };
    const authFacade = {
      getPendingAccountLinkSave: vi.fn(() => null),
      clearPendingAccountLinkSave: vi.fn(),
      getSnapshot: vi.fn(() => ({ oidc: { authenticated: true } })),
      signInWithGoogle: vi.fn(),
    };
    const { lifecycle } = createLifecycle({ freshStartChoiceManager, authFacade });

    await lifecycle.handleGameplaySaveReady({ save: null });

    expect(freshStartChoiceManager.choose).not.toHaveBeenCalled();
    expect(lifecycle.pagesFacade.resetTutorialProgress).toHaveBeenCalledTimes(1);
    expect(lifecycle.gameplayFacade.loadPersistenceSave).toHaveBeenCalledWith(
      null,
      lifecycle.ecsFacade,
    );
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

  it('keeps the connected account without prompting when the device save is level 1', async () => {
    const deviceSave = { tasks: { currentLevel: 1 } };
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
    expect(accountLinkChoiceManager.choose).not.toHaveBeenCalled();
    expect(authFacade.clearPendingAccountLinkSave).toHaveBeenCalledTimes(1);
    expect(lifecycle.gameplayFacade.loadPersistenceSave).toHaveBeenCalledWith(
      accountSave,
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
