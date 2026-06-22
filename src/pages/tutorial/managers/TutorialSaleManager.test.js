import { describe, expect, it, vi } from 'vitest';

import { TutorialSaleManager } from './TutorialSaleManager.js';

function createSnapshot({
  coin = 0,
  level = 1,
  levelCostCoin = 10,
  seeds = [{ key: 'sageSeed', quantity: 1 }],
  herbs = [],
  prestigeCompletedLevels = [],
} = {}) {
  return {
    coin: { current: coin },
    inventory: [],
    seedInventory: seeds,
    garden: {
      seeds: [],
      herbs,
    },
    prestige: {
      completedLevels: prestigeCompletedLevels,
    },
    tasks: {
      currentLevel: level,
      level: {
        completion: {
          costCoin: levelCostCoin,
        },
      },
    },
    shop: {
      shelf: {
        slots: [],
      },
    },
  };
}

function createDom({ selectedItemKey = null } = {}) {
  return {
    isShopDirectSellItemSelected: (itemKey) => itemKey === selectedItemKey,
  };
}

describe('TutorialSaleManager', () => {
  it('returns a fixed tutorial quote override for fast sell display', () => {
    const manager = new TutorialSaleManager();

    expect(
      manager.getDirectSellQuoteOverride({
        step: {
          effect: 'tutorial-sale',
          sale: {
            itemKey: 'sageSeed',
            quantity: 1,
            coinEach: 10,
            coinTarget: 10,
          },
        },
        snapshot: createSnapshot({
          seeds: [{ key: 'sageSeed', quantity: 2 }],
        }),
        itemKey: 'sageSeed',
        quantity: 4,
      }),
    ).toMatchObject({
      ok: true,
      quantity: 1,
      priceCoin: 10,
      totalPriceCoin: 10,
      tutorial: true,
    });
  });

  it('keeps using tutorial fast-sell quotes until FTUE completes', () => {
    const manager = new TutorialSaleManager();

    expect(
      manager.getDirectSellQuoteOverride({
        step: { effect: 'none' },
        snapshot: createSnapshot({
          level: 3,
          coin: 30,
          levelCostCoin: 40,
          herbs: [{ key: 'sageHerb', quantity: 2 }],
          seeds: [],
        }),
        item: {
          key: 'sageHerb',
          kind: 'herb',
        },
        itemKey: 'sageHerb',
        quantity: 2,
      }),
    ).toMatchObject({
      ok: true,
      quantity: 1,
      priceCoin: 10,
      totalPriceCoin: 10,
      tutorial: true,
    });
  });

  it('ignores direct sells once FTUE market pricing is finished', () => {
    const manager = new TutorialSaleManager();

    expect(
      manager.handleDirectSellOverride({
        step: { effect: 'none' },
        snapshot: createSnapshot({ level: 5 }),
        dom: createDom({ selectedItemKey: 'sageSeed' }),
        itemKey: 'sageSeed',
      }),
    ).toEqual({ handled: false });
  });

  it('runs the local tutorial sale only when the tutorial item is confirmed', () => {
    const manager = new TutorialSaleManager();
    const gameplayFacade = {
      sellTutorialItemForCoin: vi.fn(() => ({
        ok: true,
        quantity: 1,
        coin: 10,
        tutorial: true,
      })),
    };

    const result = manager.handleDirectSellOverride({
      step: {
        effect: 'tutorial-sale',
        sale: {
          itemKey: 'sageSeed',
          quantity: 1,
          coinEach: 10,
          coinTarget: 10,
        },
      },
      snapshot: createSnapshot(),
      dom: createDom({ selectedItemKey: 'sageSeed' }),
      gameplayFacade,
      itemKey: 'sageSeed',
      quantity: 4,
    });

    expect(result).toMatchObject({
      handled: true,
      ok: true,
      coin: 10,
    });
    expect(gameplayFacade.sellTutorialItemForCoin).toHaveBeenCalledWith({
      itemKey: 'sageSeed',
      quantity: 4,
      coinEach: 10,
      coinTarget: 10,
    });
  });

  it('routes later FTUE fast sells through the local tutorial market prices too', () => {
    const manager = new TutorialSaleManager();
    const gameplayFacade = {
      sellTutorialItemForCoin: vi.fn(() => ({
        ok: true,
        quantity: 1,
        coin: 10,
        tutorial: true,
      })),
    };

    const result = manager.handleDirectSellOverride({
      step: { effect: 'none' },
      snapshot: createSnapshot({
        level: 3,
        coin: 30,
        levelCostCoin: 40,
        herbs: [{ key: 'sageHerb', quantity: 2 }],
        seeds: [],
      }),
      dom: createDom({ selectedItemKey: 'sageHerb' }),
      gameplayFacade,
      item: {
        key: 'sageHerb',
        kind: 'herb',
      },
      itemKey: 'sageHerb',
      quantity: 2,
    });

    expect(result).toMatchObject({
      handled: true,
      ok: true,
      coin: 10,
    });
    expect(gameplayFacade.sellTutorialItemForCoin).toHaveBeenCalledWith({
      itemKey: 'sageHerb',
      quantity: 2,
      coinEach: 20,
      coinTarget: 40,
    });
  });

  it('does not hijack confirm for a different selected item', () => {
    const manager = new TutorialSaleManager();
    const gameplayFacade = {
      sellTutorialItemForCoin: vi.fn(),
    };

    expect(
      manager.handleDirectSellOverride({
        step: {
          effect: 'tutorial-sale',
          sale: {
            itemKey: 'sageSeed',
            quantity: 1,
            coinEach: 10,
            coinTarget: 10,
          },
        },
        snapshot: createSnapshot({
          seeds: [
            { key: 'sageSeed', quantity: 1 },
            { key: 'mintSeed', quantity: 2 },
          ],
        }),
        dom: createDom({ selectedItemKey: 'mintSeed' }),
        gameplayFacade,
        itemKey: 'mintSeed',
        quantity: 1,
      }),
    ).toEqual({ handled: false });
    expect(gameplayFacade.sellTutorialItemForCoin).not.toHaveBeenCalled();
  });

  it('provides fallback FTUE prices for offline stand and stock rows', () => {
    const manager = new TutorialSaleManager();
    const snapshot = createSnapshot({
      level: 2,
    });
    const item = {
      key: 'manaTonic',
      kind: 'potion',
    };

    expect(manager.getNpcSellPriceOverride({ snapshot, item })).toBe(100);
    expect(
      manager.getNpcStockBuyQuoteOverride({
        snapshot,
        item,
        quantity: 2,
      }),
    ).toMatchObject({
      ok: true,
      quantity: 2,
      priceCoin: 100,
      totalPriceCoin: 200,
      tutorial: true,
    });
  });
});
