import { automationResearchIds } from '../../automation/automationResearchIds.js';
import {
  advancedResearchIds,
  advancedResearchMaxLevel,
  getAdvancedResearchLevelReductionPercent,
} from '../advancedResearchIds.js';

const summonSeedResearches = [
  {
    id: 'summonSeedsX2',
    label: 'x2 summon',
    value: '20 mana',
    description: 'summons 2 researched seeds for 20 mana.',
  },
  {
    id: 'summonSeedsX3',
    label: 'x3 summon',
    value: '30 mana',
    requiredResearchIds: ['summonSeedsX2'],
    description: 'summons 3 researched seeds for 30 mana.',
  },
  {
    id: 'summonSeedsX4',
    label: 'x4 summon',
    value: '40 mana',
    requiredResearchIds: ['summonSeedsX3'],
    description: 'summons 4 researched seeds for 40 mana.',
  },
  {
    id: 'summonSeedsX5',
    label: 'x5 summon',
    value: '50 mana',
    requiredResearchIds: ['summonSeedsX4'],
    description: 'summons 5 researched seeds for 50 mana.',
  },
];

const maxAutomationGardenTiles = 10;
const maxAutomationCauldrons = 5;

export class ResearchDefinitionManager {
  constructor({ itemsFacade, playerLevelFacade, researchBalanceManager }) {
    this.itemsFacade = itemsFacade;
    this.playerLevelFacade = playerLevelFacade;
    this.researchBalanceManager = researchBalanceManager;
  }

  getResearchTabs({ includeLevelLockedAutomation = false } = {}) {
    return [
      {
        id: 'regular',
        label: 'regular research',
        boxes: this.getRegularResearchBoxes({
          includeHiddenRecipeUnlocks: includeLevelLockedAutomation,
        }),
      },
      {
        id: 'automation',
        label: 'automation',
        boxes: this.getAutomationResearchBoxes({ includeLevelLockedAutomation }),
      },
      {
        id: 'advanced',
        label: 'advanced research',
        boxes: this.getAdvancedResearchBoxes({ includeLevelLockedAutomation }),
      },
    ];
  }

  getRegularResearchBoxes({ includeHiddenRecipeUnlocks = false } = {}) {
    const boxes = [
      {
        id: 'seedUnlocks',
        label: 'seed unlock researches',
        researches: this.getSeedUnlockResearches(),
      },
      {
        id: 'summonSeeds',
        label: 'summon seeds unlock',
        researches: summonSeedResearches,
      },
    ];

    if (includeHiddenRecipeUnlocks || this.areRecipeUnlocksVisible()) {
      boxes.push({
        id: 'recipeUnlocks',
        label: 'recipe unlocks research',
        researches: this.getRecipeUnlockResearches(),
      });
    }

    return boxes;
  }

  areRecipeUnlocksVisible() {
    return (this.playerLevelFacade?.getSnapshot?.().currentLevel ?? 1) >= 4;
  }

  getResearchBoxes(options) {
    return this.getResearchTabs(options).flatMap((tab) => tab.boxes);
  }

  getVisibleResearchBoxes(completedResearchIds = []) {
    return this.getVisibleResearchTabs(completedResearchIds)[0]?.boxes ?? [];
  }

  getVisibleResearchTabs(completedResearchIds = []) {
    const completedIds = new Set(
      completedResearchIds.map((researchId) => this.normalizeResearchId(researchId)),
    );

    return this.getResearchTabs().map((tab) => ({
      ...tab,
      boxes: tab.boxes.map((box) => ({
        ...box,
        researches: box.researches.filter((research) =>
          this.isVisibleResearch(research, completedIds),
        ),
      })),
    }));
  }

  getSeedUnlockResearches() {
    return this.itemsFacade.getSeedDefinitions().map((seed, index, seeds) => {
      const previousSeed = seeds[index - 1];

      return {
        id: `unlockSeed:${seed.key}`,
        label: seed.label,
        value: 'drop',
        ...(previousSeed
          ? { requiredResearchIds: [`unlockSeed:${previousSeed.key}`] }
          : {}),
        description: `allows ${seed.label} to drop from summon seed.`,
      };
    });
  }

