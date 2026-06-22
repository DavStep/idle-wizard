import { describe, expect, it, vi } from 'vitest';

import { ShopPlayerRequestManager } from './ShopPlayerRequestManager.js';

const sageSeed = {
  id: 1,
  key: 'sageSeed',
  label: 'sage seed',
  kind: 'seed',
};

function createManager() {
  return {
    shopPlayerRequestEntityManager: {
      setRequest: vi.fn(),
      clearRequest: vi.fn(),
    },
  };
}

describe('ShopPlayerRequestManager', () => {
  it('rejects player market request quantities and prices above the backend cap', () => {
    const { shopPlayerRequestEntityManager } = createManager();
    const manager = new ShopPlayerRequestManager({
      itemsFacade: {
        getItemDefinition: () => sageSeed,
      },
      shopSellKindManager: {
        isSellKind: () => true,
      },
      shopPlayerRequestEntityManager,
      isRequestSlotUnlocked: () => true,
    });

    expect(
      manager.setRequest(1, {
        itemTypeId: 1,
        quantity: 1_001,
        priceCoin: 1,
      }),
    ).toEqual({
      ok: false,
      reason: 'quantity_too_high',
      maxQuantity: 1_000,
    });
    expect(
      manager.setRequest(1, {
        itemTypeId: 1,
        quantity: 1,
        priceCoin: 1_000_000.01,
      }),
    ).toEqual({
      ok: false,
      reason: 'price_too_high',
      maxPriceCoin: 1_000_000,
    });
    expect(shopPlayerRequestEntityManager.setRequest).not.toHaveBeenCalled();
  });
});
