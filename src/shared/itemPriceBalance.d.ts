export const ITEM_SELL_PRICE_BALANCE_VERSION: 2;
export const POTION_INGREDIENT_VALUE_MULTIPLIER: 2.5;

export type PotionPriceRecipe = {
  potionKey: string;
  ingredients: Array<{
    itemKey: string;
    quantity: number;
  }>;
};

export function createPotionSellPrices(
  recipes: PotionPriceRecipe[],
  herbSellPricesByItemKey: Record<string, number>,
): Record<string, number>;
