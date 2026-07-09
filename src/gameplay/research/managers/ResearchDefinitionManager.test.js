import { describe, expect, it } from 'vitest';

import { ItemsFacade } from '../../items/ItemsFacade.js';
import { automationResearchIds } from '../../automation/automationResearchIds.js';
import taskBalance from '../../tasks/tasks.json';
import { advancedResearchIds } from '../advancedResearchIds.js';
import { automationReserveResearchIds } from '../automationReserveResearch.js';
import { capacityResearchIds } from '../capacityResearchIds.js';
import { emeraldResearchIds } from '../emeraldResearchIds.js';
import { ResearchBalanceManager } from './ResearchBalanceManager.js';
import { ResearchDefinitionManager } from './ResearchDefinitionManager.js';
import { researchCostResearchIds } from '../researchCostResearch.js';
import { researchTimeResearchIds } from '../researchTimeResearch.js';

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
        value: '75% preset',
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
