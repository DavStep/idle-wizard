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
    return this.itemsFacade.getPotionRecipes().map((recipe) => ({
      ...recipe,
      unlocked: this.isRecipeUnlocked(recipe),
      discovered: this.isRecipeDiscovered(recipe),
    }));
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
