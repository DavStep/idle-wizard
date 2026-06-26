export class BrewingRecipeMatchManager {
  constructor({ itemsFacade, researchFacade }) {
    this.itemsFacade = itemsFacade;
    this.researchFacade = researchFacade;
    this.potionDiscoveryFacade = null;
  }

  setPotionDiscoveryFacade(potionDiscoveryFacade) {
    this.potionDiscoveryFacade = potionDiscoveryFacade;
  }

  getMatch(ingredientItemTypeIds) {
    return this.itemsFacade.getPotionRecipeByIngredientSequence(ingredientItemTypeIds);
  }

  getRecipes() {
    return this.itemsFacade.getPotionRecipes().map((recipe) => {
      const discovery = this.getRecipeDiscovery(recipe);
      const discovered = Boolean(discovery) || this.isRecipeDiscovered(recipe);

      return {
        ...recipe,
        unlocked: this.isRecipeUnlocked(recipe),
        discovered,
        discoveredByUsername: discovery?.username ?? null,
        discoveredByIdentity: discovery?.discoveredByIdentity ?? null,
        discoveredAtMs: discovery?.discoveredAtMs ?? null,
      };
    });
  }

  getRecipeByKey(recipeKey) {
    if (typeof recipeKey !== 'string' || recipeKey.length === 0) {
      return null;
    }

    try {
      return this.itemsFacade.getPotionRecipe(recipeKey);
    } catch {
      return null;
    }
  }

  isRecipeUnlocked(recipe) {
    if (this.isUnknownRecipe(recipe)) {
      return this.isRecipeDiscovered(recipe);
    }

    return this.researchFacade.hasCompletedResearch(this.getRecipeResearchId(recipe));
  }

  isRecipeDiscoverable(recipe) {
    return this.isUnknownRecipe(recipe) && !this.isRecipeDiscovered(recipe);
  }

  isUnknownRecipe(recipe) {
    return recipe?.discoveryType === 'unknown' || recipe?.unknown === true;
  }

  isRecipeDiscovered(recipe) {
    return this.potionDiscoveryFacade?.hasDiscoveredPotion(recipe.key) ?? false;
  }

  getRecipeDiscovery(recipe) {
    return this.potionDiscoveryFacade?.getDiscovery(recipe.key) ?? null;
  }

  getRecipeResearchId(recipe) {
    return `unlockRecipe:${recipe.key}`;
  }
}
