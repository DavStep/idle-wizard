export class BrewingRecipeMatchManager {
  constructor({ itemsFacade, researchFacade }) {
    this.itemsFacade = itemsFacade;
    this.researchFacade = researchFacade;
  }

  getMatch(ingredientItemTypeIds) {
    return this.itemsFacade.getPotionRecipeByIngredientSequence(ingredientItemTypeIds);
  }

  getRecipes() {
    return this.itemsFacade.getPotionRecipes().map((recipe) => ({
      ...recipe,
      unlocked: this.isRecipeUnlocked(recipe),
    }));
  }

  isRecipeUnlocked(recipe) {
    return this.researchFacade.hasCompletedResearch(this.getRecipeResearchId(recipe));
  }

  getRecipeResearchId(recipe) {
    return `unlockRecipe:${recipe.key}`;
  }
}
