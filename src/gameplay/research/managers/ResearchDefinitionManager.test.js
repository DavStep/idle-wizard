import { describe, expect, it } from 'vitest';

import { ItemsFacade } from '../../items/ItemsFacade.js';
import { ResearchBalanceManager } from './ResearchBalanceManager.js';
import { ResearchDefinitionManager } from './ResearchDefinitionManager.js';
import { researchCostResearchIds } from '../researchCostResearch.js';
import { researchTimeResearchIds } from '../researchTimeResearch.js';

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

  it('adds staged research time reduction rows to advanced research', () => {
    const { manager } = createManager();
    const box = manager
      .getResearchTabs()
      .find((tab) => tab.id === 'advanced')
      ?.boxes.find((nextBox) => nextBox.id === 'researchTime');

    expect(box?.researches[0]).toMatchObject({
      id: researchTimeResearchIds.reduction(1),
      label: 'research time lvl 1',
      value: '-10% time',
      requiredResearchIds: [],
    });
    expect(box?.researches[7]).toMatchObject({
      id: researchTimeResearchIds.reduction(8),
      value: '-80% time',
      requiredResearchIds: [researchTimeResearchIds.reduction(7)],
    });
  });

  it('adds staged research cost reduction rows to advanced research', () => {
    const { manager } = createManager();
    const box = manager
      .getResearchTabs()
      .find((tab) => tab.id === 'advanced')
      ?.boxes.find((nextBox) => nextBox.id === 'researchCost');

    expect(box?.researches[0]).toMatchObject({
      id: researchCostResearchIds.reduction(1),
      label: 'research cost lvl 1',
      value: '-10% cost',
      requiredResearchIds: [],
    });
    expect(box?.researches[7]).toMatchObject({
      id: researchCostResearchIds.reduction(8),
      value: '-80% cost',
      requiredResearchIds: [researchCostResearchIds.reduction(7)],
    });
  });

  it('presents emerald plot and cauldron upgrades as level ups', () => {
    const { manager } = createManager();
    const emeraldTab = manager.getResearchTabs().find((tab) => tab.id === 'emerald');
    const plotBox = emeraldTab?.boxes.find((nextBox) => nextBox.id === 'plotPlanting');
    const cauldronBox = emeraldTab?.boxes.find(
      (nextBox) => nextBox.id === 'cauldronBrewing',
    );

    expect(plotBox).toMatchObject({
      label: 'plot level up',
    });
    expect(plotBox?.researches[0]).toMatchObject({
      id: 'emerald:plotPlanting:1:2',
      label: 'plot 1 lvl 2',
      value: 'x2 herbs',
      actionType: 'levelUp',
      level: 2,
      description:
        'levels plot 1 to lvl 2: it uses 2 seeds and harvests 2 herbs in one growth timer.',
    });
    expect(cauldronBox).toMatchObject({
      label: 'cauldron level up',
    });
    expect(cauldronBox?.researches[0]).toMatchObject({
      id: 'emerald:cauldronBrewing:1:2',
      label: 'cauldron 1',
      value: 'x2 potions',
      actionType: 'levelUp',
      level: 2,
      starLevel: 1,
      description:
        'sets cauldron 1 to ★: it uses 2 recipe inputs and mana costs to bottle 2 potions in one brew timer.',
    });
  });
});
