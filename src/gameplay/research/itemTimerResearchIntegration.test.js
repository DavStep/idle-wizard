import { describe, expect, it, vi } from 'vitest';

import { BrewingStartManager } from '../brewing/managers/BrewingStartManager.js';
import { GardenPlantingManager } from '../garden/managers/GardenPlantingManager.js';

describe('item timer research integration', () => {
  it('applies herb mastery before plot research', () => {
    const researchFacade = {
      getReducedHerbGrowthDurationMs: vi.fn(() => 54_000),
      getReducedPlotGrowthDurationMs: vi.fn((_plotNumber, durationMs) =>
        Math.round(durationMs * 0.5),
      ),
    };
    const manager = new GardenPlantingManager({ researchFacade });

    expect(
      manager.getGrowthDurationMs(3, {
        key: 'glowcapHerb',
        growthDurationMs: 111_000,
      }),
    ).toBe(27_000);
    expect(researchFacade.getReducedHerbGrowthDurationMs).toHaveBeenCalledWith(
      'glowcapHerb',
      111_000,
    );
    expect(researchFacade.getReducedPlotGrowthDurationMs).toHaveBeenCalledWith(
      3,
      54_000,
    );
  });

  it('applies potion mastery before cauldron research and ignores wasted brews', () => {
    const researchFacade = {
      getReducedPotionBrewingDurationMs: vi.fn(() => 27_000),
      getReducedCauldronBrewingDurationMs: vi.fn((_cauldronNumber, durationMs) =>
        Math.round(durationMs * 0.5),
      ),
    };
    const manager = new BrewingStartManager({
      brewingBalanceManager: { getWastedBrewDurationMs: () => 4_000 },
      researchFacade,
    });

    expect(
      manager.getBrewDurationMs(2, {
        key: 'lanternTonic',
        brewDurationMs: 101_750,
      }),
    ).toBe(13_500);
    expect(researchFacade.getReducedPotionBrewingDurationMs).toHaveBeenCalledWith(
      'lanternTonic',
      101_750,
    );
    expect(researchFacade.getReducedCauldronBrewingDurationMs).toHaveBeenCalledWith(
      2,
      27_000,
    );

    researchFacade.getReducedPotionBrewingDurationMs.mockClear();
    expect(manager.getBrewDurationMs(1, null)).toBe(2_000);
    expect(researchFacade.getReducedPotionBrewingDurationMs).not.toHaveBeenCalled();
  });
});
