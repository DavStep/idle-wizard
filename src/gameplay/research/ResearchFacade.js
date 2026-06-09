import { ResearchDefinitionManager } from './managers/ResearchDefinitionManager.js';

export class ResearchFacade {
  static explain =
    'Research lists studies the wizard can learn later: upgrades, seed drops, summon counts, and potion recipes.';

  constructor({ itemsFacade }) {
    this.researchDefinitionManager = new ResearchDefinitionManager({ itemsFacade });
  }

  initialize() {}

  getSnapshot() {
    return {
      boxes: this.researchDefinitionManager.getResearchBoxes(),
    };
  }
}
