import { itemKinds } from '../../items/itemKinds.js';

export class BrewingStartManager {
  constructor({
    brewingBalanceManager,
    brewingCauldronEntityManager,
    brewingProcessEntityManager,
    brewingRecipeMatchManager,
    itemsFacade,
    manaFacade,
    researchFacade,
  }) {
    this.brewingBalanceManager = brewingBalanceManager;
    this.brewingCauldronEntityManager = brewingCauldronEntityManager;
    this.brewingProcessEntityManager = brewingProcessEntityManager;
    this.brewingRecipeMatchManager = brewingRecipeMatchManager;
    this.itemsFacade = itemsFacade;
    this.manaFacade = manaFacade;
    this.researchFacade = researchFacade;
  }

  addIngredient(itemTypeId, cauldronIndex = 0) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);

    if (!this.brewingCauldronEntityManager.isCauldronUnlocked(safeCauldronIndex)) {
      return {
        ok: false,
        reason: 'cauldron_locked',
        cauldronIndex: safeCauldronIndex,
        cauldronNumber: safeCauldronIndex + 1,
      };
    }

    if (this.brewingProcessEntityManager.hasActiveBrew(safeCauldronIndex)) {
      return {
        ok: false,
        reason: 'brew_in_progress',
      };
    }

    const item = this.itemsFacade.getItemDefinition(itemTypeId);

    if (item.kind !== itemKinds.herb) {
      return {
        ok: false,
        reason: 'not_herb',
        itemTypeId,
      };
    }

    if (
      this.brewingCauldronEntityManager.getIngredientCount(safeCauldronIndex) >=
      this.brewingBalanceManager.getMaxCauldronIngredients()
    ) {
      return {
        ok: false,
        reason: 'cauldron_full',
        maxIngredients: this.brewingBalanceManager.getMaxCauldronIngredients(),
      };
    }

    const alreadyStaged =
      this.brewingCauldronEntityManager.getIngredientCountByItemTypeId(itemTypeId);

    if (this.itemsFacade.getItemQuantity(itemTypeId) <= alreadyStaged) {
      return {
        ok: false,
        reason: 'not_enough_item',
        item,
      };
    }

    this.brewingCauldronEntityManager.addIngredient(itemTypeId, safeCauldronIndex);

    return {
      ok: true,
      item,
      cauldronIndex: safeCauldronIndex,
      cauldronNumber: safeCauldronIndex + 1,
    };
  }

  removeIngredientAt(slotIndex, cauldronIndex = 0) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);

    if (!this.brewingCauldronEntityManager.isCauldronUnlocked(safeCauldronIndex)) {
      return {
        ok: false,
        reason: 'cauldron_locked',
        cauldronIndex: safeCauldronIndex,
        cauldronNumber: safeCauldronIndex + 1,
      };
    }

    if (this.brewingProcessEntityManager.hasActiveBrew(safeCauldronIndex)) {
      return {
        ok: false,
        reason: 'brew_in_progress',
      };
    }

    if (!this.brewingCauldronEntityManager.removeIngredientAt(slotIndex, safeCauldronIndex)) {
      return {
        ok: false,
        reason: 'unknown_ingredient',
        slotIndex,
        cauldronIndex: safeCauldronIndex,
      };
    }

    return {
      ok: true,
      slotIndex,
      cauldronIndex: safeCauldronIndex,
      cauldronNumber: safeCauldronIndex + 1,
    };
  }

  clearCauldron(cauldronIndex = 0) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);

    if (!this.brewingCauldronEntityManager.isCauldronUnlocked(safeCauldronIndex)) {
      return {
        ok: false,
        reason: 'cauldron_locked',
        cauldronIndex: safeCauldronIndex,
        cauldronNumber: safeCauldronIndex + 1,
      };
    }

    if (this.brewingProcessEntityManager.hasActiveBrew(safeCauldronIndex)) {
      return {
        ok: false,
        reason: 'brew_in_progress',
      };
    }

    this.brewingCauldronEntityManager.clearIngredients(safeCauldronIndex);

    return {
      ok: true,
      cauldronIndex: safeCauldronIndex,
      cauldronNumber: safeCauldronIndex + 1,
    };
  }

  brew(cauldronIndex = 0, brewQuantity = null) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);

    if (!this.brewingCauldronEntityManager.isCauldronUnlocked(safeCauldronIndex)) {
      return {
        ok: false,
        reason: 'cauldron_locked',
        cauldronIndex: safeCauldronIndex,
        cauldronNumber: safeCauldronIndex + 1,
      };
    }

    if (this.brewingProcessEntityManager.hasActiveBrew(safeCauldronIndex)) {
      return {
        ok: false,
        reason: 'brew_in_progress',
      };
    }

    const ingredientItemTypeIds =
      this.brewingCauldronEntityManager.getIngredientItemTypeIds(safeCauldronIndex);

    if (ingredientItemTypeIds.length === 0) {
      return {
        ok: false,
        reason: 'cauldron_empty',
      };
    }

    const yieldMultiplier = this.normalizeYieldMultiplier(
      brewQuantity,
      safeCauldronIndex,
    );
    const consumedIngredientItemTypeIds = this.repeatItemTypeIds(
      ingredientItemTypeIds,
      yieldMultiplier,
    );

    if (!this.hasEnoughInventory(consumedIngredientItemTypeIds)) {
      return {
        ok: false,
        reason: 'not_enough_ingredients',
        requiredQuantity: yieldMultiplier,
      };
    }

    const recipe = this.brewingRecipeMatchManager.getMatch(ingredientItemTypeIds);
    const recipeUnlocked = recipe
      ? this.brewingRecipeMatchManager.isRecipeUnlocked(recipe)
      : false;
    const recipeDiscoverable = recipe
      ? this.brewingRecipeMatchManager.isRecipeDiscoverable(recipe)
      : false;

    if (recipe && !recipeUnlocked && !recipeDiscoverable) {
      return {
        ok: false,
        reason: 'research_not_unlocked',
        recipe,
      };
    }

    const baseManaCost =
      recipe && !recipeDiscoverable
        ? recipe.manaCost
        : this.brewingBalanceManager.getWastedBrewManaCost();
    const manaCost = baseManaCost * yieldMultiplier;

    if (!this.manaFacade.spend(manaCost)) {
      return {
        ok: false,
        reason: 'not_enough_mana',
        cost: manaCost,
      };
    }

    this.removeIngredientsFromInventory(consumedIngredientItemTypeIds);

    const resultItem = recipe
      ? this.itemsFacade.getItemDefinition(recipe.potionTypeId)
      : this.itemsFacade.getItemDefinitionByKey(
          this.brewingBalanceManager.getWastedPotionKey(),
        );
    const baseDurationMs =
      recipe?.brewDurationMs ?? this.brewingBalanceManager.getWastedBrewDurationMs();
    const durationMs =
      this.researchFacade?.getReducedCauldronBrewingDurationMs?.(
        safeCauldronIndex + 1,
        baseDurationMs,
      ) ??
      baseDurationMs;

    this.brewingProcessEntityManager.startBrew({
      cauldronIndex: safeCauldronIndex,
      resultItemTypeId: resultItem.id,
      resultQuantity: yieldMultiplier,
      totalSeconds: durationMs / 1_000,
      bottlingTotalSeconds: this.brewingBalanceManager.getBottlingDurationMs() / 1_000,
    });
    this.brewingCauldronEntityManager.clearIngredients(safeCauldronIndex);

    return {
      ok: true,
      cauldronIndex: safeCauldronIndex,
      cauldronNumber: safeCauldronIndex + 1,
      potion: {
        itemTypeId: resultItem.id,
        key: resultItem.key,
        label: resultItem.label,
        kind: resultItem.kind,
      },
      recipe: recipe ?? null,
      wasted: !recipe,
      discovery:
        recipe && recipeDiscoverable
          ? {
              potionKey: recipe.key,
              potionLabel: recipe.label,
            }
          : null,
      manaCost,
      quantity: yieldMultiplier,
      durationMs,
    };
  }

  prepareRecipeForAutoBrew(recipeKey, cauldronIndex = 0, brewQuantity = null) {
    return this.prepareRecipe(recipeKey, {
      clearOnMissing: false,
      cauldronIndex,
      brewQuantity,
    });
  }

  prepareRecipeForSelection(recipeKey, cauldronIndex = 0, brewQuantity = null) {
    return this.prepareRecipe(recipeKey, {
      clearOnMissing: true,
      cauldronIndex,
      brewQuantity,
    });
  }

  prepareRecipe(
    recipeKey,
    { clearOnMissing = false, cauldronIndex = 0, brewQuantity = null } = {},
  ) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);
    const recipe = this.brewingRecipeMatchManager.getRecipeByKey(recipeKey);

    if (!this.brewingCauldronEntityManager.isCauldronUnlocked(safeCauldronIndex)) {
      return {
        ok: false,
        reason: 'cauldron_locked',
        cauldronIndex: safeCauldronIndex,
        cauldronNumber: safeCauldronIndex + 1,
      };
    }

    if (!recipe) {
      return {
        ok: false,
        reason: 'auto_recipe_not_found',
      };
    }

    if (this.brewingProcessEntityManager.hasActiveBrew(safeCauldronIndex)) {
      return {
        ok: false,
        reason: 'brew_in_progress',
      };
    }

    const ingredientItemTypeIds = this.getRecipeIngredientItemTypeIds(recipe);
    const yieldMultiplier = this.normalizeYieldMultiplier(
      brewQuantity,
      safeCauldronIndex,
    );
    const requiredIngredientItemTypeIds = this.repeatItemTypeIds(
      ingredientItemTypeIds,
      yieldMultiplier,
    );
    const maxIngredients = this.brewingBalanceManager.getMaxCauldronIngredients();

    if (ingredientItemTypeIds.length > maxIngredients) {
      return {
        ok: false,
        reason: 'recipe_too_long',
        maxIngredients,
      };
    }

    if (!this.hasEnoughInventoryForCauldron(requiredIngredientItemTypeIds, safeCauldronIndex)) {
      if (clearOnMissing) {
        this.brewingCauldronEntityManager.clearIngredients(safeCauldronIndex);
      }

      return {
        ok: false,
        reason: 'not_enough_ingredients',
        recipe,
        missingIngredients: this.getMissingInventoryForCauldron(
          requiredIngredientItemTypeIds,
          safeCauldronIndex,
        ),
        brewQuantity: yieldMultiplier,
      };
    }

    this.brewingCauldronEntityManager.clearIngredients(safeCauldronIndex);

    for (const itemTypeId of ingredientItemTypeIds) {
      const added = this.brewingCauldronEntityManager.addIngredient(
        itemTypeId,
        safeCauldronIndex,
      );

      if (!added) {
        this.brewingCauldronEntityManager.clearIngredients(safeCauldronIndex);

        return {
          ok: false,
          reason: 'cauldron_full',
          maxIngredients,
        };
      }
    }

    return {
      ok: true,
      recipe,
      ingredientItemTypeIds,
      requiredIngredientItemTypeIds,
      brewQuantity: yieldMultiplier,
      cauldronIndex: safeCauldronIndex,
      cauldronNumber: safeCauldronIndex + 1,
    };
  }

  getMissingInventory(itemTypeIds) {
    return [...this.getCounts(itemTypeIds)]
      .map(([itemTypeId, requiredQuantity]) => {
        const ownedQuantity = this.itemsFacade.getItemQuantity(itemTypeId);
        const missingQuantity = requiredQuantity - ownedQuantity;

        if (missingQuantity <= 0) {
          return null;
        }

        const item = this.itemsFacade.getItemDefinition(itemTypeId);

        return {
          itemTypeId,
          key: item.key,
          label: item.label,
          kind: item.kind,
          requiredQuantity,
          ownedQuantity,
          missingQuantity,
        };
      })
      .filter(Boolean);
  }

  getMissingInventoryForCauldron(itemTypeIds, cauldronIndex = 0) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);

    return [...this.getCounts(itemTypeIds)]
      .map(([itemTypeId, requiredQuantity]) => {
        const ownedQuantity = this.itemsFacade.getItemQuantity(itemTypeId);
        const stagedInOtherCauldrons = this.getStagedInOtherCauldrons(
          itemTypeId,
          safeCauldronIndex,
        );
        const availableQuantity = Math.max(0, ownedQuantity - stagedInOtherCauldrons);
        const missingQuantity = requiredQuantity - availableQuantity;

        if (missingQuantity <= 0) {
          return null;
        }

        const item = this.itemsFacade.getItemDefinition(itemTypeId);

        return {
          itemTypeId,
          key: item.key,
          label: item.label,
          kind: item.kind,
          requiredQuantity,
          ownedQuantity: availableQuantity,
          missingQuantity,
        };
      })
      .filter(Boolean);
  }

  hasEnoughInventory(itemTypeIds) {
    const counts = this.getCounts(itemTypeIds);

    for (const [itemTypeId, quantity] of counts) {
      if (this.itemsFacade.getItemQuantity(itemTypeId) < quantity) {
        return false;
      }
    }

    return true;
  }

  hasEnoughInventoryForCauldron(itemTypeIds, cauldronIndex = 0) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);
    const counts = this.getCounts(itemTypeIds);

    for (const [itemTypeId, quantity] of counts) {
      const ownedQuantity = this.itemsFacade.getItemQuantity(itemTypeId);
      const stagedInOtherCauldrons = this.getStagedInOtherCauldrons(
        itemTypeId,
        safeCauldronIndex,
      );

      if (ownedQuantity - stagedInOtherCauldrons < quantity) {
        return false;
      }
    }

    return true;
  }

  removeIngredientsFromInventory(itemTypeIds) {
    for (const [itemTypeId, quantity] of this.getCounts(itemTypeIds)) {
      this.itemsFacade.removeItem(itemTypeId, quantity);
    }
  }

  getCounts(itemTypeIds) {
    const counts = new Map();

    for (const itemTypeId of itemTypeIds) {
      counts.set(itemTypeId, (counts.get(itemTypeId) ?? 0) + 1);
    }

    return counts;
  }

  getStagedInOtherCauldrons(itemTypeId, cauldronIndex = 0) {
    const totalStaged =
      this.brewingCauldronEntityManager.getIngredientCountByItemTypeId(itemTypeId);
    const stagedInTarget =
      this.brewingCauldronEntityManager.getIngredientCountByItemTypeId(
        itemTypeId,
        cauldronIndex,
      );
    return Math.max(0, totalStaged - stagedInTarget);
  }

  getRecipeIngredientItemTypeIds(recipe) {
    if (!recipe || !Array.isArray(recipe.ingredients)) {
      return [];
    }

    return recipe.ingredients.flatMap((ingredient) => {
      const quantity = Number.isFinite(ingredient.quantity) ? Math.floor(ingredient.quantity) : 1;
      const normalizedQuantity = Math.max(1, quantity);
      return Array.from({ length: normalizedQuantity }, () => ingredient.itemTypeId);
    });
  }

  getYieldMultiplier(cauldronIndex = 0) {
    const multiplier =
      this.researchFacade?.getCauldronBrewingMultiplier?.(cauldronIndex + 1) ?? 1;
    const safeMultiplier = Math.floor(Number(multiplier));
    return Number.isInteger(safeMultiplier) && safeMultiplier > 0 ? safeMultiplier : 1;
  }

  normalizeYieldMultiplier(multiplier, cauldronIndex = 0) {
    const maxMultiplier = this.getYieldMultiplier(cauldronIndex);

    if (multiplier === null || multiplier === undefined) {
      return maxMultiplier;
    }

    const safeMultiplier = Math.floor(Number(multiplier));

    if (!Number.isInteger(safeMultiplier) || safeMultiplier <= 0) {
      return maxMultiplier;
    }

    return Math.min(safeMultiplier, maxMultiplier);
  }

  repeatItemTypeIds(itemTypeIds = [], multiplier = 1) {
    const safeMultiplier = Math.max(1, Math.floor(Number(multiplier) || 1));
    return Array.from({ length: safeMultiplier }, () => itemTypeIds).flat();
  }

  normalizeCauldronIndex(cauldronIndex) {
    const safeCauldronIndex = Math.floor(Number(cauldronIndex));
    return Number.isInteger(safeCauldronIndex) && safeCauldronIndex >= 0
      ? safeCauldronIndex
      : 0;
  }
}
