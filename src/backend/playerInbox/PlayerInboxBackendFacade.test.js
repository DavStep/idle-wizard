import { describe, expect, it, vi } from 'vitest';

import { PlayerInboxBackendFacade } from './PlayerInboxBackendFacade.js';

describe('PlayerInboxBackendFacade', () => {
  it('claims locally then confirms server collection', async () => {
    const facade = new PlayerInboxBackendFacade();
    const collectReward = vi.fn().mockResolvedValue({ ok: true });
    const claimInboxReward = vi.fn(() => ({ ok: true }));
    const savePersistenceSnapshotAndFlush = vi.fn().mockResolvedValue(true);

    facade.subscriptionManager = {
      getSnapshot: () => ({
        connected: true,
        mail: [
          {
            mailKey: 'admin:gift:identity',
            hasReward: true,
            rewardCollected: false,
            reward: { coin: 5, crystal: 0, ruby: 0, emerald: 0, items: [] },
          },
        ],
      }),
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    facade.actionManager = {
      collectReward,
      markRead: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    facade.setGameplayFacade({ claimInboxReward, savePersistenceSnapshotAndFlush });

    await expect(facade.claimReward('admin:gift:identity')).resolves.toMatchObject({
      ok: true,
    });

    expect(claimInboxReward).toHaveBeenCalledTimes(1);
    expect(savePersistenceSnapshotAndFlush).toHaveBeenCalledTimes(1);
    expect(collectReward).toHaveBeenCalledWith('admin:gift:identity');
  });

  it('does not mark server mail collected until the reward save flushes', async () => {
    const facade = new PlayerInboxBackendFacade();
    const collectReward = vi.fn().mockResolvedValue({ ok: true });
    const claimInboxReward = vi.fn(() => ({ ok: true }));
    const savePersistenceSnapshotAndFlush = vi.fn().mockResolvedValue(false);

    facade.subscriptionManager = {
      getSnapshot: () => ({
        connected: true,
        mail: [
          {
            mailKey: 'worldEvent:weekly-1:id',
            hasReward: true,
            rewardCollected: false,
            reward: { coin: 0, crystal: 2, ruby: 0, emerald: 1, items: [] },
          },
        ],
      }),
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    facade.actionManager = {
      collectReward,
      markRead: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    facade.setGameplayFacade({ claimInboxReward, savePersistenceSnapshotAndFlush });

    await expect(facade.claimReward('worldEvent:weekly-1:id')).resolves.toMatchObject({
      ok: true,
      pendingServer: true,
      reason: 'gameplay_flush_failed',
    });

    expect(claimInboxReward).toHaveBeenCalledTimes(1);
    expect(savePersistenceSnapshotAndFlush).toHaveBeenCalledTimes(1);
    expect(collectReward).not.toHaveBeenCalled();
  });

  it('does not grant a reward server already marked collected', async () => {
    const facade = new PlayerInboxBackendFacade();
    const claimInboxReward = vi.fn(() => ({ ok: true }));

    facade.subscriptionManager = {
      getSnapshot: () => ({
        connected: true,
        mail: [
          {
            mailKey: 'admin:gift:identity',
            hasReward: true,
            rewardCollected: true,
          },
        ],
      }),
    };
    facade.setGameplayFacade({ claimInboxReward });

    await expect(facade.claimReward('admin:gift:identity')).resolves.toEqual({
      ok: true,
      alreadyCollected: true,
    });
    expect(claimInboxReward).not.toHaveBeenCalled();
  });
});
