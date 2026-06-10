import { itemKinds } from '../../items/itemKinds.js';

export class ShopSellItemVisibilityManager {
  constructor({ researchFacade } = {}) {
    this.researchFacade = researchFacade;
    this.potionDiscoveryFacade = null;
  }

  setPotionDiscoveryFacade(potionDiscoveryFacade) {
    this.potionDiscoveryFacade = potionDiscoveryFacade;
  }

  getVisibleSellItems(items) {
    return items;
  }

  isVisible(item) {
    return item.quantity > 0 || this.isResearched(item);
  }

  isResearched(item) {
    if (item.discoveryType === 'unknown' || item.unknown === true) {
      return this.potionDiscoveryFacade?.hasDiscoveredPotion(item.key) ?? false;
    }

    const researchId = this.getResearchId(item);

    if (!researchId) {
      return false;
    }

    return this.researchFacade?.hasCompletedResearch(researchId) ?? false;
  }

  getResearchId(item) {
    if (item.hasRecipe === false) {
      return null;
    }

    if (item.kind === itemKinds.seed) {
      return `unlockSeed:${item.key}`;
    }

    if (item.kind === itemKinds.herb) {
      const seedKey = item.key?.endsWith('Herb') ? `${item.key.slice(0, -4)}Seed` : item.key;
      return `unlockSeed:${seedKey}`;
    }

    if (item.kind === itemKinds.potion) {
      return `unlockRecipe:${item.key}`;
    }

    return null;
  }
}
