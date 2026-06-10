import { automationResearchIds } from '../../automation/automationResearchIds.js';

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
  constructor({ itemsFacade, researchBalanceManager }) {
    this.itemsFacade = itemsFacade;
    this.researchBalanceManager = researchBalanceManager;
  }

  getResearchTabs() {
    return [
      {
        id: 'regular',
        label: 'regular research',
        boxes: this.getRegularResearchBoxes(),
      },
      {
        id: 'advanced',
        label: 'advanced research',
        boxes: this.getAutomationResearchBoxes(),
      },
    ];
  }

  getRegularResearchBoxes() {
    return [
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
      {
        id: 'recipeUnlocks',
        label: 'recipe unlocks research',
        researches: this.getRecipeUnlockResearches(),
      },
    ];
  }

  getResearchBoxes() {
    return this.getResearchTabs().flatMap((tab) => tab.boxes);
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

  getAutomationResearchBoxes() {
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
          count: maxAutomationGardenTiles,
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
          count: maxAutomationGardenTiles,
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
          count: maxAutomationCauldrons,
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
          count: maxAutomationCauldrons,
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
          count: maxAutomationCauldrons,
          getId: automationResearchIds.autoCollectCauldron,
          label: (cauldronNumber) => `auto collect cauldron ${cauldronNumber}`,
          description: (cauldronNumber) =>
            `cauldron ${cauldronNumber} moves bottled potions into inventory without a tap.`,
        }),
      },
    ];
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

  getResearches() {
    return this.getResearchBoxes().flatMap((box) => box.researches);
  }

  hasResearch(researchId) {
    const normalizedResearchId = this.normalizeResearchId(researchId);
    return (
      this.researchBalanceManager.isResearchEnabled(normalizedResearchId) &&
      this.getResearches().some((research) => research.id === normalizedResearchId)
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
