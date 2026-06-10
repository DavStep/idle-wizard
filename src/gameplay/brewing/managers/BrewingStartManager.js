import { itemKinds } from '../../items/itemKinds.js';

export class BrewingStartManager {
  constructor({
    brewingBalanceManager,
    brewingCauldronEntityManager,
    brewingProcessEntityManager,
    brewingRecipeMatchManager,
    itemsFacade,
    manaFacade,
  }) {
    this.brewingBalanceManager = brewingBalanceManager;
    this.brewingCauldronEntityManager = brewingCauldronEntityManager;
    this.brewingProcessEntityManager = brewingProcessEntityManager;
    this.brewingRecipeMatchManager = brewingRecipeMatchManager;
    this.itemsFacade = itemsFacade;
    this.manaFacade = manaFacade;
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

    const manaCost = recipe?.manaCost ?? this.brewingBalanceManager.getWastedBrewManaCost();

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
    const durationMs = recipe?.brewDurationMs ?? this.brewingBalanceManager.getWastedBrewDurationMs();

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
}
