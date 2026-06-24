import { describe, expect, it, vi } from 'vitest';

import { GardenSnapshotManager } from './GardenSnapshotManager.js';

describe('GardenSnapshotManager', () => {
  it('exposes plot level from emerald plot level ups', () => {
    const manager = new GardenSnapshotManager({
      gardenBalanceManager: {},
      gardenTileEntityManager: {
        getTileSnapshots: vi.fn(() => [
          {
            tileNumber: 1,
            unlocked: true,
            selectedSeedItemTypeId: null,
            seedItemTypeId: null,
            herbItemTypeId: null,
            harvestQuantity: 1,
            phase: 'empty',
            totalMs: 0,
            remainingMs: 0,
            progress: 0,
          },
        ]),
      },
      itemsFacade: {
        getItemDefinition: vi.fn(),
      },
      playerLevelFacade: {},
      researchFacade: {
        getPlotPlantingMultiplier: vi.fn((plotNumber) => (plotNumber === 1 ? 3 : 1)),
      },
    });

    expect(manager.getTileSnapshots()[0]).toMatchObject({
      tileNumber: 1,
      level: 3,
    });
  });
});
