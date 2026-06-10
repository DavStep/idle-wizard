import { automationResearchIds } from '../automationResearchIds.js';

export class BrewingAutomationManager {
  constructor({ brewingFacade, onPotionRecipeDiscovery, researchFacade } = {}) {
    this.brewingFacade = brewingFacade;
    this.onPotionRecipeDiscovery = onPotionRecipeDiscovery;
    this.researchFacade = researchFacade;
  }

  update() {
    this.autoCollectReadyPotion();
    this.autoBottleBrewedPotion();
    this.autoBrewCauldron();
  }

  autoCollectReadyPotion() {
    if (!this.hasResearch(automationResearchIds.autoCollectCauldron)) {
      return;
    }

    if (!this.brewingFacade.getSnapshot().canCollectPotion) {
      return;
    }

    this.brewingFacade.collect();
  }

  autoBottleBrewedPotion() {
    if (!this.hasResearch(automationResearchIds.autoBottleCauldron)) {
      return;
    }

    if (!this.brewingFacade.getSnapshot().canStartBottling) {
      return;
    }

    this.brewingFacade.startBottling();
  }

  autoBrewCauldron() {
    if (!this.hasResearch(automationResearchIds.autoBrewCauldron)) {
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
}
