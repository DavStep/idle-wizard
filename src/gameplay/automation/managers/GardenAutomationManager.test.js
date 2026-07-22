import { describe, expect, it, vi } from 'vitest';

import { automationResearchIds } from '../automationResearchIds.js';
import { GardenAutomationManager } from './GardenAutomationManager.js';

function createManager(tiles) {
  const gardenFacade = {
    getSnapshot: () => ({ plot: { tiles } }),
    plantSelectedSeed: vi.fn(() => ({ ok: true })),
    startHarvest: vi.fn(),
  };
  const completedResearchId = automationResearchIds.autoPlantTile(1);
  const manager = new GardenAutomationManager({
    gardenFacade,
    researchFacade: {
      hasCompletedResearch: (researchId) => researchId === completedResearchId,
      hasCompletedResearchMatching: (predicate) => predicate(completedResearchId),
    },
  });

  return { gardenFacade, manager };
}

describe('GardenAutomationManager', () => {
  it('uses plot automation to harvest its ready plant', () => {
    const { gardenFacade, manager } = createManager([
      { tileNumber: 1, unlocked: true, phase: 'ready' },
    ]);

    manager.update();

    expect(gardenFacade.startHarvest).toHaveBeenCalledWith(1);
  });

  it('uses the same plot automation to plant its selected seed', () => {
    const { gardenFacade, manager } = createManager([
      {
        tileNumber: 1,
        unlocked: true,
        phase: 'empty',
        selectedSeedItemTypeId: 1,
      },
    ]);

    manager.update();

    expect(gardenFacade.plantSelectedSeed).toHaveBeenCalledWith(1);
  });
});
