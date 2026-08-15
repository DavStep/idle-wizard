import { describe, expect, it } from 'vitest';

import {
  ITEM_SELL_PRICE_BALANCE_VERSION,
  POTION_INGREDIENT_VALUE_MULTIPLIER,
  createPotionSellPrices,
} from './itemPriceBalance.js';

describe('item price balance', () => {
  it('prices every potion at 2.5 times its herb inputs', () => {
    expect(POTION_INGREDIENT_VALUE_MULTIPLIER).toBe(2.5);
    expect(ITEM_SELL_PRICE_BALANCE_VERSION).toBe(2);
    expect(
      createPotionSellPrices(
        [
          {
            potionKey: 'starLuckPhiltre',
            ingredients: [
              { itemKey: 'starAniseHerb', quantity: 1 },
              { itemKey: 'moonflowerHerb', quantity: 2 },
              { itemKey: 'mintHerb', quantity: 2 },
            ],
          },
        ],
        {
          starAniseHerb: 10_240,
          moonflowerHerb: 1_280,
          mintHerb: 10,
        },
      ),
    ).toEqual({ starLuckPhiltre: 32_050 });
  });
});
