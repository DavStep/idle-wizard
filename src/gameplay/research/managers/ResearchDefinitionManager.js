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

const automationResearches = [
  {
    id: automationResearchIds.autoPlantTile,
    label: 'auto plant',
    value: 'tile',
    showEffect: true,
    description: 'empty garden tiles plant their selected seed when one is available.',
  },
  {
    id: automationResearchIds.autoHarvestPlant,
    label: 'auto harvest',
    value: 'plant',
    showEffect: true,
    description: 'ready garden plants start harvesting without a tap.',
  },
  {
    id: automationResearchIds.autoBrewCauldron,
    label: 'auto brew',
    value: 'cauldron',
    showEffect: true,
    description: 'the cauldron starts brewing when staged ingredients and mana are ready.',
  },
  {
    id: automationResearchIds.autoBottleCauldron,
    label: 'auto bottle',
    value: 'cauldron',
    showEffect: true,
    description: 'finished brews start bottling without a tap.',
  },
  {
    id: automationResearchIds.autoCollectCauldron,
    label: 'auto collect',
    value: 'cauldron',
    showEffect: true,
    description: 'bottled potions move into inventory without a tap.',
  },
];

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
        boxes: [
          {
            id: 'automation',
            label: 'automation research',
            researches: automationResearches,
          },
        ],
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
