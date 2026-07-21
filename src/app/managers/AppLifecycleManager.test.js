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
  appVisibilityManager,
  authFacade,
  freshStartChoiceManager,
  gameplayFacade,
  maintenanceFacade,
  now,
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
  let gameplayListener = null;
  let gameplayTickCallback = null;
  let appVisibilityCallbacks = null;
  const gameplayTickUnsubscribe = vi.fn();
  const authFacadeFake = authFacade ?? {
    getPendingAccountLinkSave: vi.fn(() => null),
    clearPendingAccountLinkSave: vi.fn(),
    getSnapshot: vi.fn(() => ({ hasToken: true, oidc: { authenticated: false } })),
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
  const gameplayFacadeFake = gameplayFacade ?? {
    initialize: vi.fn(),
    shutdown: vi.fn(),
    afterUpdate: vi.fn(),
    subscribe: vi.fn((listener) => {
      gameplayListener = listener;
      return gameplayTickUnsubscribe;
    }),
    getNextGameplayTickDelayMs: vi.fn(() => 1000),
    loadPersistenceSave: vi.fn(() => true),
    resetPersistenceState: vi.fn(() => true),
    savePersistenceSnapshot: vi.fn(),
    savePersistenceSnapshotAndFlush: vi.fn(() => Promise.resolve(true)),
    applyAwayTimerCatchup: vi.fn(),
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
    gameplayFacade: gameplayFacadeFake,
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
    textClipboardGuardManager: {
      mount: vi.fn(),
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
    gameplayTickManager: {
      start: vi.fn((callback) => {
        gameplayTickCallback = callback;
      }),
      stop: vi.fn(),
      requestTick: vi.fn(),
    },
    appVisibilityManager: appVisibilityManager ?? {
      mount: vi.fn((callbacks) => {
        appVisibilityCallbacks = callbacks;
      }),
      unmount: vi.fn(),
    },
    deployRefreshManager: {
      mount: vi.fn(),
      unmount: vi.fn(),
    },
    reload: reload ?? vi.fn(),
    now: now ?? (() => Date.now()),
  });

  return {
    lifecycle,
    stage,
    authFacade: authFacadeFake,
    maintenanceFacade: maintenanceFacadeFake,
    getBackendCallbacks: () => backendCallbacks,
    getRetryCallback: () => retryCallback,
    publishGameplaySnapshot: () => gameplayListener?.({}),
    runGameplayTick: (frame) => gameplayTickCallback?.(frame),
    hideApp: () => appVisibilityCallbacks?.onHidden?.(),
    showApp: () => appVisibilityCallbacks?.onVisible?.(),
    setMaintenance: (snapshot) => maintenanceListener?.(snapshot),
  };
}

