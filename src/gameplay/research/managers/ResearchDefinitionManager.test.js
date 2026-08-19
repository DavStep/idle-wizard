import { describe, expect, it } from 'vitest';

import { ItemsFacade } from '../../items/ItemsFacade.js';
import { automationResearchIds } from '../../automation/automationResearchIds.js';
import taskBalance from '../../tasks/tasks.json';
import { advancedResearchIds, advancedResearchMaxLevel } from '../advancedResearchIds.js';
import { automationReserveResearchIds } from '../automationReserveResearch.js';
import { capacityResearchIds } from '../capacityResearchIds.js';
import { emeraldResearchIds } from '../emeraldResearchIds.js';
import { ResearchBalanceManager } from './ResearchBalanceManager.js';
import { ResearchDefinitionManager } from './ResearchDefinitionManager.js';
import { researchCostResearchIds } from '../researchCostResearch.js';
import { researchTimeResearchIds } from '../researchTimeResearch.js';
import {
  gardenBulkResearchIds,
  gardenBulkResearchLevels,
} from '../../garden/gardenBulkResearch.js';
import { itemTimerResearchIds } from '../itemTimerResearch.js';
import { manaResearchIds } from '../manaResearch.js';

function createManager() {
  let maxGardenTiles = 10;
  let maxCauldrons = 5;
  let currentLevel = 15;
  let completedPrestigeCount = 0;

  const manager = new ResearchDefinitionManager({
    itemsFacade: new ItemsFacade(),
    playerLevelFacade: {
      getMaxGardenTiles: () => maxGardenTiles,
      getMaxCauldrons: () => maxCauldrons,
      getSnapshot: () => ({ currentLevel }),
    },
    prestigeFacade: {
      getCompletedCount: () => completedPrestigeCount,
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
    setCompletedPrestigeCount: (count) => {
      completedPrestigeCount = count;
    },
  };
}

describe('ResearchDefinitionManager', () => {
  it('orders research tabs by their progression unlocks', () => {
    const { manager } = createManager();

    expect(manager.getResearchTabs().map((tab) => tab.id)).toEqual([
      'regular',
      'emerald',
      'automation',
      'advanced',
    ]);
  });

  it('offers level-gated sequential mana capacity and generation research', () => {
    const { manager } = createManager();
    const manaBox = manager
      .getRegularResearchBoxes()
      .find((box) => box.id === 'manaSphere');

    expect(manaBox?.researches).toHaveLength(198);
    expect(manaBox?.researches[0]).toMatchObject({
      id: manaResearchIds.capacity(2),
      requiredPlayerLevel: 2,
      requiredResearchIds: [],
      value: '+50 mana',
      description: 'increases mana capacity from 50 to 100.',
    });
    expect(manaBox?.researches[1]).toMatchObject({
      id: manaResearchIds.capacity(3),
      requiredPlayerLevel: 3,
      requiredResearchIds: [manaResearchIds.capacity(2)],
    });
    expect(manaBox?.researches[99]).toMatchObject({
      id: manaResearchIds.generation(2),
      requiredPlayerLevel: 2,
      requiredResearchIds: [],
      value: '+1/sec',
      description: 'increases mana generation from 1/sec to 2/sec.',
    });
    expect(manaBox?.researches[114]).toMatchObject({
      id: manaResearchIds.generation(17),
      requiredPlayerLevel: 17,
      requiredResearchIds: [manaResearchIds.generation(16)],
      value: '+0.25/sec',
      description: 'increases mana generation from 9/sec to 9.25/sec.',
    });
  });

  it('places each item unlock directly before its timer mastery chain', () => {
    const { manager } = createManager();
    const regularBoxes = manager.getRegularResearchBoxes({
      includeHiddenRecipeUnlocks: true,
    });
    const seedBox = regularBoxes.find((box) => box.id === 'seedUnlocks');
    const herbResearches = seedBox?.researches;
    const potionBox = regularBoxes.find((box) => box.id === 'recipeUnlocks');
    const potionResearches = potionBox?.researches;

    expect(herbResearches?.filter((research) => research.itemKey === 'sageHerb'))
      .toHaveLength(19);
    expect(herbResearches?.filter((research) => research.itemKey === 'mintHerb'))
      .toHaveLength(19);
    expect(herbResearches?.filter((research) => research.itemKey === 'glowcapHerb'))
      .toHaveLength(19);
    expect(seedBox?.label).toBe('seed research');
    expect(herbResearches?.slice(0, 4).map((research) => research.id)).toEqual([
      'unlockSeed:sageSeed',
      itemTimerResearchIds.herbGrowth('sageHerb', 1),
      itemTimerResearchIds.herbGrowth('sageHerb', 2),
      itemTimerResearchIds.herbGrowth('sageHerb', 3),
    ]);
    expect(herbResearches?.find(
      (research) =>
        research.id === itemTimerResearchIds.herbGrowth('sageHerb', 1),
    )).toMatchObject({
      id: itemTimerResearchIds.herbGrowth('sageHerb', 1),
      durationSeconds: 12,
      itemKind: 'herb',
      itemKey: 'sageHerb',
      artExtraKey: 'timerReduction',
      requiredResearchIds: ['unlockSeed:sageSeed'],
      starMaxLevel: 19,
    });
    expect(potionResearches?.filter((research) => research.itemKey === 'manaTonic'))
      .toHaveLength(19);
    expect(potionBox?.label).toBe('potion research');
    expect(potionResearches?.slice(0, 4).map((research) => research.id)).toEqual([
      'unlockRecipe:manaTonic',
      itemTimerResearchIds.potionBrewing('manaTonic', 1),
      itemTimerResearchIds.potionBrewing('manaTonic', 2),
      itemTimerResearchIds.potionBrewing('manaTonic', 3),
    ]);
    expect(potionResearches?.find(
      (research) =>
        research.id === itemTimerResearchIds.potionBrewing('manaTonic', 1),
    )).toMatchObject({
      durationSeconds: 30,
      itemKind: 'potion',
      artExtraKey: 'timerReduction',
      requiredResearchIds: ['unlockRecipe:manaTonic'],
      starMaxLevel: 19,
    });
    expect(manager.getResearch(
      itemTimerResearchIds.herbGrowth('pearlrootHerb', 19),
    )).toMatchObject({ durationSeconds: 18_278 });
    expect(
      herbResearches
        ?.filter((research) => research.itemKey === 'sageHerb')
        .slice(0, 2)
        .map((research) => research.description),
    ).toEqual([
      'reduces sage growing time from 12s to 11.68s.',
      'reduces sage growing time from 11.68s to 11.35s.',
    ]);
    expect(
      potionResearches
        ?.filter((research) => research.itemKey === 'manaTonic')
        .slice(0, 2)
        .map((research) => research.description),
    ).toEqual([
      'reduces mana tonic brewing time from 30s to 29.19s.',
      'reduces mana tonic brewing time from 29.19s to 28.38s.',
    ]);
  });

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

  it('offers a globally discovered hidden recipe as independent research', () => {
    const { manager, setCurrentLevel } = createManager();
    setCurrentLevel(1);
    manager.setPotionDiscoveryFacade({
      getSnapshot: () => ({ discoveries: [{ potionKey: 'ashenMemory' }] }),
      hasDiscoveredPotion: (potionKey) => potionKey === 'ashenMemory',
      isDiscoveredByCurrentPlayer: () => false,
    });

    expect(manager.getResearch('unlockRecipe:ashenMemory')).toMatchObject({
      id: 'unlockRecipe:ashenMemory',
      requiredResearchIds: [],
    });
    expect(manager.getResearch('unlockRecipe:ashenMemory')).not.toHaveProperty(
      'requiredPlayerLevel',
    );
  });

  it('does not offer redundant research to the recipe discoverer', () => {
    const { manager } = createManager();
    manager.setPotionDiscoveryFacade({
      getSnapshot: () => ({ discoveries: [{ potionKey: 'ashenMemory' }] }),
      hasDiscoveredPotion: () => true,
      isDiscoveredByCurrentPlayer: () => true,
    });

    expect(manager.hasConfiguredResearch('unlockRecipe:ashenMemory')).toBe(false);
  });

  it('offers one combined automation research per plot and cauldron', () => {
    const { manager } = createManager();
    const automationBoxes = manager
      .getResearchTabs()
      .find((tab) => tab.id === 'automation')?.boxes;
    const plotResearch = automationBoxes
      ?.find((box) => box.id === 'autoPlantTiles')
      ?.researches[0];
    const cauldronResearch = automationBoxes
      ?.find((box) => box.id === 'autoBrewCauldrons')
      ?.researches[0];

    expect(automationBoxes?.map((box) => box.id)).toEqual([
      'autoSeedSpawn',
      'autoPlantTiles',
      'autoBrewCauldrons',
    ]);
    expect(plotResearch).toMatchObject({
      id: automationResearchIds.autoPlantTile(1),
      label: 'automate plot 1',
    });
    expect(cauldronResearch).toMatchObject({
      id: automationResearchIds.autoBrewCauldron(1),
      label: 'automate cauldron 1',
    });
  });

  it('keeps mint seed research available during level 3 requirements', () => {
    const { manager, setCurrentLevel } = createManager();
    setCurrentLevel(2);

    expect(manager.getMissingRequiredPlayerLevel('unlockSeed:mintSeed')).toBeNull();
    expect(manager.getResearch('unlockSeed:mintSeed')).toMatchObject({
      id: 'unlockSeed:mintSeed',
      requiredPlayerLevel: 2,
    });
  });

  it('keeps mana tonic research available during level 5 requirements', () => {
    const { manager, setCurrentLevel } = createManager();
    setCurrentLevel(4);

    expect(manager.getMissingRequiredPlayerLevel('unlockRecipe:manaTonic')).toBeNull();
    expect(manager.getResearch('unlockRecipe:manaTonic')).toMatchObject({
      id: 'unlockRecipe:manaTonic',
      requiredPlayerLevel: 4,
    });
  });

  it('unlocks Garden bulk-action research at levels 5 and 10', () => {
    const { manager, setCurrentLevel } = createManager();

    setCurrentLevel(gardenBulkResearchLevels.plantAll - 1);
    expect(
      manager.getMissingRequiredPlayerLevel(gardenBulkResearchIds.plantAll),
    ).toBe(gardenBulkResearchLevels.plantAll);

    setCurrentLevel(gardenBulkResearchLevels.plantAll);
    expect(
      manager.getMissingRequiredPlayerLevel(gardenBulkResearchIds.plantAll),
    ).toBeNull();
    expect(
      manager.getResearch(gardenBulkResearchIds.harvestAll),
    ).toMatchObject({
      requiredPlayerLevel: gardenBulkResearchLevels.harvestAll,
      requiredResearchIds: [gardenBulkResearchIds.plantAll],
    });
  });

  it('keeps task-required research available when that requirement is active', () => {
    const { manager, setCurrentLevel } = createManager();

    for (const level of taskBalance.levels) {
      const activePlayerLevel = level.level - 1;

      for (const task of level.tasks) {
        if (task.type !== 'research') {
          continue;
        }

        setCurrentLevel(activePlayerLevel);

        expect(
          manager.getMissingRequiredPlayerLevel(task.researchId),
          `${task.researchId} must be available during level ${level.level} requirements`,
        ).toBeNull();
      }
    }
  });

  it('shows slot researches unlocked by completed capacity research', () => {
    const { manager, setMaxGardenTiles, setMaxCauldrons } = createManager();
    setMaxGardenTiles(3);
    setMaxCauldrons(2);
    const completedResearchIds = [
      capacityResearchIds.plot(6),
      capacityResearchIds.cauldron(3),
    ];
    const tabs = manager.getVisibleResearchTabs(completedResearchIds);
    const getResearchIds = (tabId, boxId) =>
      tabs
        .find((tab) => tab.id === tabId)
        ?.boxes.find((box) => box.id === boxId)
        ?.researches.map((research) => research.id) ?? [];

    expect(manager.hasResearch(automationResearchIds.autoPlantTile(6))).toBe(false);
    expect(
      manager.hasResearch(automationResearchIds.autoPlantTile(6), {
        completedResearchIds,
      }),
    ).toBe(true);
    expect(getResearchIds('automation', 'autoPlantTiles')).toContain(
      automationResearchIds.autoPlantTile(6),
    );
    expect(getResearchIds('automation', 'autoPlantTiles')).not.toContain(
      automationResearchIds.autoPlantTile(7),
    );
    expect(getResearchIds('automation', 'autoBrewCauldrons')).toContain(
      automationResearchIds.autoBrewCauldron(3),
    );
    expect(getResearchIds('automation', 'autoBrewCauldrons')).not.toContain(
      automationResearchIds.autoBrewCauldron(4),
    );
    expect(getResearchIds('advanced', 'plotGrowth')).toContain(
      advancedResearchIds.plotGrowth(6, 1),
    );
    expect(getResearchIds('emerald', 'cauldronBrewing')).toContain(
      emeraldResearchIds.cauldronBrewing(3, 2),
    );
  });

  it('limits visible slot researches to plots and cauldrons the player owns', () => {
    const { manager } = createManager();
    const tabs = manager.getVisibleResearchTabs([], {
      unlockedPlotCount: 5,
      unlockedCauldronCount: 2,
    });
    const getResearchIds = (tabId, boxId) =>
      tabs
        .find((tab) => tab.id === tabId)
        ?.boxes.find((box) => box.id === boxId)
        ?.researches.map((research) => research.id) ?? [];

    expect(getResearchIds('automation', 'autoPlantTiles')).toContain(
      automationResearchIds.autoPlantTile(5),
    );
    expect(getResearchIds('automation', 'autoPlantTiles')).not.toContain(
      automationResearchIds.autoPlantTile(6),
    );
    expect(getResearchIds('automation', 'autoBrewCauldrons')).toContain(
      automationResearchIds.autoBrewCauldron(2),
    );
    expect(getResearchIds('automation', 'autoBrewCauldrons')).not.toContain(
      automationResearchIds.autoBrewCauldron(3),
    );
    expect(getResearchIds('advanced', 'plotGrowth')).not.toContain(
      advancedResearchIds.plotGrowth(6, 1),
    );
    expect(getResearchIds('emerald', 'cauldronBrewing')).not.toContain(
      emeraldResearchIds.cauldronBrewing(3, 2),
    );
    expect(getResearchIds('advanced', 'plotCapacity')).toContain(
      capacityResearchIds.plot(6),
    );
    expect(getResearchIds('advanced', 'cauldronCapacity')).toContain(
      capacityResearchIds.cauldron(3),
    );
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
      displayName: 'research time',
      value: '-10% time',
      starLevel: 1,
      starMaxLevel: 8,
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
      displayName: 'research cost',
      value: '-10% cost',
      starLevel: 1,
      starMaxLevel: 8,
      requiredResearchIds: [],
    });
    expect(box?.researches[7]).toMatchObject({
      id: researchCostResearchIds.reduction(8),
      value: '-80% cost',
      requiredResearchIds: [researchCostResearchIds.reduction(7)],
    });
  });

  it('adds prestige-gated automation reserve research rows', () => {
    const { manager } = createManager();
    const box = manager
      .getResearchTabs()
      .find((tab) => tab.id === 'advanced')
      ?.boxes.find((nextBox) => nextBox.id === 'automationReserve');

    expect(box?.researches).toMatchObject([
      {
        id: automationReserveResearchIds.controls(1),
        label: 'automation reserve lvl 1',
        displayName: 'automation reserve',
        value: '75% preset',
        starLevel: 1,
        starMaxLevel: 3,
        requiredPrestigeCount: 4,
        requiredResearchIds: [],
      },
      {
        id: automationReserveResearchIds.controls(2),
        value: 'cap preset',
        requiredPrestigeCount: 4,
        requiredResearchIds: [automationReserveResearchIds.controls(1)],
      },
      {
        id: automationReserveResearchIds.controls(3),
        value: '1000 step',
        requiredPrestigeCount: 4,
        requiredResearchIds: [automationReserveResearchIds.controls(2)],
      },
    ]);
  });

  it('gates stronger room study levels behind Prestige 5', () => {
    const { manager } = createManager();
    const box = manager
      .getResearchTabs()
      .find((tab) => tab.id === 'advanced')
      ?.boxes.find((nextBox) => nextBox.id === 'plotGrowth');
    const level5 = box?.researches.find(
      (research) => research.id === advancedResearchIds.plotGrowth(1, 5),
    );
    const level6 = box?.researches.find(
      (research) => research.id === advancedResearchIds.plotGrowth(1, 6),
    );

    expect(level5).not.toHaveProperty('requiredPrestigeCount');
    expect(level6).toMatchObject({
      requiredPrestigeCount: 5,
      requiredResearchIds: [advancedResearchIds.plotGrowth(1, 5)],
    });
  });

  it('offers twelve star-ranked advanced studies for each room slot', () => {
    const { manager } = createManager();
    const box = manager
      .getResearchTabs()
      .find((tab) => tab.id === 'advanced')
      ?.boxes.find((nextBox) => nextBox.id === 'plotGrowth');
    const plotOneResearches = box?.researches.filter((research) =>
      research.id.startsWith('advanced:plotGrowth:1:'),
    );

    expect(plotOneResearches).toHaveLength(advancedResearchMaxLevel);
    expect(plotOneResearches?.[0]).toMatchObject({
      id: advancedResearchIds.plotGrowth(1, 1),
      label: 'plot 1 growth',
      starLevel: 1,
      starMaxLevel: 12,
    });
    expect(plotOneResearches?.at(-1)).toMatchObject({
      id: advancedResearchIds.plotGrowth(1, 12),
      starLevel: 12,
      starMaxLevel: 12,
      requiredResearchIds: [advancedResearchIds.plotGrowth(1, 11)],
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
      displayName: 'plot 1',
      value: 'x2 herbs',
      actionType: 'levelUp',
      level: 2,
      starLevel: 1,
      starMaxLevel: 4,
      description:
        'multi-grow: plot 1 now grows 2 herbs at once.',
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
      starMaxLevel: 4,
      description:
        'multibrew: cauldron 1 now brews 2 potions at once.',
    });
  });
});