  getRecipeUnlockResearches() {
    return this.itemsFacade.getRecipePotionDefinitions().map((potion, index, potions) => {
      const previousPotion = potions[index - 1];

      return {
        id: `unlockRecipe:${potion.key}`,
        label: potion.label,
        value: 'brew',
        ...(previousPotion
          ? { requiredResearchIds: [`unlockRecipe:${previousPotion.key}`] }
          : {}),
        description: `allows valid cauldron ingredients to brew ${potion.label}.`,
      };
    });
  }

  getAutomationResearchBoxes({ includeLevelLockedAutomation = false } = {}) {
    return [
      {
        id: 'autoSeedSpawn',
        label: 'auto seed spawn research',
        researches: [
          {
            id: automationResearchIds.autoSeedSpawn(),
            label: 'auto seed spawn',
            value: 'auto',
            description: 'summons researched seeds when enough mana is available.',
          },
        ],
      },
      {
        id: 'autoPlantTiles',
        label: 'auto plant tile research',
        researches: this.getNumberedResearches({
          count: this.getAutomationGardenTileCount({ includeLevelLockedAutomation }),
          getId: automationResearchIds.autoPlantTile,
          label: (tileNumber) => `auto plant tile ${tileNumber}`,
          description: (tileNumber) =>
            `garden tile ${tileNumber} plants its selected seed when one is available.`,
        }),
      },
      {
        id: 'autoHarvestTiles',
        label: 'auto harvest tile research',
        researches: this.getNumberedResearches({
          count: this.getAutomationGardenTileCount({ includeLevelLockedAutomation }),
          getId: automationResearchIds.autoHarvestPlant,
          label: (tileNumber) => `auto harvest tile ${tileNumber}`,
          description: (tileNumber) =>
            `garden tile ${tileNumber} starts harvesting ready plants without a tap.`,
        }),
      },
      {
        id: 'autoBrewCauldrons',
        label: 'auto brew cauldron research',
        researches: this.getNumberedResearches({
          count: this.getAutomationCauldronCount({ includeLevelLockedAutomation }),
          getId: automationResearchIds.autoBrewCauldron,
          label: (cauldronNumber) => `auto brew cauldron ${cauldronNumber}`,
          description: (cauldronNumber) =>
            `cauldron ${cauldronNumber} starts brewing when staged ingredients and mana are ready.`,
        }),
      },
      {
        id: 'autoBottleCauldrons',
        label: 'auto bottle cauldron research',
        researches: this.getNumberedResearches({
          count: this.getAutomationCauldronCount({ includeLevelLockedAutomation }),
          getId: automationResearchIds.autoBottleCauldron,
          label: (cauldronNumber) => `auto bottle cauldron ${cauldronNumber}`,
          description: (cauldronNumber) =>
            `cauldron ${cauldronNumber} starts bottling finished brews without a tap.`,
        }),
      },
      {
        id: 'autoCollectCauldrons',
        label: 'auto collect cauldron research',
        researches: this.getNumberedResearches({
          count: this.getAutomationCauldronCount({ includeLevelLockedAutomation }),
          getId: automationResearchIds.autoCollectCauldron,
          label: (cauldronNumber) => `auto collect cauldron ${cauldronNumber}`,
          description: (cauldronNumber) =>
            `cauldron ${cauldronNumber} moves bottled potions into inventory without a tap.`,
        }),
      },
    ];
  }

  getAdvancedResearchBoxes({ includeLevelLockedAutomation = false } = {}) {
    return [
      {
        id: 'cauldronBrewing',
        label: 'cauldron brewing research',
        researches: this.getAdvancedSlotResearches({
          count: this.getAutomationCauldronCount({ includeLevelLockedAutomation }),
          getId: advancedResearchIds.cauldronBrewing,
          seriesId: (cauldronNumber) => `advanced:cauldronBrewing:${cauldronNumber}`,
          label: (cauldronNumber, level) =>
            `cauldron ${cauldronNumber} brewing lvl ${level}`,
          description: (cauldronNumber, level) =>
            `cauldron ${cauldronNumber} brewing time is reduced by ${getAdvancedResearchLevelReductionPercent(level)}%.`,
        }),
      },
      {
        id: 'plotGrowth',
        label: 'plot growth research',
        researches: this.getAdvancedSlotResearches({
          count: this.getAutomationGardenTileCount({ includeLevelLockedAutomation }),
          getId: advancedResearchIds.plotGrowth,
          seriesId: (plotNumber) => `advanced:plotGrowth:${plotNumber}`,
          label: (plotNumber, level) => `plot ${plotNumber} growth lvl ${level}`,
          description: (plotNumber, level) =>
            `plot ${plotNumber} growth time is reduced by ${getAdvancedResearchLevelReductionPercent(level)}%.`,
        }),
      },
    ];
  }

