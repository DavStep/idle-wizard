import { describe, expect, it } from 'vitest';

import { ItemsFacade } from '../../items/ItemsFacade.js';
import { ResearchBalanceManager } from './ResearchBalanceManager.js';
import { ResearchDefinitionManager } from './ResearchDefinitionManager.js';

function createManager() {
  let maxGardenTiles = 10;
  let maxCauldrons = 5;
  let currentLevel = 15;

  const manager = new ResearchDefinitionManager({
    itemsFacade: new ItemsFacade(),
    playerLevelFacade: {
      getMaxGardenTiles: () => maxGardenTiles,
      getMaxCauldrons: () => maxCauldrons,
      getSnapshot: () => ({ currentLevel }),
    },
    prestigeFacade: {
      getCompletedCount: () => 0,
    },
    researchBalanceManager: new ResearchBalanceManager(),
  });

  return {
    manager,
    setMaxGardenTiles: (count) => {
      maxGardenTiles = count;
    },
    setMaxCauldrons: (count) => {
      maxCauldrons = count;
    },
    setCurrentLevel: (level) => {
      currentLevel = level;
    },
  };
}

describe('ResearchDefinitionManager', () => {
  it('reuses research definitions for the same visible state', () => {
    const { manager } = createManager();
    const firstTabs = manager.getResearchTabs();
    const firstResearch = manager.getResearch('unlockSeed:mintSeed');

    expect(manager.getResearchTabs()).toBe(firstTabs);
    expect(manager.getResearch('unlockSeed:mintSeed')).toBe(firstResearch);
  });

  it('separates cached definitions when visible capacity changes', () => {
    const { manager, setMaxGardenTiles } = createManager();
    setMaxGardenTiles(4);
    const firstTabs = manager.getResearchTabs();

    setMaxGardenTiles(5);

    expect(manager.getResearchTabs()).not.toBe(firstTabs);
  });

  it('clears cached definitions on demand', () => {
    const { manager } = createManager();
    const firstTabs = manager.getResearchTabs();

    manager.clearCache();

    expect(manager.getResearchTabs()).not.toBe(firstTabs);
  });

  it('keeps configured research lookup independent from visible level gates', () => {
    const { manager, setCurrentLevel } = createManager();
    setCurrentLevel(1);

    expect(manager.hasResearch('unlockRecipe:manaTonic')).toBe(false);
    expect(manager.hasConfiguredResearch('unlockRecipe:manaTonic')).toBe(true);
  });
});
