import { automationResearchIds } from '../automationResearchIds.js';

export class BrewingAutomationManager {
  constructor({ brewingFacade, onBrewStarted, onPotionRecipeDiscovery, researchFacade } = {}) {
    this.brewingFacade = brewingFacade;
    this.onBrewStarted = onBrewStarted;
    this.onPotionRecipeDiscovery = onPotionRecipeDiscovery;
    this.researchFacade = researchFacade;
  }

  update() {
    if (!this.hasAnyBrewingAutomation()) {
      return;
    }

    const cauldrons = this.getCauldrons();

    for (const cauldron of cauldrons) {
      this.autoBottleBrewedPotion(cauldron);
    }

    for (const cauldron of cauldrons) {
      this.autoBrewCauldron(cauldron);
    }
  }

  autoBottleBrewedPotion(cauldron) {
    if (!this.hasCauldronAutomation(cauldron)) {
      return;
    }

    if (!cauldron?.canStartBottling) {
      return;
    }

    this.brewingFacade.startBottling(this.getCauldronIndex(cauldron));
  }

  autoBrewCauldron(cauldron) {
    if (!this.hasCauldronAutomation(cauldron)) {
      return;
    }

    if (!cauldron?.autoBrewEnabled || !cauldron.autoBrewRecipeKey) {
      return;
    }

    const result = this.brewingFacade.autoBrew(this.getCauldronIndex(cauldron));

    if (result.ok) {
      this.onBrewStarted?.(result);
    }

    if (result.ok && result.discovery?.potionKey) {
      this.onPotionRecipeDiscovery?.(result.discovery.potionKey);
    }
  }

  hasResearch(researchId) {
    return this.researchFacade?.hasCompletedResearch(researchId) === true;
  }

  hasAnyBrewingAutomationResearch() {
    return (
      this.researchFacade?.hasCompletedResearchMatching?.((researchId) =>
        this.isBrewingAutomationResearchId(researchId),
      ) === true
    );
  }

  hasAnyBrewingAutomation() {
    return (
      this.hasAnyBrewingAutomationResearch() ||
      this.getCauldrons().some(
        (cauldron) => cauldron.entitlementExtra === true,
      )
    );
  }

  hasCauldronAutomation(cauldron) {
    return (
      cauldron?.entitlementExtra === true ||
      this.hasResearch(
        automationResearchIds.autoBrewCauldron(cauldron?.cauldronNumber),
      )
    );
  }

  isBrewingAutomationResearchId(researchId) {
    return (
      typeof researchId === 'string' &&
      researchId.startsWith('automation:autoBrewCauldron:')
    );
  }

  getCauldrons() {
    const snapshot = this.brewingFacade.getSnapshot();
    const cauldrons = snapshot.cauldrons ?? [];

    if (cauldrons.length > 0) {
      return cauldrons;
    }

    return [snapshot];
  }

  getCauldronIndex(cauldron) {
    if (Number.isInteger(cauldron?.cauldronIndex)) {
      return cauldron.cauldronIndex;
    }
    const cauldronNumber = Math.floor(Number(cauldron?.cauldronNumber));
    return Number.isInteger(cauldronNumber) && cauldronNumber > 0
      ? cauldronNumber - 1
      : 0;
  }
}
