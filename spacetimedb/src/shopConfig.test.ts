import { describe, expect, it } from 'vitest';

import { restoreFiveSecondShopTimer } from './shopConfig';

describe('restoreFiveSecondShopTimer', () => {
  it('repairs an existing thirty-minute shop row without changing its other balance', () => {
    expect(
      restoreFiveSecondShopTimer({
        shopShelf: {
          initialUnlockedSlots: 0,
          slotCostsCoin: [50, 150, 400, 1000, 2500],
          autoSellSeconds: 30 * 60,
        },
      }),
    ).toEqual({
      shopShelf: {
        initialUnlockedSlots: 0,
        slotCostsCoin: [50, 150, 400, 1000, 2500],
        autoSellSeconds: 5,
      },
    });
  });

  it('leaves malformed config untouched for the normal validator to reject', () => {
    expect(restoreFiveSecondShopTimer({ shopShelf: null })).toBeNull();
  });
});