describe('AppLifecycleManager', () => {
  it('does not run the game loop until the server connects', async () => {
    const { lifecycle, stage, getBackendCallbacks } = createLifecycle();

    lifecycle.start();
    await flushPromises();

    expect(lifecycle.onlineGateManager.showConnecting).toHaveBeenCalledTimes(1);
    expect(lifecycle.textClipboardGuardManager.mount).toHaveBeenCalledWith(stage);
    expect(lifecycle.interactionLockManager.mount).toHaveBeenCalledWith(stage);
    expect(lifecycle.interactionLockManager.lock).toHaveBeenCalledWith('connecting');
    expect(lifecycle.deployRefreshManager.mount).toHaveBeenCalledWith(stage);
    expect(lifecycle.gameplayTickManager.start).not.toHaveBeenCalled();
    expect(lifecycle.renderFacade.startFrameLoop).not.toHaveBeenCalled();

    getBackendCallbacks().onOnline();

    expect(lifecycle.onlineGateManager.hide).toHaveBeenCalledTimes(1);
    expect(lifecycle.interactionLockManager.unlock).toHaveBeenCalledTimes(1);
    expect(lifecycle.gameplayTickManager.start).toHaveBeenCalledTimes(1);
    expect(lifecycle.renderFacade.startFrameLoop).not.toHaveBeenCalled();
  });

  it('runs gameplay ticks from the sleeping tick manager and wakes on gameplay changes', async () => {
    const { lifecycle, getBackendCallbacks, publishGameplaySnapshot, runGameplayTick } =
      createLifecycle();
    const frame = { time: 2000, deltaSeconds: 0.1, timerDeltaSeconds: 2 };

    lifecycle.start();
    await flushPromises();
    getBackendCallbacks().onOnline();
    lifecycle.gameplayFacade.getNextGameplayTickDelayMs.mockReturnValue(750);

    expect(runGameplayTick(frame)).toBe(750);
    expect(lifecycle.ecsFacade.update).toHaveBeenCalledWith(frame);
    expect(lifecycle.gameplayFacade.afterUpdate).toHaveBeenCalledWith(frame);

    publishGameplaySnapshot();

    expect(lifecycle.gameplayTickManager.requestTick).toHaveBeenCalledWith(750);
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
    expect(lifecycle.gameplayTickManager.stop).toHaveBeenCalledTimes(1);
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

    expect(lifecycle.gameplayTickManager.stop).toHaveBeenCalledTimes(1);
    expect(lifecycle.renderFacade.stopFrameLoop).toHaveBeenCalledTimes(1);
    expect(lifecycle.onlineGateManager.showConnecting).toHaveBeenCalledTimes(2);
    expect(lifecycle.onlineGateManager.showOffline).not.toHaveBeenCalled();
    expect(lifecycle.connectionRetryManager.schedule).toHaveBeenCalledTimes(1);

    getRetryCallback()();
    await flushPromises();

    expect(lifecycle.backendFacade.start).toHaveBeenCalledTimes(2);
  });

  it('defers transient reconnect while the app is hidden', async () => {
    const { lifecycle, getBackendCallbacks, hideApp, showApp } = createLifecycle();

    lifecycle.start();
    await flushPromises();
    getBackendCallbacks().onOnline();

    hideApp();
    getBackendCallbacks().onOffline({ reason: 'disconnect' });

    expect(lifecycle.gameplayFacade.savePersistenceSnapshotAndFlush).toHaveBeenCalledTimes(
      1,
    );
    expect(lifecycle.connectionRetryManager.schedule).not.toHaveBeenCalled();
    expect(lifecycle.onlineGateManager.showConnecting).toHaveBeenCalledTimes(1);
    expect(lifecycle.backendFacade.start).toHaveBeenCalledTimes(1);

    showApp();
    await flushPromises();

    expect(lifecycle.onlineGateManager.showConnecting).toHaveBeenCalledTimes(2);
    expect(lifecycle.backendFacade.start).toHaveBeenCalledTimes(2);
  });

  it('reconnects after a hidden attempt settles when foreground returned early', async () => {
    const { lifecycle, hideApp, showApp } = createLifecycle();
    let backendCallbacks = null;
    let resolveStart = null;
    lifecycle.backendFacade.start
      .mockImplementationOnce((callbacks) => {
        backendCallbacks = callbacks;
        return new Promise((resolve) => {
          resolveStart = () => resolve({ ok: true });
        });
      })
      .mockImplementation((callbacks) => {
        backendCallbacks = callbacks;
        return Promise.resolve({ ok: true });
      });

    lifecycle.start();
    await flushPromises();

    hideApp();
    backendCallbacks.onOffline({ reason: 'disconnect' });
    showApp();

    expect(lifecycle.backendFacade.start).toHaveBeenCalledTimes(1);

    resolveStart();
    await flushPromises();

    expect(lifecycle.backendFacade.start).toHaveBeenCalledTimes(2);
  });

  it('resumes gameplay without reconnecting when the hidden connection survives', async () => {
    const { lifecycle, getBackendCallbacks, hideApp, showApp } = createLifecycle();

    lifecycle.start();
    await flushPromises();
    getBackendCallbacks().onOnline();

    hideApp();
    showApp();

    expect(lifecycle.gameplayTickManager.stop).toHaveBeenCalledTimes(1);
    expect(lifecycle.renderFacade.stopFrameLoop).toHaveBeenCalledTimes(1);
    expect(lifecycle.gameplayTickManager.start).toHaveBeenCalledTimes(2);
    expect(lifecycle.backendFacade.start).toHaveBeenCalledTimes(1);
  });

  it('applies hidden-time catch-up before restarting the frame loop', async () => {
    let nowMs = 1_000;
    const { lifecycle, getBackendCallbacks, hideApp, showApp } = createLifecycle({
      now: () => nowMs,
    });

    lifecycle.start();
    await flushPromises();
    getBackendCallbacks().onOnline();

    hideApp();
    nowMs = 61_000;
    showApp();

    expect(lifecycle.gameplayFacade.applyAwayTimerCatchup).toHaveBeenCalledWith(
      lifecycle.ecsFacade,
      { deltaSeconds: 60, source: 'resume' },
    );
    expect(
      lifecycle.gameplayFacade.applyAwayTimerCatchup.mock.invocationCallOrder[0],
    ).toBeLessThan(lifecycle.gameplayTickManager.start.mock.invocationCallOrder[1]);
  });

  it('skips hidden-time catch-up after a save reload already handled away time', async () => {
    let nowMs = 1_000;
    const { lifecycle, getBackendCallbacks, hideApp, showApp } = createLifecycle({
      now: () => nowMs,
    });
    const save = { tasks: { currentLevel: 2 } };

    lifecycle.start();
    await flushPromises();
    getBackendCallbacks().onOnline();

    hideApp();
    lifecycle.loadGameplaySave(save);
    nowMs = 61_000;
    showApp();

    expect(lifecycle.gameplayFacade.loadPersistenceSave).toHaveBeenCalledWith(
      save,
      lifecycle.ecsFacade,
    );
    expect(lifecycle.gameplayFacade.applyAwayTimerCatchup).not.toHaveBeenCalled();
    expect(lifecycle.gameplayTickManager.start).toHaveBeenCalledTimes(2);
  });

  it('shows account-in-use after returning from a hidden inactive session', async () => {
    const { lifecycle, getBackendCallbacks, hideApp, showApp } = createLifecycle();

    lifecycle.start();
    await flushPromises();
    getBackendCallbacks().onOnline();

    hideApp();
    getBackendCallbacks().onOffline({ reason: 'account_in_use' });
    showApp();

    expect(lifecycle.onlineGateManager.showOffline).toHaveBeenCalledWith(
      'account_in_use',
    );
    expect(lifecycle.connectionRetryManager.schedule).not.toHaveBeenCalled();
    expect(lifecycle.backendFacade.start).toHaveBeenCalledTimes(1);
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
    expect(lifecycle.gameplayTickManager.stop).toHaveBeenCalledTimes(1);
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

    expect(lifecycle.gameplayTickManager.start).not.toHaveBeenCalled();
    expect(lifecycle.renderFacade.startFrameLoop).not.toHaveBeenCalled();
    expect(lifecycle.onlineGateManager.showConnecting).toHaveBeenCalledTimes(2);
    expect(lifecycle.onlineGateManager.showOffline).not.toHaveBeenCalled();
    expect(lifecycle.connectionRetryManager.schedule).toHaveBeenCalledTimes(1);

    getRetryCallback()();
    await flushPromises();

    expect(lifecycle.backendFacade.start).toHaveBeenCalledTimes(2);
  });

  it('keeps connecting and retries when backend startup times out', async () => {
    const { lifecycle, getBackendCallbacks, getRetryCallback } = createLifecycle();

    lifecycle.start();
    await flushPromises();
    getBackendCallbacks().onOffline({ reason: 'connect_timeout' });

    expect(lifecycle.gameplayTickManager.start).not.toHaveBeenCalled();
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
    expect(lifecycle.textClipboardGuardManager.unmount).toHaveBeenCalledTimes(1);
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

  it('waits for start fresh before connecting without an account token', async () => {
    let resolveChoice;
    const freshStartChoiceManager = {
      mount: vi.fn(),
      choose: vi.fn(
        () =>
          new Promise((resolve) => {
            resolveChoice = resolve;
          }),
      ),
      render: vi.fn(),
      hide: vi.fn(),
      unmount: vi.fn(),
    };
    const authFacade = {
      getPendingAccountLinkSave: vi.fn(() => null),
      clearPendingAccountLinkSave: vi.fn(),
      getSnapshot: vi.fn(() => ({
        hasToken: false,
        oidc: { authenticated: false, enabled: true },
      })),
      signInWithGoogle: vi.fn(),
    };
    const { lifecycle } = createLifecycle({ freshStartChoiceManager, authFacade });

    lifecycle.start();
    await flushPromises();

    expect(freshStartChoiceManager.choose).toHaveBeenCalledWith({
      authSnapshot: {
        hasToken: false,
        oidc: { authenticated: false, enabled: true },
      },
      statusText: null,
      keepOpenOnConnect: true,
    });
    expect(lifecycle.backendFacade.start).not.toHaveBeenCalled();

    resolveChoice(FRESH_START_CHOICE_START_FRESH);
    await flushPromises();

    expect(lifecycle.backendFacade.start).toHaveBeenCalledTimes(1);
  });

  it('shows the fresh-start gate when native auth appears during prepare on fresh app data', async () => {
    let authenticated = false;
    let resolveChoice;
    const freshStartChoiceManager = {
      mount: vi.fn(),
      choose: vi.fn(
        () =>
          new Promise((resolve) => {
            resolveChoice = resolve;
          }),
      ),
      render: vi.fn(),
      hide: vi.fn(),
      unmount: vi.fn(),
    };
    const authFacade = {
      getPendingAccountLinkSave: vi.fn(() => null),
      clearPendingAccountLinkSave: vi.fn(),
      getSnapshot: vi.fn(() => ({
        hasToken: authenticated,
        oidc: { authenticated, enabled: true },
      })),
      signInWithGoogle: vi.fn(),
    };
    const { lifecycle } = createLifecycle({ freshStartChoiceManager, authFacade });
    lifecycle.backendFacade.prepare.mockImplementation(() => {
      authenticated = true;
      return Promise.resolve();
    });

    lifecycle.start();
    await flushPromises();

    expect(freshStartChoiceManager.choose).toHaveBeenCalledTimes(1);
    expect(lifecycle.backendFacade.start).not.toHaveBeenCalled();

    resolveChoice(FRESH_START_CHOICE_START_FRESH);
    await flushPromises();

    expect(lifecycle.backendFacade.start).toHaveBeenCalledTimes(1);
  });

  it('does not mount game surfaces behind the fresh-start gate', async () => {
    let resolveChoice;
    const freshStartChoiceManager = {
      mount: vi.fn(),
      choose: vi.fn(
        () =>
          new Promise((resolve) => {
            resolveChoice = resolve;
          }),
      ),
      render: vi.fn(),
      hide: vi.fn(),
      unmount: vi.fn(),
    };
    const authFacade = {
      getPendingAccountLinkSave: vi.fn(() => null),
      clearPendingAccountLinkSave: vi.fn(),
      getSnapshot: vi.fn(() => ({
        hasToken: false,
        oidc: { authenticated: false, enabled: true },
      })),
      signInWithGoogle: vi.fn(),
    };
    const { lifecycle, stage, getBackendCallbacks } = createLifecycle({
      freshStartChoiceManager,
      authFacade,
    });

    lifecycle.start();
    await flushPromises();

    expect(freshStartChoiceManager.choose).toHaveBeenCalledTimes(1);
    expect(lifecycle.pagesFacade.mount).not.toHaveBeenCalled();
    expect(lifecycle.renderFacade.mount).not.toHaveBeenCalled();

    resolveChoice(FRESH_START_CHOICE_START_FRESH);
    await flushPromises();

    expect(lifecycle.backendFacade.start).toHaveBeenCalledTimes(1);
    expect(lifecycle.pagesFacade.mount).not.toHaveBeenCalled();
    expect(lifecycle.renderFacade.mount).not.toHaveBeenCalled();

    await getBackendCallbacks().onGameplaySaveReady({ save: null });

    expect(lifecycle.pagesFacade.mount).toHaveBeenCalledWith(stage);
    expect(lifecycle.renderFacade.mount).toHaveBeenCalledWith(stage);
  });

  it('connects without the fresh-start gate when an account token exists', async () => {
    const freshStartChoiceManager = {
      mount: vi.fn(),
      choose: vi.fn(() => Promise.resolve(FRESH_START_CHOICE_START_FRESH)),
      hide: vi.fn(),
      unmount: vi.fn(),
    };
    const { lifecycle } = createLifecycle({ freshStartChoiceManager });

    lifecycle.start();
    await flushPromises();

    expect(freshStartChoiceManager.choose).not.toHaveBeenCalled();
    expect(lifecycle.backendFacade.start).toHaveBeenCalledTimes(1);
  });

  it('shows the fresh-start gate before restoring a platform account on fresh data', async () => {
    let hasToken = false;
    let resolveChoice;
    const freshStartChoiceManager = {
      mount: vi.fn(),
      choose: vi.fn(
        () =>
          new Promise((resolve) => {
            resolveChoice = resolve;
          }),
      ),
      hide: vi.fn(),
      unmount: vi.fn(),
    };
    const authFacade = {
      getPendingAccountLinkSave: vi.fn(() => null),
      clearPendingAccountLinkSave: vi.fn(),
      getSnapshot: vi.fn(() => ({
        hasToken,
        oidc: { authenticated: hasToken, enabled: true },
      })),
      tryRestoreConnectedAccount: vi.fn(() => {
        hasToken = true;
        return Promise.resolve({ ok: true });
      }),
      signInWithGoogle: vi.fn(),
    };
    const { lifecycle } = createLifecycle({ freshStartChoiceManager, authFacade });

    lifecycle.start();
    await flushPromises();
    await flushPromises();

    expect(authFacade.tryRestoreConnectedAccount).not.toHaveBeenCalled();
    expect(freshStartChoiceManager.choose).toHaveBeenCalledTimes(1);
    expect(lifecycle.backendFacade.start).not.toHaveBeenCalled();

    resolveChoice(FRESH_START_CHOICE_START_FRESH);
    await flushPromises();

    expect(lifecycle.backendFacade.start).toHaveBeenCalledTimes(1);
  });

  it('shows the fresh-start gate before restoring a remembered platform account', async () => {
    let hasToken = false;
    const freshStartChoiceManager = {
      mount: vi.fn(),
      choose: vi.fn(() => Promise.resolve(FRESH_START_CHOICE_START_FRESH)),
      hide: vi.fn(),
      unmount: vi.fn(),
    };
    const authFacade = {
      getPendingAccountLinkSave: vi.fn(() => null),
      clearPendingAccountLinkSave: vi.fn(),
      getSnapshot: vi.fn(() => ({
        hasToken,
        oidc: { authenticated: hasToken, enabled: true, remembered: !hasToken },
      })),
      tryRestoreConnectedAccount: vi.fn(() => {
        hasToken = true;
        return Promise.resolve({ ok: true });
      }),
      signInWithGoogle: vi.fn(),
    };
    const { lifecycle } = createLifecycle({ freshStartChoiceManager, authFacade });

    lifecycle.start();
    await flushPromises();
    await flushPromises();

    expect(authFacade.tryRestoreConnectedAccount).not.toHaveBeenCalled();
    expect(freshStartChoiceManager.choose).toHaveBeenCalledTimes(1);
    expect(lifecycle.backendFacade.start).toHaveBeenCalledTimes(1);
  });

  it('refreshes a remembered connected account before using a stored server token', async () => {
    let authenticated = false;
    const freshStartChoiceManager = {
      mount: vi.fn(),
      choose: vi.fn(() => Promise.resolve(FRESH_START_CHOICE_START_FRESH)),
      hide: vi.fn(),
      unmount: vi.fn(),
    };
    const authFacade = {
      getPendingAccountLinkSave: vi.fn(() => null),
      clearPendingAccountLinkSave: vi.fn(),
      getSnapshot: vi.fn(() => ({
        hasToken: true,
        oidc: {
          authenticated,
          enabled: true,
          remembered: !authenticated,
        },
      })),
      tryRestoreConnectedAccount: vi.fn(() => {
        authenticated = true;
        return Promise.resolve({ ok: true, restored: true });
      }),
      signInWithGoogle: vi.fn(),
    };
    const { lifecycle } = createLifecycle({ freshStartChoiceManager, authFacade });

    lifecycle.start();
    await flushPromises();
    await flushPromises();

    expect(authFacade.tryRestoreConnectedAccount).toHaveBeenCalledTimes(1);
    expect(freshStartChoiceManager.choose).not.toHaveBeenCalled();
    expect(lifecycle.backendFacade.start).toHaveBeenCalledTimes(1);
  });

  it('shows loading while connecting an existing account before backend connect', async () => {
    let authenticated = false;
    const freshStartChoiceManager = {
      mount: vi.fn(),
      choose: vi.fn(() => Promise.resolve(FRESH_START_CHOICE_CONNECT_ACCOUNT)),
      render: vi.fn(),
      hide: vi.fn(),
      unmount: vi.fn(),
    };
    const authFacade = {
      getPendingAccountLinkSave: vi.fn(() => null),
      clearPendingAccountLinkSave: vi.fn(),
      getSnapshot: vi.fn(() => ({
        hasToken: authenticated,
        oidc: { authenticated, enabled: true },
      })),
      signInWithGoogle: vi.fn(() => {
        authenticated = true;
        return Promise.resolve({ ok: true, reloadRequired: true });
      }),
    };
    const reload = vi.fn();
    const { lifecycle } = createLifecycle({
      freshStartChoiceManager,
      authFacade,
      reload,
    });

    lifecycle.start();
    await flushPromises();
    await flushPromises();

    expect(authFacade.signInWithGoogle).toHaveBeenCalledTimes(1);
    expect(freshStartChoiceManager.render).toHaveBeenCalledWith({
      authSnapshot: {
        hasToken: false,
        oidc: { authenticated: false, enabled: true },
      },
      statusText: 'connecting...',
      busy: true,
    });
    expect(freshStartChoiceManager.render).toHaveBeenLastCalledWith({
      authSnapshot: {
        hasToken: true,
        oidc: { authenticated: true, enabled: true },
      },
      statusText: 'connecting...',
      busy: true,
    });
    expect(reload).not.toHaveBeenCalled();
    expect(lifecycle.backendFacade.start).toHaveBeenCalledTimes(1);
  });

  it('starts new after connecting an empty account from the fresh-start dialog', async () => {
    let authenticated = false;
    const freshStartChoiceManager = {
      mount: vi.fn(),
      choose: vi.fn(() => Promise.resolve(FRESH_START_CHOICE_CONNECT_ACCOUNT)),
      render: vi.fn(),
      hide: vi.fn(),
      unmount: vi.fn(),
    };
    const authFacade = {
      getPendingAccountLinkSave: vi.fn(() => null),
      clearPendingAccountLinkSave: vi.fn(),
      getSnapshot: vi.fn(() => ({
        hasToken: authenticated,
        oidc: { authenticated, enabled: true },
      })),
      signInWithGoogle: vi.fn(() => {
        authenticated = true;
        return Promise.resolve({ ok: true });
      }),
    };
    const { lifecycle, getBackendCallbacks } = createLifecycle({
      freshStartChoiceManager,
      authFacade,
    });
    lifecycle.start();
    await flushPromises();
    await flushPromises();
    await getBackendCallbacks().onGameplaySaveReady({ save: null });

    expect(authFacade.signInWithGoogle).toHaveBeenCalledTimes(1);
    expect(freshStartChoiceManager.choose).toHaveBeenCalledTimes(1);
    expect(lifecycle.pagesFacade.resetTutorialProgress).toHaveBeenCalledTimes(1);
    expect(lifecycle.gameplayFacade.resetPersistenceState).toHaveBeenCalledTimes(1);
    expect(
      lifecycle.gameplayFacade.savePersistenceSnapshotAndFlush,
    ).toHaveBeenCalledTimes(1);
  });

  it('does not stash a default save before gameplay is mounted', async () => {
    const createPersistenceSave = vi.fn(() => ({ tasks: { currentLevel: 4 } }));
    const authFacade = {
      signInWithGoogle: vi.fn(() => Promise.resolve({ ok: true })),
    };
    const { lifecycle } = createLifecycle({ authFacade });
    lifecycle.gameplayFacade.createPersistenceSave = createPersistenceSave;

    await lifecycle.connectFreshStartAccount();

    expect(createPersistenceSave).not.toHaveBeenCalled();
    expect(authFacade.signInWithGoogle).toHaveBeenCalledWith();
  });

  it('stashes mounted local progress before connecting an account', async () => {
    const deviceSave = {
      tasks: { currentLevel: 4 },
      coin: { current: 25 },
      crystal: { current: 1 },
    };
    const authFacade = {
      signInWithGoogle: vi.fn(() => Promise.resolve({ ok: true })),
    };
    const { lifecycle } = createLifecycle({ authFacade });
    lifecycle.gameSurfacesMounted = true;
    lifecycle.gameplayFacade.createPersistenceSave = vi.fn(() => deviceSave);

    await lifecycle.connectFreshStartAccount();

    expect(lifecycle.gameplayFacade.createPersistenceSave).toHaveBeenCalledTimes(1);
    expect(authFacade.signInWithGoogle).toHaveBeenCalledWith({
      pendingGameplaySave: deviceSave,
    });
  });

  it('pauses gameplay and flushes the last save when maintenance drains', async () => {
    const { lifecycle, getBackendCallbacks, setMaintenance } = createLifecycle();

    lifecycle.start();
    await flushPromises();
    getBackendCallbacks().onOnline();

    expect(lifecycle.gameplayTickManager.start).toHaveBeenCalledTimes(1);

    setMaintenance({
      mode: 'drain',
      message: 'maintenance in progress',
      active: true,
      updatedAtMs: 10,
    });

    expect(lifecycle.gameplayTickManager.stop).toHaveBeenCalledTimes(1);
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
    expect(lifecycle.gameplayTickManager.start).toHaveBeenCalledTimes(1);
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
    expect(lifecycle.gameplayTickManager.stop).toHaveBeenCalledTimes(1);
    expect(lifecycle.renderFacade.stopFrameLoop).toHaveBeenCalledTimes(1);
    expect(lifecycle.gameplayFacade.savePersistenceSnapshotAndFlush).not.toHaveBeenCalled();
    expect(lifecycle.onlineGateManager.showMaintenance).toHaveBeenLastCalledWith(
      expect.objectContaining({ mode: 'locked' }),
    );
  });

  it('reloads fresh server state instead of resuming stale memory after locked maintenance', async () => {
    const reload = vi.fn();
    const { lifecycle, getBackendCallbacks, setMaintenance } = createLifecycle({ reload });

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

    expect(reload).toHaveBeenCalledTimes(1);
    expect(lifecycle.gameplayTickManager.start).toHaveBeenCalledTimes(1);
    expect(lifecycle.interactionLockManager.unlock).toHaveBeenCalledTimes(1);
  });

  it('resumes gameplay without reloading when drain maintenance is cancelled before locking', async () => {
    const reload = vi.fn();
    const { lifecycle, getBackendCallbacks, setMaintenance } = createLifecycle({ reload });

    lifecycle.start();
    await flushPromises();
    getBackendCallbacks().onOnline();
    setMaintenance({
      mode: 'drain',
      message: 'maintenance in progress',
      active: true,
      updatedAtMs: 14,
    });
    await flushPromises();

    setMaintenance({
      mode: 'off',
      message: 'maintenance in progress',
      active: false,
      updatedAtMs: 15,
    });

    expect(reload).not.toHaveBeenCalled();
    expect(lifecycle.gameplayTickManager.start).toHaveBeenCalledTimes(2);
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
    expect(
      lifecycle.gameplayFacade.savePersistenceSnapshotAndFlush,
    ).toHaveBeenCalledTimes(1);
  });

  it('asks before loading fresh gameplay data for an anonymous empty save', async () => {
    const freshStartChoiceManager = {
      mount: vi.fn(),
      choose: vi.fn(() => Promise.resolve(FRESH_START_CHOICE_START_FRESH)),
      unmount: vi.fn(),
    };
    const { lifecycle } = createLifecycle({ freshStartChoiceManager });
    await lifecycle.handleGameplaySaveReady({ save: null });

    expect(lifecycle.onlineGateManager.hide).toHaveBeenCalledTimes(1);
    expect(freshStartChoiceManager.choose).toHaveBeenCalledWith({
      authSnapshot: { hasToken: true, oidc: { authenticated: false } },
      statusText: null,
      keepOpenOnConnect: true,
    });
    expect(
      lifecycle.onlineGateManager.hide.mock.invocationCallOrder[0],
    ).toBeLessThan(freshStartChoiceManager.choose.mock.invocationCallOrder[0]);
    expect(lifecycle.gameplayFacade.resetPersistenceState).toHaveBeenCalledTimes(1);
    expect(lifecycle.pagesFacade.resetTutorialProgress).toHaveBeenCalledTimes(1);
    expect(
      lifecycle.gameplayFacade.savePersistenceSnapshotAndFlush,
    ).toHaveBeenCalledTimes(1);
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
    await lifecycle.handleGameplaySaveReady({ save: null });

    expect(pagesFacade.resetTutorialProgress).toHaveBeenCalledTimes(1);
    expect(
      pagesFacade.resetTutorialProgress.mock.invocationCallOrder[0],
    ).toBeLessThan(
      lifecycle.gameplayFacade.resetPersistenceState.mock.invocationCallOrder[0],
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
      keepOpenOnConnect: true,
    });
    expect(lifecycle.gameplayFacade.resetPersistenceState).toHaveBeenCalledTimes(1);
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
      keepOpenOnConnect: true,
    });
  });

  it('shows the auth manager error after a failed fresh-start login return', async () => {
    const freshStartChoiceManager = {
      mount: vi.fn(),
      choose: vi
        .fn()
        .mockResolvedValueOnce(FRESH_START_CHOICE_CONNECT_ACCOUNT)
        .mockResolvedValueOnce(FRESH_START_CHOICE_START_FRESH),
      render: vi.fn(),
      unmount: vi.fn(),
    };
    const authFacade = {
      getPendingAccountLinkSave: vi.fn(() => null),
      clearPendingAccountLinkSave: vi.fn(),
      getSnapshot: vi.fn(() => ({
        oidc: {
          authenticated: false,
          enabled: true,
          error: 'Google login returned a token for another client.',
        },
      })),
      signInWithGoogle: vi.fn(() =>
        Promise.resolve({ ok: false, reason: 'web_failed' }),
      ),
    };
    const { lifecycle } = createLifecycle({ freshStartChoiceManager, authFacade });

    await lifecycle.handleGameplaySaveReady({ save: null });

    expect(freshStartChoiceManager.choose).toHaveBeenNthCalledWith(2, {
      authSnapshot: {
        oidc: {
          authenticated: false,
          enabled: true,
          error: 'Google login returned a token for another client.',
        },
      },
      statusText:
        'login error: Google login returned a token for another client.',
      keepOpenOnConnect: true,
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

  it('loads hydrated pending local progress instead of a stale server save on reconnect', async () => {
    const serverSave = { version: 2, coin: { current: 10 } };
    const pendingHydratedSave = { version: 2, coin: { current: 25 } };
    const { lifecycle } = createLifecycle();

    await lifecycle.handleGameplaySaveReady({ save: serverSave, pendingHydratedSave });

    expect(lifecycle.gameplayFacade.loadPersistenceSave).toHaveBeenCalledWith(
      pendingHydratedSave,
      lifecycle.ecsFacade,
    );
    expect(
      lifecycle.gameplayFacade.savePersistenceSnapshotAndFlush,
    ).toHaveBeenCalledTimes(1);
  });

  it('treats an empty server save as authoritative over stale pending progress', async () => {
    const pendingHydratedSave = { version: 11, tasks: { currentLevel: 8 } };
    const enableSaveSending = vi.fn();
    const { lifecycle } = createLifecycle();

    await lifecycle.handleGameplaySaveReady(
      { save: null, pendingHydratedSave },
      { enableSaveSending },
    );

    expect(lifecycle.gameplayFacade.loadPersistenceSave).not.toHaveBeenCalled();
    expect(lifecycle.gameplayFacade.resetPersistenceState).toHaveBeenCalledTimes(1);
    expect(enableSaveSending).toHaveBeenCalledTimes(1);
    expect(
      enableSaveSending.mock.invocationCallOrder[0],
    ).toBeLessThan(
      lifecycle.gameplayFacade.savePersistenceSnapshotAndFlush.mock
        .invocationCallOrder[0],
    );
  });

  it('does not mount fresh gameplay until the baseline save is acknowledged', async () => {
    let acknowledgeSave = null;
    const { lifecycle, stage } = createLifecycle();
    lifecycle.stage = stage;
    lifecycle.gameplayFacade.savePersistenceSnapshotAndFlush.mockImplementation(
      () =>
        new Promise((resolve) => {
          acknowledgeSave = resolve;
        }),
    );

    const ready = lifecycle.handleGameplaySaveReady(
      { save: null },
      { enableSaveSending: vi.fn() },
    );
    await flushPromises();

    expect(lifecycle.pagesFacade.mount).not.toHaveBeenCalled();

    acknowledgeSave(true);
    await ready;

    expect(lifecycle.pagesFacade.mount).toHaveBeenCalledWith(stage);
  });

  it('starts new with an authenticated account that has no gameplay save', async () => {
    const freshStartChoiceManager = {
      mount: vi.fn(),
      choose: vi.fn(() => Promise.resolve(FRESH_START_CHOICE_START_FRESH)),
      hide: vi.fn(),
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
    expect(freshStartChoiceManager.hide).toHaveBeenCalledTimes(1);
    expect(lifecycle.pagesFacade.resetTutorialProgress).toHaveBeenCalledTimes(1);
    expect(lifecycle.gameplayFacade.resetPersistenceState).toHaveBeenCalledTimes(1);
    expect(
      lifecycle.gameplayFacade.savePersistenceSnapshotAndFlush,
    ).toHaveBeenCalledTimes(1);
  });

  it('starts new with a remembered account token that has no gameplay save', async () => {
    const freshStartChoiceManager = {
      mount: vi.fn(),
      choose: vi.fn(() => Promise.resolve(FRESH_START_CHOICE_START_FRESH)),
      hide: vi.fn(),
      unmount: vi.fn(),
    };
    const authFacade = {
      getPendingAccountLinkSave: vi.fn(() => null),
      clearPendingAccountLinkSave: vi.fn(),
      getSnapshot: vi.fn(() => ({
        hasToken: true,
        oidc: { authenticated: false, remembered: true },
      })),
      signInWithGoogle: vi.fn(),
    };
    const { lifecycle } = createLifecycle({ freshStartChoiceManager, authFacade });
    await lifecycle.handleGameplaySaveReady({ save: null });

    expect(freshStartChoiceManager.choose).not.toHaveBeenCalled();
    expect(freshStartChoiceManager.hide).toHaveBeenCalledTimes(1);
    expect(lifecycle.pagesFacade.resetTutorialProgress).toHaveBeenCalledTimes(1);
    expect(lifecycle.gameplayFacade.resetPersistenceState).toHaveBeenCalledTimes(1);
    expect(
      lifecycle.gameplayFacade.savePersistenceSnapshotAndFlush,
    ).toHaveBeenCalledTimes(1);
  });

  it('keeps account-link choices based on the server save when pending local progress exists', async () => {
    const deviceSave = { tasks: { currentLevel: 4 } };
    const accountSave = { tasks: { currentLevel: 2 } };
    const pendingHydratedSave = { tasks: { currentLevel: 5 } };
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

    await lifecycle.handleGameplaySaveReady({
      save: accountSave,
      pendingHydratedSave,
    });

    expect(accountLinkChoiceManager.choose).toHaveBeenCalledWith({
      deviceSave,
      accountSave,
    });
    expect(lifecycle.gameplayFacade.loadPersistenceSave).toHaveBeenCalledWith(
      accountSave,
      lifecycle.ecsFacade,
    );
  });

  it('keeps device progress when linking into a Google account with no save', async () => {
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
    expect(lifecycle.pagesFacade.resetTutorialProgress).not.toHaveBeenCalled();
    expect(lifecycle.gameplayFacade.resetPersistenceState).toHaveBeenCalledTimes(1);
    expect(lifecycle.gameplayFacade.loadPersistenceSave).toHaveBeenCalledWith(
      deviceSave,
      lifecycle.ecsFacade,
    );
    expect(
      lifecycle.gameplayFacade.savePersistenceSnapshotAndFlush,
    ).toHaveBeenCalledTimes(2);
    expect(
      lifecycle.gameplayFacade.savePersistenceSnapshotAndFlush.mock
        .invocationCallOrder[0],
    ).toBeLessThan(
      lifecycle.gameplayFacade.loadPersistenceSave.mock.invocationCallOrder[0],
    );
  });

  it('keeps pending device progress until an empty linked account acknowledges it', async () => {
    const deviceSave = { tasks: { currentLevel: 4 } };
    const authFacade = {
      getPendingAccountLinkSave: vi.fn(() => deviceSave),
      clearPendingAccountLinkSave: vi.fn(),
      getSnapshot: vi.fn(() => ({ oidc: { authenticated: true } })),
    };
    const { lifecycle } = createLifecycle({ authFacade });
    lifecycle.gameplayFacade.savePersistenceSnapshotAndFlush
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    await expect(
      lifecycle.handleGameplaySaveReady({ save: null }),
    ).rejects.toThrow('Gameplay save was not acknowledged by the server.');

    expect(
      lifecycle.gameplayFacade.savePersistenceSnapshotAndFlush,
    ).toHaveBeenCalledTimes(2);
    expect(authFacade.clearPendingAccountLinkSave).not.toHaveBeenCalled();
  });

  it('asks before replacing an existing account save even when device save is level 1', async () => {
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
    expect(accountLinkChoiceManager.choose).toHaveBeenCalledWith({
      deviceSave,
      accountSave,
    });
    expect(authFacade.clearPendingAccountLinkSave).toHaveBeenCalledTimes(1);
    expect(lifecycle.gameplayFacade.loadPersistenceSave).toHaveBeenCalledWith(
      deviceSave,
      lifecycle.ecsFacade,
    );
    expect(
      lifecycle.gameplayFacade.savePersistenceSnapshotAndFlush,
    ).toHaveBeenCalledTimes(1);
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
    expect(
      lifecycle.gameplayFacade.savePersistenceSnapshotAndFlush,
    ).toHaveBeenCalledTimes(1);
  });

  it('keeps the gate up when backend startup fails', async () => {
    const { lifecycle } = createLifecycle();
    lifecycle.backendFacade.start.mockResolvedValueOnce({
      ok: false,
      reason: 'bindings_missing',
    });

    lifecycle.start();
    await flushPromises();

    expect(lifecycle.gameplayTickManager.start).not.toHaveBeenCalled();
    expect(lifecycle.renderFacade.startFrameLoop).not.toHaveBeenCalled();
    expect(lifecycle.onlineGateManager.showOffline).toHaveBeenCalledWith('bindings_missing');
    expect(lifecycle.connectionRetryManager.schedule).not.toHaveBeenCalled();
  });
});
