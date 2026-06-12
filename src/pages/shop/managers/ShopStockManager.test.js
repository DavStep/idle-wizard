/* @vitest-environment jsdom */

import { readFileSync } from 'node:fs';
import process from 'node:process';

import { describe, expect, it, vi } from 'vitest';

import { ShopStockManager } from './ShopStockManager.js';

function createGameplayFacade(snapshot) {
  const listeners = new Set();

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      listener(snapshot);
      return () => listeners.delete(listener);
    },
    quoteNpcMarketStockPurchase: vi.fn((itemTypeId, quantity = 1) => {
      const item = snapshot.shop.stock.items.find(
        (stockItem) => stockItem.itemTypeId === itemTypeId,
      );

      return {
        ok: true,
        quantity,
        priceGold: item.buyGold,
        totalPriceGold: quantity === 2 ? 2.6 : item.buyGold * quantity,
      };
    }),
    buyNpcMarketStockItem: vi.fn().mockResolvedValue({
      ok: true,
      item: snapshot.shop.stock.items[0],
      quantity: 1,
      priceGold: snapshot.shop.stock.items[0].buyGold,
      totalPriceGold: snapshot.shop.stock.items[0].buyGold,
    }),
  };
}

describe('ShopStockManager', () => {
  it('renders shared NPC stock with bottom tabs and a quantity buy dialog', async () => {
    const stage = document.createElement('section');
    const snapshot = {
      gold: { current: 5 },
      research: { completedResearchIds: ['unlockSeed:sageSeed'] },
      shop: {
        stock: {
          sellKinds: [{ kind: 'seed', label: 'seeds' }],
          items: [
            {
              itemTypeId: 1,
              key: 'sageSeed',
              label: 'Sage Seed',
              kind: 'seed',
              quantity: 0,
              buyGold: 1.25,
              stock: 3,
            },
          ],
        },
      },
    };
    const gameplayFacade = createGameplayFacade(snapshot);
    const manager = new ShopStockManager({ gameplayFacade });

    manager.mount(stage);

    expect(stage.querySelector('.shop-page__stock')?.textContent).toContain(
      'npc stock market',
    );
    expect(stage.querySelector('.shop-page__stock-row')?.textContent).toContain(
      'Sage Seed (3)',
    );
    expect(stage.querySelector('.shop-page__stock-buy-button')?.textContent).toBe(
      '1.25 gold',
    );
    expect(
      stage
        .querySelector('.shop-page__stock-buy-button')
        ?.getAttribute('data-resource-color'),
    ).toBe('gold');
    expect(stage.querySelector('.shop-page__stock-buy-button')?.disabled).toBe(
      false,
    );
    expect(
      stage.querySelector('.shop-page__stock')?.lastElementChild,
    ).toBe(stage.querySelector('.shop-page__stock-tabs'));

    await manager.onBuyItem(1);

    expect(stage.querySelector('.shop-page__stock-buy-popup')?.hidden).toBe(false);
    expect(gameplayFacade.buyNpcMarketStockItem).not.toHaveBeenCalled();
    expect(stage.querySelector('.shop-page__stock-buy-dialog')?.textContent).toContain(
      'total1.25 gold',
    );

    const input = stage.querySelector('.shop-page__stock-buy-input');
    input.value = '2';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));

    expect(gameplayFacade.quoteNpcMarketStockPurchase).toHaveBeenLastCalledWith(1, 2);
    expect(stage.querySelector('.shop-page__stock-buy-dialog')?.textContent).toContain(
      'total2.6 gold',
    );

    await manager.onConfirmBuy();

    expect(gameplayFacade.buyNpcMarketStockItem).toHaveBeenCalledWith(1, 2);
    expect(stage.querySelector('.shop-page__stock-buy-popup')?.hidden).toBe(true);

    manager.unmount();
  });

  it('keeps unaffordable stock buy prices disabled without gold color', () => {
    const stage = document.createElement('section');
    const snapshot = {
      gold: { current: 1 },
      research: { completedResearchIds: ['unlockSeed:sageSeed'] },
      shop: {
        stock: {
          sellKinds: [{ kind: 'seed', label: 'seeds' }],
          items: [
            {
              itemTypeId: 1,
              key: 'sageSeed',
              label: 'Sage Seed',
              kind: 'seed',
              quantity: 0,
              buyGold: 1.25,
              stock: 3,
            },
          ],
        },
      },
    };
    const gameplayFacade = createGameplayFacade(snapshot);
    const manager = new ShopStockManager({ gameplayFacade });

    manager.mount(stage);

    const button = stage.querySelector('.shop-page__stock-buy-button');

    expect(button?.textContent).toBe('1.25 gold');
    expect(button?.disabled).toBe(true);
    expect(button?.getAttribute('data-resource-color')).toBeNull();

    manager.unmount();
  });

  it('shows backend-stocked items even with zero local quantity and no research', () => {
    const stage = document.createElement('section');
    const snapshot = {
      gold: { current: 5 },
      research: { completedResearchIds: [] },
      shop: {
        stock: {
          items: [
            {
              itemTypeId: 2,
              key: 'mintSeed',
              label: 'Mint Seed',
              kind: 'seed',
              quantity: 0,
              buyGold: 1,
              stock: 1,
            },
          ],
        },
      },
    };
    const gameplayFacade = createGameplayFacade(snapshot);
    const manager = new ShopStockManager({ gameplayFacade });

    manager.mount(stage);

    expect(stage.querySelector('.shop-page__stock-row')?.textContent).toContain(
      'Mint Seed (1)',
    );
    expect(stage.querySelector('.shop-page__stock-row')?.classList.contains('is-locked'))
      .toBe(false);
    expect(stage.querySelector('.shop-page__stock-buy-button')?.disabled).toBe(
      false,
    );

    manager.unmount();
  });

  it('shows only selected stock category rows after tab changes', () => {
    const stage = document.createElement('section');
    const snapshot = {
      gold: { current: 5 },
      research: { completedResearchIds: [] },
      shop: {
        stock: {
          items: [
            {
              itemTypeId: 1,
              key: 'sageSeed',
              label: 'Sage Seed',
              kind: 'seed',
              quantity: 0,
              buyGold: 1,
              stock: 3,
              researched: true,
            },
            {
              itemTypeId: 101,
              key: 'sageHerb',
              label: 'Sage',
              kind: 'herb',
              quantity: 0,
              buyGold: 1,
              stock: 2,
              researched: true,
            },
            {
              itemTypeId: 201,
              key: 'manaTonic',
              label: 'Mana Tonic',
              kind: 'potion',
              quantity: 0,
              buyGold: 1,
              stock: 1,
              researched: true,
            },
          ],
        },
      },
    };
    const gameplayFacade = createGameplayFacade(snapshot);
    const manager = new ShopStockManager({ gameplayFacade });

    manager.mount(stage);
    manager.onSelectTab('herb');

    expect(manager.refs.rows.get(1)?.row.hidden).toBe(true);
    expect(manager.refs.rows.get(101)?.row.hidden).toBe(false);

    manager.onSelectTab('potion');

    expect(manager.refs.rows.get(1)?.row.hidden).toBe(true);
    expect(manager.refs.rows.get(101)?.row.hidden).toBe(true);
    expect(manager.refs.rows.get(201)?.row.hidden).toBe(false);

    manager.unmount();
  });

  it('keeps hidden stock rows hidden under the authored grid display rule', () => {
    const baseCss = readFileSync(`${process.cwd()}/src/styles/base.css`, 'utf8');

    expect(baseCss).toMatch(
      /\.shop-page__stock-row\[hidden\]\s*\{\s*display:\s*none;\s*\}/,
    );
  });
});
