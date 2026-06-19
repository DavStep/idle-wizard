import { describe, expect, it, vi } from 'vitest';

import { PlayerLevelSnapshotManager } from './PlayerLevelSnapshotManager.js';

describe('PlayerLevelSnapshotManager', () => {
  it('reuses level summaries until level or balance changes', () => {
    let currentLevel = 2;
    let balanceRevision = 1;
    const playerLevelBalanceManager = {
      getRevision: vi.fn(() => balanceRevision),
      getMaxLevel: vi.fn(() => 3),
      getEffects: vi.fn((level) => ({ level })),
      getLevelSummaries: vi.fn((level) => [{ level }]),
    };
    const tasksFacade = {
      getSnapshot: vi.fn(() => ({ currentLevel })),
    };
    const manager = new PlayerLevelSnapshotManager({
      playerLevelBalanceManager,
      tasksFacade,
    });

    const firstSnapshot = manager.getSnapshot();
    const secondSnapshot = manager.getSnapshot();

    expect(secondSnapshot).toBe(firstSnapshot);
    expect(playerLevelBalanceManager.getLevelSummaries).toHaveBeenCalledTimes(1);

    currentLevel = 3;
    const levelChangedSnapshot = manager.getSnapshot();

    expect(levelChangedSnapshot).not.toBe(firstSnapshot);
    expect(playerLevelBalanceManager.getLevelSummaries).toHaveBeenCalledTimes(2);

    balanceRevision = 2;
    manager.getSnapshot();

    expect(playerLevelBalanceManager.getLevelSummaries).toHaveBeenCalledTimes(3);
  });
});
