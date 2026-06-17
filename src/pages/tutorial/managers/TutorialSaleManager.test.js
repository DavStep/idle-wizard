import { describe, expect, it, vi } from 'vitest';

import { TutorialSaleManager } from './TutorialSaleManager.js';

function createSnapshot({
  gold = 0,
  seeds = [{ key: 'sageSeed', quantity: 1 }],
} = {}) {
  return {
    gold: { current: gold },
    inventory: [],
    seedInventory: seeds,
    garden: {
      seeds: [],
      herbs: [],
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
  it('ignores normal direct sells outside the tutorial sale step', () => {
    const manager = new TutorialSaleManager();

    expect(
      manager.handleDirectSellOverride({
        step: { effect: 'none' },
        snapshot: createSnapshot(),
        dom: createDom({ selectedItemKey: 'sageSeed' }),
        itemKey: 'sageSeed',
      }),
    ).toEqual({ handled: false });
  });

  it('runs the local tutorial sale only when the tutorial item is confirmed', () => {
    const manager = new TutorialSaleManager();
    const gameplayFacade = {
      sellTutorialItemForGold: vi.fn(() => ({
        ok: true,
        quantity: 1,
        gold: 10,
        tutorial: true,
      })),
    };

    const result = manager.handleDirectSellOverride({
      step: {
        effect: 'tutorial-sale',
        sale: {
          itemKey: 'sageSeed',
          quantity: 1,
          goldEach: 10,
          goldTarget: 10,
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
      gold: 10,
    });
    expect(gameplayFacade.sellTutorialItemForGold).toHaveBeenCalledWith({
      itemKey: 'sageSeed',
      quantity: 4,
      goldEach: 10,
      goldTarget: 10,
    });
  });

  it('does not hijack confirm for a different selected item', () => {
    const manager = new TutorialSaleManager();
    const gameplayFacade = {
      sellTutorialItemForGold: vi.fn(),
    };

    expect(
      manager.handleDirectSellOverride({
        step: {
          effect: 'tutorial-sale',
          sale: {
            itemKey: 'sageSeed',
            quantity: 1,
            goldEach: 10,
            goldTarget: 10,
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
    expect(gameplayFacade.sellTutorialItemForGold).not.toHaveBeenCalled();
  });
});
