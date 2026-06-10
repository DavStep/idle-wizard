import { describe, expect, it, vi } from 'vitest';

import { BackendFacade } from './BackendFacade.js';

function createBackendWithFakes() {
  const backendFacade = new BackendFacade();
  const clearOwnProgress = vi.fn(() => Promise.resolve({ ok: true }));

  backendFacade.leaderboardFacade = {
    setGameplayFacade: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
  backendFacade.worldChatFacade = {
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
  backendFacade.npcMarketFacade = {
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
  backendFacade.playerSyncFacade = {
    setPlayerFacade: vi.fn(),
    setGameplayFacade: vi.fn(),
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
    connectGeneratedBindings: vi.fn(async ({ onConnect }) => {
      onConnect({}, 'identity-1');
      return { ok: true };
    }),
    disconnect: vi.fn(),
  };

  return { backendFacade, clearOwnProgress };
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

    expect(clearOwnProgress).not.toHaveBeenCalled();
  });
});
