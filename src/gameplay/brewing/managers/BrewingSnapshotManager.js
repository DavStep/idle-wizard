export class BrewingSnapshotManager {
  constructor({
    brewingBalanceManager,
    brewingCauldronEntityManager,
    brewingProcessEntityManager,
    brewingRecipeMatchManager,
    itemsFacade,
    manaFacade,
    playerLevelFacade,
    getAutoBrewEnabled,
    getAutoBrewRecipeKey,
  }) {
    this.brewingBalanceManager = brewingBalanceManager;
    this.brewingCauldronEntityManager = brewingCauldronEntityManager;
    this.brewingProcessEntityManager = brewingProcessEntityManager;
    this.brewingRecipeMatchManager = brewingRecipeMatchManager;
    this.itemsFacade = itemsFacade;
    this.manaFacade = manaFacade;
    this.playerLevelFacade = playerLevelFacade;
    this.getAutoBrewEnabled = getAutoBrewEnabled;
    this.getAutoBrewRecipeKey = getAutoBrewRecipeKey;
  }

  getSnapshot() {
    const herbs = this.getHerbSnapshots();
    const recipes = this.brewingRecipeMatchManager.getRecipes();
    const maxCauldrons = this.getMaxCauldrons();
    const unlockedCauldrons = this.getUnlockedCauldrons();
    this.brewingCauldronEntityManager.ensureCauldrons(unlockedCauldrons);
    const cauldrons = Array.from({ length: unlockedCauldrons }, (_unused, index) =>
      this.getCauldronSnapshot(index, herbs),
    );
    const nextCauldronNumber = unlockedCauldrons + 1;
    const nextCauldronCost = this.brewingBalanceManager.getCauldronCost(nextCauldronNumber);
    const nextCauldronLockedByLevel =
      nextCauldronCost !== null && nextCauldronNumber > maxCauldrons;
    const primaryCauldron = cauldrons[0] ?? this.getCauldronSnapshot(0, herbs);
    const legacyPrimaryCauldron = {
      ...primaryCauldron,
      ingredients: primaryCauldron.ingredients.map((ingredient) => ({
        slotIndex: ingredient.slotIndex,
        itemTypeId: ingredient.itemTypeId,
        key: ingredient.key,
        label: ingredient.label,
        kind: ingredient.kind,
      })),
    };

    return {
      ...legacyPrimaryCauldron,
      herbs,
      recipes,
      cauldrons,
      unlockedCauldrons,
      maxCauldrons,
      configuredMaxCauldrons: this.brewingBalanceManager.getMaxCauldrons(),
      cauldronCosts: this.brewingBalanceManager.getCauldronCosts(),
      nextCauldronNumber: nextCauldronCost === null ? null : nextCauldronNumber,
      nextCauldronCost,
      nextCauldronLockedByLevel,
      nextCauldronRequiresLevel: nextCauldronLockedByLevel
        ? this.playerLevelFacade?.getRequiredLevelForCauldron?.(nextCauldronNumber) ?? null
        : null,
      autoBrewEnabled: this.getAutoBrewEnabled?.(0) === true,
      autoBrewRecipeKey: this.getAutoBrewRecipeKey?.(0) ?? null,
    };
  }

  getCauldronSnapshot(cauldronIndex = 0, herbs = this.getHerbSnapshots()) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);
    const ingredients =
      this.brewingCauldronEntityManager.getIngredientSnapshots(safeCauldronIndex);
    const ingredientItemTypeIds = ingredients.map((ingredient) => ingredient.itemTypeId);
    const recipe = this.brewingRecipeMatchManager.getMatch(ingredientItemTypeIds);
    const recipeDiscoverable = recipe
      ? this.brewingRecipeMatchManager.isRecipeDiscoverable(recipe)
      : false;
    const visibleRecipe = recipeDiscoverable ? null : recipe;
    const visibleRecipeUnlocked = visibleRecipe
      ? this.brewingRecipeMatchManager.isRecipeUnlocked(visibleRecipe)
      : false;
    const manaCost =
      visibleRecipe?.manaCost ?? this.brewingBalanceManager.getWastedBrewManaCost();
    const activeBrew =
      this.brewingProcessEntityManager.getActiveBrewSnapshot(safeCauldronIndex);
    const hasEnoughIngredients = this.hasEnoughIngredients(ingredientItemTypeIds);
    const hasEnoughMana = this.manaFacade.canSpend(manaCost);

    return {
      cauldronIndex: safeCauldronIndex,
      cauldronNumber: safeCauldronIndex + 1,
      ingredients,
      match: visibleRecipe
        ? {
            potionTypeId: visibleRecipe.potionTypeId,
            key: visibleRecipe.key,
            label: visibleRecipe.label,
            realLabel: visibleRecipe.label,
            manaCost: visibleRecipe.manaCost,
            brewDurationMs: visibleRecipe.brewDurationMs,
            unlocked: visibleRecipeUnlocked,
            discoverable: false,
            unknown: visibleRecipe.unknown === true,
            discoveryType: visibleRecipe.discoveryType ?? null,
          }
        : null,
      buttonLabel: visibleRecipe && visibleRecipeUnlocked ? `brew ${visibleRecipe.label}` : 'brew',
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
      autoBrewEnabled: this.getAutoBrewEnabled?.(safeCauldronIndex) === true,
      autoBrewRecipeKey: this.getAutoBrewRecipeKey?.(safeCauldronIndex) ?? null,
      herbs,
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

  getMaxCauldrons() {
    const maxCauldrons = this.playerLevelFacade?.getMaxCauldrons?.();
    const safeMaxCauldrons = Math.floor(Number(maxCauldrons));
    const maxCauldronsByLevel =
      Number.isInteger(safeMaxCauldrons) && safeMaxCauldrons > 0
        ? safeMaxCauldrons
        : 1;
    return Math.min(this.brewingBalanceManager.getMaxCauldrons(), maxCauldronsByLevel);
  }

  getUnlockedCauldrons() {
    return Math.min(
      this.brewingCauldronEntityManager.getUnlockedCauldrons(),
      this.getMaxCauldrons(),
    );
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

  normalizeCauldronIndex(cauldronIndex) {
    const safeCauldronIndex = Math.floor(Number(cauldronIndex));
    return Number.isInteger(safeCauldronIndex) && safeCauldronIndex >= 0
      ? safeCauldronIndex
      : 0;
  }
}
