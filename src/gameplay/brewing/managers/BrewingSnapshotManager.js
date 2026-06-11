export class BrewingSnapshotManager {
  constructor({
    brewingBalanceManager,
    brewingCauldronEntityManager,
    brewingProcessEntityManager,
    brewingRecipeMatchManager,
    itemsFacade,
    manaFacade,
    getAutoBrewEnabled,
    getAutoBrewRecipeKey,
  }) {
    this.brewingBalanceManager = brewingBalanceManager;
    this.brewingCauldronEntityManager = brewingCauldronEntityManager;
    this.brewingProcessEntityManager = brewingProcessEntityManager;
    this.brewingRecipeMatchManager = brewingRecipeMatchManager;
    this.itemsFacade = itemsFacade;
    this.manaFacade = manaFacade;
    this.getAutoBrewEnabled = getAutoBrewEnabled;
    this.getAutoBrewRecipeKey = getAutoBrewRecipeKey;
  }

  getSnapshot() {
    const ingredients = this.brewingCauldronEntityManager.getIngredientSnapshots();
    const ingredientItemTypeIds = ingredients.map((ingredient) => ingredient.itemTypeId);
    const recipe = this.brewingRecipeMatchManager.getMatch(ingredientItemTypeIds);
    const recipeUnlocked = recipe
      ? this.brewingRecipeMatchManager.isRecipeUnlocked(recipe)
      : false;
    const recipeDiscoverable = recipe
      ? this.brewingRecipeMatchManager.isRecipeDiscoverable(recipe)
      : false;
    const manaCost = recipe?.manaCost ?? this.brewingBalanceManager.getWastedBrewManaCost();
    const activeBrew = this.brewingProcessEntityManager.getActiveBrewSnapshot();
    const hasEnoughIngredients = this.hasEnoughIngredients(ingredientItemTypeIds);
    const hasEnoughMana = this.manaFacade.canSpend(manaCost);

    return {
      herbs: this.getHerbSnapshots(),
      recipes: this.brewingRecipeMatchManager.getRecipes(),
      ingredients,
      match: recipe
        ? {
            potionTypeId: recipe.potionTypeId,
            key: recipe.key,
            label: recipeDiscoverable ? 'unknown recipe' : recipe.label,
            realLabel: recipe.label,
            manaCost: recipe.manaCost,
            brewDurationMs: recipe.brewDurationMs,
            unlocked: recipeUnlocked,
            discoverable: recipeDiscoverable,
            unknown: recipe.unknown === true,
            discoveryType: recipe.discoveryType ?? null,
          }
        : null,
      buttonLabel: recipe && recipeUnlocked ? `brew ${recipe.label}` : 'brew',
      manaCost,
      canAddIngredient:
        !activeBrew &&
        ingredients.length < this.brewingBalanceManager.getMaxCauldronIngredients(),
      canBrew:
        !activeBrew &&
        ingredients.length > 0 &&
        hasEnoughIngredients &&
        hasEnoughMana,
      hasEnoughIngredients,
      hasEnoughMana,
      activeBrew,
      canStartBottling: Boolean(activeBrew?.canStartBottling),
      canCollectPotion: Boolean(activeBrew?.canCollect),
      maxIngredients: this.brewingBalanceManager.getMaxCauldronIngredients(),
      autoBrewEnabled: this.getAutoBrewEnabled?.() === true,
      autoBrewRecipeKey: this.getAutoBrewRecipeKey?.() ?? null,
    };
  }

  getHerbSnapshots() {
    return this.itemsFacade.getHerbDefinitions().map((herb) => {
      const quantity = this.itemsFacade.getItemQuantity(herb.id);
      const stagedQuantity =
        this.brewingCauldronEntityManager.getIngredientCountByItemTypeId(herb.id);

      return {
        itemTypeId: herb.id,
        key: herb.key,
        label: herb.label,
        kind: herb.kind,
        quantity,
        stagedQuantity,
        availableQuantity: Math.max(0, quantity - stagedQuantity),
      };
    });
  }

  hasEnoughIngredients(itemTypeIds) {
    const counts = new Map();

    for (const itemTypeId of itemTypeIds) {
      counts.set(itemTypeId, (counts.get(itemTypeId) ?? 0) + 1);
    }

    for (const [itemTypeId, quantity] of counts) {
      if (this.itemsFacade.getItemQuantity(itemTypeId) < quantity) {
        return false;
      }
    }

    return true;
  }
}
