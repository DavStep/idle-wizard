export class BrewingSnapshotManager {
  constructor({
    brewingBalanceManager,
    brewingCauldronEntityManager,
    brewingProcessEntityManager,
    brewingRecipeMatchManager,
    itemsFacade,
    manaFacade,
    playerLevelFacade,
    researchFacade,
    getAutoBrewEnabled,
    getAutoBrewRecipeKey,
    getBrewQuantity,
  }) {
    this.brewingBalanceManager = brewingBalanceManager;
    this.brewingCauldronEntityManager = brewingCauldronEntityManager;
    this.brewingProcessEntityManager = brewingProcessEntityManager;
    this.brewingRecipeMatchManager = brewingRecipeMatchManager;
    this.itemsFacade = itemsFacade;
    this.manaFacade = manaFacade;
    this.playerLevelFacade = playerLevelFacade;
    this.researchFacade = researchFacade;
    this.getAutoBrewEnabled = getAutoBrewEnabled;
    this.getAutoBrewRecipeKey = getAutoBrewRecipeKey;
    this.getBrewQuantityCallback = getBrewQuantity;
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
    const nextCauldronRequiresResearchId =
      this.getRequiredCapacityResearchId(nextCauldronNumber);
    const nextCauldronLockedByLevel =
      nextCauldronCost !== null &&
      nextCauldronNumber > maxCauldrons &&
      !nextCauldronRequiresResearchId;
    const nextCauldronLockedByResearch =
      nextCauldronCost !== null &&
      nextCauldronNumber > maxCauldrons &&
      Boolean(nextCauldronRequiresResearchId);
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
      cauldronLevels: this.getCauldronLevels(this.brewingBalanceManager.getMaxCauldrons()),
      unlockedCauldrons,
      maxCauldrons,
      configuredMaxCauldrons: this.brewingBalanceManager.getMaxCauldrons(),
      cauldronCosts: this.brewingBalanceManager.getCauldronCosts(),
      nextCauldronNumber: nextCauldronCost === null ? null : nextCauldronNumber,
      nextCauldronCost,
      nextCauldronLockedByLevel,
      nextCauldronLockedByResearch,
      nextCauldronRequiresLevel: nextCauldronLockedByLevel
        ? this.playerLevelFacade?.getRequiredLevelForCauldron?.(nextCauldronNumber) ?? null
        : null,
      nextCauldronRequiresResearchId: nextCauldronLockedByResearch
        ? nextCauldronRequiresResearchId
        : null,
      autoBrewEnabled: this.getAutoBrewEnabled?.(0) === true,
      autoBrewRecipeKey: this.getAutoBrewRecipeKey?.(0) ?? null,
    };
  }

  getCauldronSnapshot(cauldronIndex = 0, herbs = this.getHerbSnapshots()) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);
    const activeBrew =
      this.brewingProcessEntityManager.getActiveBrewSnapshot(safeCauldronIndex);

    if (activeBrew) {
      const maxBrewQuantity = this.getMaxBrewQuantity(safeCauldronIndex);

      return {
        cauldronIndex: safeCauldronIndex,
        cauldronNumber: safeCauldronIndex + 1,
        level: maxBrewQuantity,
        ingredients: [],
        match: null,
        buttonLabel: 'brew',
        manaCost: this.brewingBalanceManager.getWastedBrewManaCost(),
        yieldMultiplier: this.getActiveBrewYieldMultiplier(activeBrew),
        brewQuantity: this.getBrewQuantity(safeCauldronIndex),
        maxBrewQuantity,
        canAddIngredient: false,
        canBrew: false,
        hasEnoughIngredients: false,
        hasEnoughMana: false,
        activeBrew,
        canStartBottling: Boolean(activeBrew.canStartBottling),
        canCollectPotion: Boolean(activeBrew.canCollect),
        maxIngredients: this.brewingBalanceManager.getMaxCauldronIngredients(),
        autoBrewEnabled: this.getAutoBrewEnabled?.(safeCauldronIndex) === true,
        autoBrewRecipeKey: this.getAutoBrewRecipeKey?.(safeCauldronIndex) ?? null,
        herbs,
      };
    }

    const ingredients =
      this.brewingCauldronEntityManager.getIngredientSnapshots(safeCauldronIndex);

    if (ingredients.length === 0) {
      const maxBrewQuantity = this.getMaxBrewQuantity(safeCauldronIndex);

      return {
        cauldronIndex: safeCauldronIndex,
        cauldronNumber: safeCauldronIndex + 1,
        level: maxBrewQuantity,
        ingredients,
        match: null,
        buttonLabel: 'brew',
        manaCost: this.brewingBalanceManager.getWastedBrewManaCost(),
        yieldMultiplier: 1,
        brewQuantity: this.getBrewQuantity(safeCauldronIndex),
        maxBrewQuantity,
        canAddIngredient:
          ingredients.length < this.brewingBalanceManager.getMaxCauldronIngredients(),
        canBrew: false,
        hasEnoughIngredients: true,
        hasEnoughMana: true,
        activeBrew: null,
        canStartBottling: false,
        canCollectPotion: false,
        maxIngredients: this.brewingBalanceManager.getMaxCauldronIngredients(),
        autoBrewEnabled: this.getAutoBrewEnabled?.(safeCauldronIndex) === true,
        autoBrewRecipeKey: this.getAutoBrewRecipeKey?.(safeCauldronIndex) ?? null,
        herbs,
      };
    }

    const ingredientItemTypeIds = ingredients.map((ingredient) => ingredient.itemTypeId);
    const recipe = this.brewingRecipeMatchManager.getMatch(ingredientItemTypeIds);
    const recipeDiscoverable = recipe
      ? this.brewingRecipeMatchManager.isRecipeDiscoverable(recipe)
      : false;
    const visibleRecipe = recipeDiscoverable ? null : recipe;
    const visibleRecipeUnlocked = visibleRecipe
      ? this.brewingRecipeMatchManager.isRecipeUnlocked(visibleRecipe)
      : false;
    const maxBrewQuantity = this.getMaxBrewQuantity(safeCauldronIndex);
    const yieldMultiplier = this.getBrewQuantity(safeCauldronIndex);
    const baseManaCost =
      visibleRecipe?.manaCost ?? this.brewingBalanceManager.getWastedBrewManaCost();
    const manaCost = baseManaCost * yieldMultiplier;
    const hasEnoughIngredients = this.hasEnoughIngredients(
      this.repeatItemTypeIds(ingredientItemTypeIds, yieldMultiplier),
    );
    const hasEnoughMana = this.manaFacade.canSpend(manaCost);

    return {
      cauldronIndex: safeCauldronIndex,
      cauldronNumber: safeCauldronIndex + 1,
      level: maxBrewQuantity,
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
      yieldMultiplier,
      brewQuantity: yieldMultiplier,
      maxBrewQuantity,
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
    const stagedQuantityByItemTypeId =
      this.brewingCauldronEntityManager.getIngredientCountsByItemTypeId?.(null) ??
      null;

    return this.itemsFacade.getHerbDefinitions().map((herb) => {
      const quantity = this.itemsFacade.getItemQuantity(herb.id);
      const stagedQuantity =
        stagedQuantityByItemTypeId?.get(herb.id) ??
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
    return Math.min(
      this.brewingBalanceManager.getMaxCauldrons(),
      this.researchFacade?.getMaxCauldronsWithCapacity?.(maxCauldronsByLevel) ??
        maxCauldronsByLevel,
    );
  }

  getRequiredCapacityResearchId(cauldronNumber) {
    return (
      this.researchFacade?.getRequiredCauldronCapacityResearchId?.(cauldronNumber) ??
      null
    );
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

  getYieldMultiplier(cauldronIndex = 0) {
    const multiplier =
      this.researchFacade?.getCauldronBrewingMultiplier?.(cauldronIndex + 1) ?? 1;
    const safeMultiplier = Math.floor(Number(multiplier));
    return Number.isInteger(safeMultiplier) && safeMultiplier > 0 ? safeMultiplier : 1;
  }

  getCurrentCauldronLevel(cauldronIndex = 0) {
    return this.getMaxBrewQuantity(cauldronIndex);
  }

  getMaxBrewQuantity(cauldronIndex = 0) {
    return this.getYieldMultiplier(cauldronIndex);
  }

  getBrewQuantity(cauldronIndex = 0) {
    const maxBrewQuantity = this.getMaxBrewQuantity(cauldronIndex);
    const quantity = this.getBrewQuantityCallback?.(cauldronIndex) ?? maxBrewQuantity;
    const safeQuantity = Math.floor(Number(quantity));

    if (!Number.isInteger(safeQuantity) || safeQuantity <= 0) {
      return maxBrewQuantity;
    }

    return Math.min(safeQuantity, maxBrewQuantity);
  }

  getCauldronLevels(maxCauldrons = 0) {
    const safeMaxCauldrons = Math.max(0, Math.floor(Number(maxCauldrons) || 0));
    return Object.fromEntries(
      Array.from({ length: safeMaxCauldrons }, (_unused, index) => [
        index + 1,
        this.getCurrentCauldronLevel(index),
      ]),
    );
  }

  repeatItemTypeIds(itemTypeIds = [], multiplier = 1) {
    const safeMultiplier = Math.max(1, Math.floor(Number(multiplier) || 1));
    return Array.from({ length: safeMultiplier }, () => itemTypeIds).flat();
  }

  getActiveBrewYieldMultiplier(activeBrew = {}) {
    const resultQuantity = Math.floor(Number(activeBrew.resultQuantity));
    return Number.isInteger(resultQuantity) && resultQuantity > 0 ? resultQuantity : 1;
  }

  normalizeCauldronIndex(cauldronIndex) {
    const safeCauldronIndex = Math.floor(Number(cauldronIndex));
    return Number.isInteger(safeCauldronIndex) && safeCauldronIndex >= 0
      ? safeCauldronIndex
      : 0;
  }
}
