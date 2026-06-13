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

  addIngredient(itemTypeId) {
    if (this.brewingProcessEntityManager.hasActiveBrew()) {
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
      this.brewingCauldronEntityManager.getIngredientCount() >=
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

    this.brewingCauldronEntityManager.addIngredient(itemTypeId);

    return {
      ok: true,
      item,
    };
  }

  removeIngredientAt(slotIndex) {
    if (this.brewingProcessEntityManager.hasActiveBrew()) {
      return {
        ok: false,
        reason: 'brew_in_progress',
      };
    }

    if (!this.brewingCauldronEntityManager.removeIngredientAt(slotIndex)) {
      return {
        ok: false,
        reason: 'unknown_ingredient',
        slotIndex,
      };
    }

    return {
      ok: true,
      slotIndex,
    };
  }

  clearCauldron() {
    if (this.brewingProcessEntityManager.hasActiveBrew()) {
      return {
        ok: false,
        reason: 'brew_in_progress',
      };
    }

    this.brewingCauldronEntityManager.clearIngredients();

    return {
      ok: true,
    };
  }

  brew() {
    if (this.brewingProcessEntityManager.hasActiveBrew()) {
      return {
        ok: false,
        reason: 'brew_in_progress',
      };
    }

    const ingredientItemTypeIds =
      this.brewingCauldronEntityManager.getIngredientItemTypeIds();

    if (ingredientItemTypeIds.length === 0) {
      return {
        ok: false,
        reason: 'cauldron_empty',
      };
    }

    if (!this.hasEnoughInventory(ingredientItemTypeIds)) {
      return {
        ok: false,
        reason: 'not_enough_ingredients',
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

    const manaCost =
      recipe && !recipeDiscoverable
        ? recipe.manaCost
        : this.brewingBalanceManager.getWastedBrewManaCost();

    if (!this.manaFacade.spend(manaCost)) {
      return {
        ok: false,
        reason: 'not_enough_mana',
        cost: manaCost,
      };
    }

    this.removeIngredientsFromInventory(ingredientItemTypeIds);

    const resultItem = recipe
      ? this.itemsFacade.getItemDefinition(recipe.potionTypeId)
      : this.itemsFacade.getItemDefinitionByKey(
          this.brewingBalanceManager.getWastedPotionKey(),
        );
    const baseDurationMs =
      recipe?.brewDurationMs ?? this.brewingBalanceManager.getWastedBrewDurationMs();
    const durationMs =
      this.researchFacade?.getReducedCauldronBrewingDurationMs?.(1, baseDurationMs) ??
      baseDurationMs;

    this.brewingProcessEntityManager.startBrew({
      resultItemTypeId: resultItem.id,
      totalSeconds: durationMs / 1_000,
      bottlingTotalSeconds: this.brewingBalanceManager.getBottlingDurationMs() / 1_000,
    });
    this.brewingCauldronEntityManager.clearIngredients();

    return {
      ok: true,
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
      durationMs,
    };
  }

  prepareRecipeForAutoBrew(recipeKey) {
    return this.prepareRecipe(recipeKey, { clearOnMissing: false });
  }

  prepareRecipeForSelection(recipeKey) {
    return this.prepareRecipe(recipeKey, { clearOnMissing: true });
  }

  prepareRecipe(recipeKey, { clearOnMissing = false } = {}) {
    const recipe = this.brewingRecipeMatchManager.getRecipeByKey(recipeKey);

    if (!recipe) {
      return {
        ok: false,
        reason: 'auto_recipe_not_found',
      };
    }

    if (this.brewingProcessEntityManager.hasActiveBrew()) {
      return {
        ok: false,
        reason: 'brew_in_progress',
      };
    }

    const ingredientItemTypeIds = this.getRecipeIngredientItemTypeIds(recipe);
    const maxIngredients = this.brewingBalanceManager.getMaxCauldronIngredients();

    if (ingredientItemTypeIds.length > maxIngredients) {
      return {
        ok: false,
        reason: 'recipe_too_long',
        maxIngredients,
      };
    }

    if (!this.hasEnoughInventory(ingredientItemTypeIds)) {
      if (clearOnMissing) {
        this.brewingCauldronEntityManager.clearIngredients();
      }

      return {
        ok: false,
        reason: 'not_enough_ingredients',
        recipe,
        missingIngredients: this.getMissingInventory(ingredientItemTypeIds),
      };
    }

    this.brewingCauldronEntityManager.clearIngredients();

    for (const itemTypeId of ingredientItemTypeIds) {
      const added = this.brewingCauldronEntityManager.addIngredient(itemTypeId);

      if (!added) {
        this.brewingCauldronEntityManager.clearIngredients();

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

  hasEnoughInventory(itemTypeIds) {
    const counts = this.getCounts(itemTypeIds);

    for (const [itemTypeId, quantity] of counts) {
      if (this.itemsFacade.getItemQuantity(itemTypeId) < quantity) {
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
}
