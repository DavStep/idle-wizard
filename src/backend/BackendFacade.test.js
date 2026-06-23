import { describe, expect, it, vi } from 'vitest';

import { BackendFacade } from './BackendFacade.js';

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

function createBackendWithFakes({ connectGeneratedBindings } = {}) {
  const backendFacade = new BackendFacade();
  const clearOwnProgress = vi.fn(() => Promise.resolve({ ok: true }));
  let syncUnhealthyHandler = null;

  backendFacade.gameConfigFacade = {
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
  backendFacade.accountSessionFacade = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    getSnapshot: vi.fn(() => ({ active: true })),
  };
  backendFacade.gameplaySaveFacade = {
    connect: vi.fn((_connection, _identity, { onReady } = {}) => {
      onReady?.({ ok: true, save: null });
      return true;
    }),
    discardPreHydrationSave: vi.fn(),
    discardPendingSaves: vi.fn(),
    disconnect: vi.fn(),
    setReadyToSend: vi.fn(),
    setSyncUnhealthyHandler: vi.fn((handler) => {
      syncUnhealthyHandler = handler;
    }),
  };
  backendFacade.leaderboardFacade = {
    setGameplayFacade: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
  backendFacade.worldEventLeaderboardFacade = {
    setGameplayFacade: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
  backendFacade.tradeAllianceFacade = {
    setGameplayFacade: vi.fn(),
    setRewardProcessingReady: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
  backendFacade.worldChatFacade = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    setBeforeSendMessage: vi.fn(),
  };
  backendFacade.feedbackFacade = {
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
  backendFacade.npcMarketFacade = {
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
  backendFacade.playerInfoFacade = {
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
  backendFacade.playerSyncFacade = {
    setPlayerFacade: vi.fn(),
    setGameplayFacade: vi.fn(),
    setLevelSyncReady: vi.fn(),
    discardPreHydrationPlayerLevel: vi.fn(),
    discardPendingPlayerLevel: vi.fn(),
    markGameplaySaveHydrated: vi.fn(),
    flushPlayerLevelSync: vi.fn(() => Promise.resolve(true)),
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
  backendFacade.playerShopFacade = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    clearOwnProgress,
  };
  backendFacade.potionDiscoveryFacade = {
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
  backendFacade.spacetimeDbFacade = {
    connectGeneratedBindings: vi.fn(
      connectGeneratedBindings ??
        (async ({ onConnect }) => {
          onConnect({}, 'identity-1');
          return { ok: true };
        }),
    ),
    disconnect: vi.fn(),
  };

  return {
    backendFacade,
    clearOwnProgress,
    getSyncUnhealthyHandler: () => syncUnhealthyHandler,
  };
}

describe('BackendFacade', () => {
  it('clears server player-market progress after a local progress reset', async () => {
    const { backendFacade, clearOwnProgress } = createBackendWithFakes();
    const gameplayFacade = {
      consumeProgressResetPending: vi.fn(() => true),
    };

    await backendFacade.start({
      gameplayFacade,
      playerFacade: {},
    });
    await flushPromises();

    expect(gameplayFacade.consumeProgressResetPending).toHaveBeenCalledTimes(1);
    expect(clearOwnProgress).toHaveBeenCalledTimes(1);
  });

  it('leaves server player-market progress alone without a reset marker', async () => {
    const { backendFacade, clearOwnProgress } = createBackendWithFakes();

    await backendFacade.start({
      gameplayFacade: {
        consumeProgressResetPending: vi.fn(() => false),
      },
      playerFacade: {},
    });
    await flushPromises();

    expect(clearOwnProgress).not.toHaveBeenCalled();
  });

  it('hydrates gameplay save before marking backend online', async () => {
    const { backendFacade } = createBackendWithFakes();
    const onGameplaySaveReady = vi.fn();
    const onOnline = vi.fn();

    await backendFacade.start({
      gameplayFacade: {
        consumeProgressResetPending: vi.fn(() => false),
      },
      playerFacade: {},
      onGameplaySaveReady,
      onOnline,
    });
    await flushPromises();

    expect(onGameplaySaveReady).toHaveBeenCalledWith({
      save: null,
      updatedAtMs: 0,
    });
    expect(
      backendFacade.tradeAllianceFacade.setRewardProcessingReady.mock.calls.map(
        ([ready]) => ready,
      ),
    ).toEqual([false, true]);
    expect(
      backendFacade.gameplaySaveFacade.setReadyToSend.mock.calls.map(
        ([ready]) => ready,
      ),
    ).toEqual([false, true]);
    expect(
      backendFacade.gameplaySaveFacade.discardPreHydrationSave,
    ).toHaveBeenCalledTimes(1);
    expect(
      backendFacade.playerSyncFacade.discardPreHydrationPlayerLevel,
    ).toHaveBeenCalledTimes(1);
    expect(
      backendFacade.playerSyncFacade.markGameplaySaveHydrated,
    ).toHaveBeenCalledTimes(1);
    expect(
      backendFacade.gameplaySaveFacade.discardPreHydrationSave.mock.invocationCallOrder[0],
    ).toBeLessThan(onGameplaySaveReady.mock.invocationCallOrder[0]);
    expect(
      backendFacade.playerSyncFacade.discardPreHydrationPlayerLevel.mock
        .invocationCallOrder[0],
    ).toBeLessThan(onGameplaySaveReady.mock.invocationCallOrder[0]);
    expect(
      onGameplaySaveReady.mock.invocationCallOrder[0],
    ).toBeLessThan(
      backendFacade.gameplaySaveFacade.setReadyToSend.mock.invocationCallOrder[1],
    );
    expect(
      backendFacade.gameplaySaveFacade.setReadyToSend.mock.invocationCallOrder[1],
    ).toBeLessThan(
      backendFacade.playerSyncFacade.setLevelSyncReady.mock.invocationCallOrder[1],
    );
    expect(
      backendFacade.playerSyncFacade.setLevelSyncReady.mock.invocationCallOrder[1],
    ).toBeLessThan(
      backendFacade.tradeAllianceFacade.setRewardProcessingReady.mock.invocationCallOrder[1],
    );
    expect(onOnline).toHaveBeenCalledTimes(1);
  });

  it('wires world chat sends through player level sync', async () => {
    const { backendFacade } = createBackendWithFakes();

    await backendFacade.start({
      gameplayFacade: {
        consumeProgressResetPending: vi.fn(() => false),
      },
      playerFacade: {},
    });
    await flushPromises();

    expect(backendFacade.worldChatFacade.setBeforeSendMessage).toHaveBeenCalledWith(
      expect.any(Function),
    );

    const beforeSendMessage =
      backendFacade.worldChatFacade.setBeforeSendMessage.mock.calls.at(-1)?.[0];

    await expect(beforeSendMessage()).resolves.toBe(true);
    expect(backendFacade.playerSyncFacade.flushPlayerLevelSync).toHaveBeenCalledTimes(1);
  });

  it('waits for gameplay save choice before enabling server save sends', async () => {
    const { backendFacade } = createBackendWithFakes();
    let finishChoice = null;
    const onGameplaySaveReady = vi.fn(
      () =>
        new Promise((resolve) => {
          finishChoice = resolve;
        }),
    );
    const onOnline = vi.fn();

    await backendFacade.start({
      gameplayFacade: {
        consumeProgressResetPending: vi.fn(() => false),
      },
      playerFacade: {},
      onGameplaySaveReady,
      onOnline,
    });
    await Promise.resolve();

    expect(onGameplaySaveReady).toHaveBeenCalledTimes(1);
    expect(
      backendFacade.gameplaySaveFacade.setReadyToSend.mock.calls.map(
        ([ready]) => ready,
      ),
    ).toEqual([false]);
    expect(onOnline).not.toHaveBeenCalled();

    finishChoice();
    await flushPromises();

    expect(
      backendFacade.gameplaySaveFacade.setReadyToSend.mock.calls.map(
        ([ready]) => ready,
      ),
    ).toEqual([false, true]);
    expect(onOnline).toHaveBeenCalledTimes(1);
  });

  it('disconnects and reports offline when gameplay save sync gets stuck', async () => {
    const { backendFacade, getSyncUnhealthyHandler } = createBackendWithFakes();
    const onOffline = vi.fn();

    await backendFacade.start({
      gameplayFacade: {
        consumeProgressResetPending: vi.fn(() => false),
      },
      playerFacade: {},
      onOffline,
    });
    await flushPromises();

    getSyncUnhealthyHandler()?.({ reason: 'gameplay_save_timeout' });

    expect(backendFacade.gameplaySaveFacade.disconnect).toHaveBeenCalledTimes(1);
    expect(backendFacade.spacetimeDbFacade.disconnect).toHaveBeenCalledTimes(1);
    expect(onOffline).toHaveBeenCalledWith({
      reason: 'gameplay_save_timeout',
      error: undefined,
    });
  });

  it('disconnects and reports account-in-use when another connection takes over', async () => {
    const { backendFacade } = createBackendWithFakes();
    const onOffline = vi.fn();
    let onInactive = null;
    backendFacade.accountSessionFacade.connect.mockImplementation((_connection, options) => {
      onInactive = options.onInactive;
      return true;
    });

    await backendFacade.start({
      gameplayFacade: {
        consumeProgressResetPending: vi.fn(() => false),
      },
      playerFacade: {},
      onOffline,
    });
    await flushPromises();

    onInactive();

    expect(backendFacade.gameplaySaveFacade.discardPendingSaves).toHaveBeenCalledTimes(1);
    expect(backendFacade.playerSyncFacade.discardPendingPlayerLevel).toHaveBeenCalledTimes(1);
    expect(backendFacade.accountSessionFacade.disconnect).toHaveBeenCalled();
    expect(backendFacade.gameplaySaveFacade.disconnect).toHaveBeenCalled();
    expect(backendFacade.spacetimeDbFacade.disconnect).toHaveBeenCalledTimes(1);
    expect(onOffline).toHaveBeenCalledWith({ reason: 'account_in_use' });
  });

  it('reports paused and no-energy connection errors as non-transient reasons', async () => {
    const pausedError = new Error('database is paused');
    const noEnergyError = new Error('out of energy');
    const timeoutError = new Error('connection timed out');
    const onOffline = vi.fn();
    const { backendFacade } = createBackendWithFakes({
      connectGeneratedBindings: vi
        .fn()
        .mockImplementationOnce(async ({ onConnectError }) => {
          onConnectError(pausedError);
          return { ok: true };
        })
        .mockImplementationOnce(async ({ onConnectError }) => {
          onConnectError(noEnergyError);
          return { ok: true };
        })
        .mockImplementationOnce(async ({ onConnectError }) => {
          onConnectError(timeoutError);
          return { ok: true };
        }),
    });

    await backendFacade.start({ onOffline });
    await backendFacade.start({ onOffline });
    await backendFacade.start({ onOffline });

    expect(onOffline).toHaveBeenNthCalledWith(1, {
      reason: 'server_paused',
      error: pausedError,
    });
    expect(onOffline).toHaveBeenNthCalledWith(2, {
      reason: 'server_no_energy',
      error: noEnergyError,
    });
    expect(onOffline).toHaveBeenNthCalledWith(3, {
      reason: 'connect_timeout',
      error: timeoutError,
    });
  });
});
