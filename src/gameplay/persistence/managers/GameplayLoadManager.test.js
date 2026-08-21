import { describe, expect, it, vi } from 'vitest';

import { GameplayLoadManager } from './GameplayLoadManager.js';

function createManager() {
  const noopFacade = {
    applyPersistenceSnapshot: vi.fn(),
  };
  const researchFacade = {
    applyPersistenceSnapshot: vi.fn(),
  };
  const manager = new GameplayLoadManager({
    manaFacade: noopFacade,
    coinFacade: noopFacade,
    crystalFacade: noopFacade,
    emeraldFacade: noopFacade,
    rubyFacade: noopFacade,
    gameplayLogFacade: noopFacade,
    itemsFacade: noopFacade,
    researchFacade,
    automationFacade: noopFacade,
    seedSummoningFacade: noopFacade,
    prestigeFacade: noopFacade,
    visualSettingsFacade: noopFacade,
    shopFacade: noopFacade,
    brewingFacade: noopFacade,
    gardenFacade: noopFacade,
    tasksFacade: noopFacade,
    personalTasksFacade: noopFacade,
    worldNoticeFacade: noopFacade,
    guildFacade: noopFacade,
  });

  return { manager, researchFacade };
}

describe('GameplayLoadManager', () => {
  it('does not infer paid capacity research from serialized locked plot rows', () => {
    const { manager, researchFacade } = createManager();

    manager.applySave({
      research: { completedIds: [] },
      garden: {
        unlockedTiles: 5,
        tiles: Array.from({ length: 12 }, (_unused, index) => ({
          tileNumber: index + 1,
        })),
      },
      brewing: { unlockedCauldrons: 2, cauldrons: [] },
      tasks: { currentLevel: 10 },
    });

    expect(researchFacade.applyPersistenceSnapshot).toHaveBeenCalledWith({
      completedIds: [],
    });
  });

  it('keeps legacy row inference when the explicit unlocked count is missing', () => {
    const { manager, researchFacade } = createManager();

    manager.applySave({
      research: { completedIds: [] },
      garden: {
        tiles: Array.from({ length: 8 }, (_unused, index) => ({
          tileNumber: index + 1,
        })),
      },
      brewing: { unlockedCauldrons: 2, cauldrons: [] },
      tasks: { currentLevel: 10 },
    });

    expect(researchFacade.applyPersistenceSnapshot).toHaveBeenCalledWith({
      completedIds: [
        'advanced:plotCapacity:6',
        'advanced:plotCapacity:7',
        'advanced:plotCapacity:8',
      ],
    });
  });
});
