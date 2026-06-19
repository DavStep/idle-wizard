import { automationResearchIds } from '../automationResearchIds.js';

export class BrewingAutomationManager {
  constructor({ brewingFacade, onPotionRecipeDiscovery, researchFacade } = {}) {
    this.brewingFacade = brewingFacade;
    this.onPotionRecipeDiscovery = onPotionRecipeDiscovery;
    this.researchFacade = researchFacade;
  }

  update() {
    if (!this.hasAnyBrewingAutomationResearch()) {
      return;
    }

    const cauldronNumbers = this.getCauldronNumbers();

    for (const cauldronNumber of cauldronNumbers) {
      this.autoBottleBrewedPotion(cauldronNumber);
    }

    for (const cauldronNumber of cauldronNumbers) {
      this.autoBrewCauldron(cauldronNumber);
    }
  }

  autoBottleBrewedPotion(cauldronNumber) {
    if (!this.hasResearch(automationResearchIds.autoBottleCauldron(cauldronNumber))) {
      return;
    }

    if (!this.getCauldronSnapshot(cauldronNumber)?.canStartBottling) {
      return;
    }

    this.brewingFacade.startBottling(cauldronNumber - 1);
  }

  autoBrewCauldron(cauldronNumber) {
    if (!this.hasResearch(automationResearchIds.autoBrewCauldron(cauldronNumber))) {
      return;
    }

    const cauldron = this.getCauldronSnapshot(cauldronNumber);

    if (!cauldron?.autoBrewEnabled || !cauldron.autoBrewRecipeKey) {
      return;
    }

    const result = this.brewingFacade.autoBrew(cauldronNumber - 1);

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

  isBrewingAutomationResearchId(researchId) {
    return (
      typeof researchId === 'string' &&
      (researchId.startsWith('automation:autoBrewCauldron:') ||
        researchId.startsWith('automation:autoBottleCauldron:'))
    );
  }

  getCauldronSnapshot(cauldronNumber) {
    const snapshot = this.brewingFacade.getSnapshot();
    return (
      (snapshot.cauldrons ?? []).find(
        (cauldron) => cauldron.cauldronNumber === cauldronNumber,
      ) ?? (cauldronNumber === 1 ? snapshot : null)
    );
  }

  getCauldronNumbers() {
    const snapshot = this.brewingFacade.getSnapshot();
    const cauldrons = snapshot.cauldrons ?? [];

    if (cauldrons.length > 0) {
      return cauldrons.map((cauldron) => cauldron.cauldronNumber ?? 1);
    }

    return [snapshot.cauldronNumber ?? 1];
  }
}
