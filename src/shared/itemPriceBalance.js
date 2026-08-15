export const ITEM_SELL_PRICE_BALANCE_VERSION = 2;
export const POTION_INGREDIENT_VALUE_MULTIPLIER = 2.5;

const PRICE_DECIMAL_SCALE = 100;

export function createPotionSellPrices(recipes = [], herbSellPricesByItemKey = {}) {
  return Object.fromEntries(
    recipes.map((recipe) => {
      let ingredientValue = 0;

      for (const ingredient of recipe.ingredients ?? []) {
        const herbPrice = Number(herbSellPricesByItemKey[ingredient.itemKey]);
        const quantity = Number(ingredient.quantity);

        if (
          !Number.isFinite(herbPrice) ||
          herbPrice < 0 ||
          !Number.isInteger(quantity) ||
          quantity <= 0
        ) {
          throw new Error(`Invalid potion price input: ${recipe.potionKey ?? 'unknown'}`);
        }

        ingredientValue += herbPrice * quantity;
      }

      const sellPrice =
        Math.round(
          ingredientValue *
            POTION_INGREDIENT_VALUE_MULTIPLIER *
            PRICE_DECIMAL_SCALE,
        ) / PRICE_DECIMAL_SCALE;

      return [recipe.potionKey, sellPrice];
    }),
  );
}
