import { describe, expect, it, vi } from 'vitest';

import { gardenBulkResearchIds } from '../gardenBulkResearch.js';
import { GardenBulkActionManager } from './GardenBulkActionManager.js';

function createManager({
  completedResearchIds = [],
  tiles = [],
  plantSeed = vi.fn(),
  startHarvest = vi.fn(),
} = {}) {
  return {
    manager: new GardenBulkActionManager({
      gardenPlantingManager: { plantSeed, startHarvest },
      gardenTileEntityManager: {
        getTileSnapshots: () => tiles,
      },
      researchFacade: {
        hasCompletedResearch: (researchId) =>
          completedResearchIds.includes(researchId),
      },
    }),
    plantSeed,
    startHarvest,
  };
}

describe('GardenBulkActionManager', () => {
  it('plants the selected seed in unlocked empty plots in tile order', () => {
    const plantSeed = vi
      .fn()
      .mockImplementationOnce((tileNumber) => ({ ok: true, tileNumber }))
      .mockImplementationOnce(() => ({
        ok: false,
        reason: 'not_enough_seed',
      }));
    const { manager } = createManager({
      completedResearchIds: [gardenBulkResearchIds.plantAll],
      tiles: [
        { tileNumber: 3, unlocked: true, phase: 'growing' },
        { tileNumber: 1, unlocked: true, phase: 'empty' },
        { tileNumber: 2, unlocked: true, phase: 'empty' },
        { tileNumber: 4, unlocked: false, phase: 'empty' },
      ],
      plantSeed,
    });

    expect(manager.plantAll(7)).toMatchObject({
      ok: true,
      plantedTileNumbers: [1],
    });
    expect(plantSeed.mock.calls).toEqual([
      [1, 7],
      [2, 7],
    ]);
  });

  it('enforces the corresponding research before either bulk action', () => {
    const { manager, plantSeed, startHarvest } = createManager({
      tiles: [
        { tileNumber: 1, unlocked: true, phase: 'empty' },
        { tileNumber: 2, unlocked: true, phase: 'ready' },
      ],
    });

    expect(manager.plantAll(1)).toMatchObject({
      ok: false,
      reason: 'research_locked',
      requiredResearchId: gardenBulkResearchIds.plantAll,
    });
    expect(manager.harvestAll()).toMatchObject({
      ok: false,
      reason: 'research_locked',
      requiredResearchId: gardenBulkResearchIds.harvestAll,
    });
    expect(plantSeed).not.toHaveBeenCalled();
    expect(startHarvest).not.toHaveBeenCalled();
  });
});
