import { automationResearchIds } from '../automationResearchIds.js';

export class BrewingAutomationManager {
  constructor({ brewingFacade, onPotionRecipeDiscovery, researchFacade } = {}) {
    this.brewingFacade = brewingFacade;
    this.onPotionRecipeDiscovery = onPotionRecipeDiscovery;
    this.researchFacade = researchFacade;
  }

  update() {
    const cauldronNumber = this.getCauldronNumber();
    this.autoCollectReadyPotion(cauldronNumber);
    this.autoBottleBrewedPotion(cauldronNumber);
    this.autoBrewCauldron(cauldronNumber);
  }

  autoCollectReadyPotion(cauldronNumber) {
    if (!this.hasResearch(automationResearchIds.autoCollectCauldron(cauldronNumber))) {
      return;
    }

    if (!this.brewingFacade.getSnapshot().canCollectPotion) {
      return;
    }

    this.brewingFacade.collect();
  }

  autoBottleBrewedPotion(cauldronNumber) {
    if (!this.hasResearch(automationResearchIds.autoBottleCauldron(cauldronNumber))) {
      return;
    }

    if (!this.brewingFacade.getSnapshot().canStartBottling) {
      return;
    }

    this.brewingFacade.startBottling();
  }

  autoBrewCauldron(cauldronNumber) {
    if (!this.hasResearch(automationResearchIds.autoBrewCauldron(cauldronNumber))) {
      return;
    }

    if (!this.brewingFacade.getSnapshot().canBrew) {
      return;
    }

    const result = this.brewingFacade.brew();

    if (result.ok && result.discovery?.potionKey) {
      this.onPotionRecipeDiscovery?.(result.discovery.potionKey);
    }
  }

  hasResearch(researchId) {
    return this.researchFacade?.hasCompletedResearch(researchId) === true;
  }

  getCauldronNumber() {
    return this.brewingFacade.getSnapshot().cauldronNumber ?? 1;
  }
}
