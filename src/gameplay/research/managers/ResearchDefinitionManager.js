const manaSphereResearches = [
  {
    id: 'manaProductionRate',
    label: 'mana production rate',
    value: 'increase',
  },
  {
    id: 'manaSphereCap',
    label: 'mana sphere cap',
    value: 'increase',
  },
];

const summonSeedResearches = [
  {
    id: 'summonSeedsX2',
    label: 'x2 summon',
    value: '20 mana',
  },
  {
    id: 'summonSeedsX3',
    label: 'x3 summon',
    value: '30 mana',
  },
  {
    id: 'summonSeedsX4',
    label: 'x4 summon',
    value: '40 mana',
  },
  {
    id: 'summonSeedsX5',
    label: 'x5 summon',
    value: '50 mana',
  },
];

export class ResearchDefinitionManager {
  constructor({ itemsFacade }) {
    this.itemsFacade = itemsFacade;
  }

  getResearchBoxes() {
    return [
      {
        id: 'manaSphere',
        label: 'mana sphere researches',
        researches: manaSphereResearches,
      },
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

  getSeedUnlockResearches() {
    return this.itemsFacade.getSeedDefinitions().map((seed) => ({
      id: `unlockSeed:${seed.key}`,
      label: seed.label,
      value: 'drop',
    }));
  }

  getRecipeUnlockResearches() {
    return this.itemsFacade.getPotionDefinitions().map((potion) => ({
      id: `unlockRecipe:${potion.key}`,
      label: potion.label,
      value: 'brew',
    }));
  }
}
