import { ingredientCatalog } from '../../../gameplay/items/ingredientCatalog.js';

export const ingredientIconFrameNamesByKey = Object.freeze(
  Object.fromEntries(
    ingredientCatalog.map((ingredient) => [
      ingredient.key,
      `ingredient:${ingredient.key}`,
    ]),
  ),
);

export function getIngredientIconFrameName(itemKey) {
  return ingredientIconFrameNamesByKey[itemKey] ?? null;
}