  getAdvancedSlotResearches({ count, getId, seriesId, label, description }) {
    const researches = [];

    for (let targetNumber = 1; targetNumber <= count; targetNumber += 1) {
      for (let level = 1; level <= advancedResearchMaxLevel; level += 1) {
        researches.push({
          id: getId(targetNumber, level),
          label: label(targetNumber, level),
          value: `-${getAdvancedResearchLevelReductionPercent(level)}% time`,
          showEffect: true,
          seriesId: seriesId(targetNumber),
          requiredResearchIds:
            level > 1 ? [getId(targetNumber, level - 1)] : [],
          description: description(targetNumber, level),
        });
      }
    }

    return researches;
  }

  getNumberedResearches({ count, getId, label, description }) {
    return Array.from({ length: count }, (_value, index) => {
      const targetNumber = index + 1;
      const research = {
        id: getId(targetNumber),
        label: label(targetNumber),
        value: 'auto',
        description: description(targetNumber),
      };

      if (targetNumber > 1) {
        research.requiredResearchIds = [getId(targetNumber - 1)];
      }

      return research;
    });
  }

  getAutomationGardenTileCount({ includeLevelLockedAutomation = false } = {}) {
    if (includeLevelLockedAutomation) {
      return maxAutomationGardenTiles;
    }

    return this.clampAutomationCount(
      this.playerLevelFacade?.getMaxGardenTiles?.(),
      maxAutomationGardenTiles,
    );
  }

  getAutomationCauldronCount({ includeLevelLockedAutomation = false } = {}) {
    if (includeLevelLockedAutomation) {
      return maxAutomationCauldrons;
    }

    return this.clampAutomationCount(
      this.playerLevelFacade?.getMaxCauldrons?.(),
      maxAutomationCauldrons,
    );
  }

  clampAutomationCount(count, maxCount) {
    if (!Number.isInteger(count)) {
      return maxCount;
    }

    return Math.max(0, Math.min(maxCount, count));
  }

  getResearches(options) {
    return this.getResearchBoxes(options).flatMap((box) => box.researches);
  }

  hasResearch(researchId) {
    const normalizedResearchId = this.normalizeResearchId(researchId);
    return (
      this.researchBalanceManager.isResearchEnabled(normalizedResearchId) &&
      this.getResearches().some((research) => research.id === normalizedResearchId)
    );
  }

  hasConfiguredResearch(researchId) {
    const normalizedResearchId = this.normalizeResearchId(researchId);
    return (
      this.researchBalanceManager.isResearchEnabled(normalizedResearchId) &&
      this.getResearches({ includeLevelLockedAutomation: true }).some(
        (research) => research.id === normalizedResearchId,
      )
    );
  }

  getResearch(researchId) {
    const normalizedResearchId = this.normalizeResearchId(researchId);

    if (!this.researchBalanceManager.isResearchEnabled(normalizedResearchId)) {
      return null;
    }

    return this.getResearches().find((research) => research.id === normalizedResearchId) ?? null;
  }

  getRequiredResearchIds(researchId) {
    return this.getResearch(researchId)?.requiredResearchIds ?? [];
  }

  normalizeResearchId(researchId) {
    return this.researchBalanceManager.normalizeResearchId(researchId);
  }

  isVisibleResearch(research, completedIds) {
    if (!this.researchBalanceManager.isResearchEnabled(research.id)) {
      return false;
    }

    if (!research.seriesId) {
      return true;
    }

    if (completedIds.has(research.id)) {
      return false;
    }

    return research.requiredResearchIds.every((requiredResearchId) =>
      completedIds.has(requiredResearchId),
    );
  }
}
