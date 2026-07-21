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
        priceCoin: item.buyCoin,
        totalPriceCoin: quantity === 2 ? 2.6 : item.buyCoin * quantity,
      };
    }),
    buyNpcMarketStockItem: vi.fn().mockResolvedValue({
      ok: true,
      item: snapshot.shop.stock.items[0],
      quantity: 1,
      priceCoin: snapshot.shop.stock.items[0].buyCoin,
      totalPriceCoin: snapshot.shop.stock.items[0].buyCoin,
    }),
  };
}

function getStockBox(stage, label) {
  return [...stage.querySelectorAll('.shop-page__stock')].find((box) =>
    box.querySelector('.style-box__title')?.textContent.includes(label),
  );
}

describe('ShopStockManager', () => {
  it('renders shared trader stock boxes and a quantity buy dialog', async () => {
    const stage = document.createElement('section');
    const snapshot = {
      coin: { current: 5 },
      research: { completedResearchIds: ['unlockSeed:sageSeed'] },
      shop: {
        stock: {
          sellKinds: [{ kind: 'seed', label: 'seeds' }],
          items: [
            {
              itemTypeId: 1,
              key: 'sageSeed',
              label: 'sage seed',
              kind: 'seed',
              quantity: 0,
              buyCoin: 1.25,
              stock: 3,
            },
          ],
        },
      },
    };
    const gameplayFacade = createGameplayFacade(snapshot);
    const manager = new ShopStockManager({ gameplayFacade });

    manager.mount(stage);

    const stockBoxes = [...stage.querySelectorAll('.shop-page__stock')];
    const seedBox = getStockBox(stage, 'seeds');

    expect(stockBoxes.map((box) => box.querySelector('.style-box__title')?.textContent))
      .toEqual([
        'trader stock market: seeds',
        'trader stock market: herbs',
        'trader stock market: potions',
      ]);
    expect(stage.querySelector('.shop-page__stock-type-button')).toBeNull();
    expect(seedBox?.querySelector('.shop-page__stock-row')?.textContent).toContain(
      'sage seed (3)',
    );
    expect(seedBox?.querySelector('.shop-page__stock-buy-button')?.textContent).toBe(
      'buy 2 coin',
    );
    expect(
      seedBox
        .querySelector('.shop-page__stock-buy-button')
        ?.querySelector('[data-resource-color]')
        ?.getAttribute('data-resource-color'),
    ).toBe('coin');
    expect(seedBox?.querySelector('.shop-page__stock-buy-button')?.disabled).toBe(
      false,
    );
    expect(seedBox?.querySelector('.shop-page__stock-count')?.textContent).toBe('1/1');
    expect(seedBox?.querySelector('.shop-page__stock-toggle')?.hidden).toBe(true);
    expect(getStockBox(stage, 'herbs')?.textContent).toContain('empty');
    expect(getStockBox(stage, 'potions')?.textContent).toContain('empty');

    await manager.onBuyItem(1);

    expect(stage.querySelector('.shop-page__stock-buy-popup')?.hidden).toBe(false);
    expect(gameplayFacade.buyNpcMarketStockItem).not.toHaveBeenCalled();
    expect(stage.querySelector('.shop-page__stock-buy-dialog')?.textContent).toContain(
      'total2 coin',
    );

    const stepButtons = [
      ...stage.querySelectorAll('.shop-page__stock-buy-step'),
    ];
    expect(stepButtons.map((button) => button.textContent)).toEqual([
      '-100',
      '-10',
      '-1',
      '+1',
      '+10',
      '+100',
    ]);

    const input = stage.querySelector('.shop-page__stock-buy-input');
    expect(input.value).toBe('1');

    stepButtons.find((button) => button.textContent === '+1').click();

    expect(gameplayFacade.quoteNpcMarketStockPurchase).toHaveBeenLastCalledWith(1, 2);
    expect(input.value).toBe('2');
    expect(stage.querySelector('.shop-page__stock-buy-dialog')?.textContent).toContain(
      'total3 coin',
    );

    stepButtons.find((button) => button.textContent === '+100').click();

    expect(gameplayFacade.quoteNpcMarketStockPurchase).toHaveBeenLastCalledWith(1, 3);
    expect(input.value).toBe('3');

    stepButtons.find((button) => button.textContent === '-100').click();

    expect(gameplayFacade.quoteNpcMarketStockPurchase).toHaveBeenLastCalledWith(1, 1);
    expect(input.value).toBe('1');

    input.value = '2';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));

    expect(gameplayFacade.quoteNpcMarketStockPurchase).toHaveBeenLastCalledWith(1, 2);
    expect(stage.querySelector('.shop-page__stock-buy-dialog')?.textContent).toContain(
      'total3 coin',
    );

    await manager.onConfirmBuy();

    expect(gameplayFacade.buyNpcMarketStockItem).toHaveBeenCalledWith(1, 2);
    expect(stage.querySelector('.shop-page__stock-buy-popup')?.hidden).toBe(true);

    manager.unmount();
  });

  it('keeps unaffordable stock buy prices disabled without coin color', () => {
    const stage = document.createElement('section');
    const snapshot = {
      coin: { current: 1 },
      research: { completedResearchIds: ['unlockSeed:sageSeed'] },
      shop: {
        stock: {
          sellKinds: [{ kind: 'seed', label: 'seeds' }],
          items: [
            {
              itemTypeId: 1,
              key: 'sageSeed',
              label: 'sage seed',
              kind: 'seed',
              quantity: 0,
              buyCoin: 1.25,
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

    expect(button?.textContent).toBe('buy 2 coin');
    expect(button?.disabled).toBe(true);
    expect(button?.getAttribute('data-resource-color')).toBeNull();

    manager.unmount();
  });

  it('shows tutorial fallback stock prices when backend prices are missing', () => {
    const stage = document.createElement('section');
    const snapshot = {
      coin: { current: 1 },
      research: { completedResearchIds: ['unlockSeed:sageSeed'] },
      shop: {
        stock: {
          sellKinds: [{ kind: 'seed', label: 'seeds' }],
          items: [
            {
              itemTypeId: 1,
              key: 'sageSeed',
              label: 'sage seed',
              kind: 'seed',
              quantity: 0,
              buyCoin: null,
              stock: 3,
            },
          ],
        },
      },
    };
    const gameplayFacade = createGameplayFacade(snapshot);
    const manager = new ShopStockManager({
      gameplayFacade,
      getBuyQuoteOverride: ({ item, quantity }) =>
        item?.key === 'sageSeed'
          ? {
              ok: true,
              quantity,
              priceCoin: 12.5,
              totalPriceCoin: 12.5 * quantity,
              tutorial: true,
            }
          : null,
    });

    manager.mount(stage);

    const button = stage.querySelector('.shop-page__stock-buy-button');

    expect(button?.textContent).toBe('buy 13 coin');
    expect(button?.disabled).toBe(true);
    expect(button?.getAttribute('data-resource-color')).toBeNull();

    manager.unmount();
  });

  it('shows backend-stocked items even with zero local quantity and no research', () => {
    const stage = document.createElement('section');
    const snapshot = {
      coin: { current: 5 },
      research: { completedResearchIds: [] },
      shop: {
        stock: {
          items: [
            {
              itemTypeId: 2,
              key: 'mintSeed',
              label: 'mint seed',
              kind: 'seed',
              quantity: 0,
              buyCoin: 1,
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
      'mint seed (1)',
    );
    expect(stage.querySelector('.shop-page__stock-row')?.classList.contains('is-locked'))
      .toBe(false);
    expect(stage.querySelector('.shop-page__stock-buy-button')?.disabled).toBe(
      false,
    );

    manager.unmount();
  });

  it('renders stock category rows in separate boxes', () => {
    const stage = document.createElement('section');
    const snapshot = {
      coin: { current: 5 },
      research: { completedResearchIds: [] },
      shop: {
        stock: {
          items: [
            {
              itemTypeId: 1,
              key: 'sageSeed',
              label: 'sage seed',
              kind: 'seed',
              quantity: 0,
              buyCoin: 1,
              stock: 3,
              researched: true,
            },
            {
              itemTypeId: 101,
              key: 'sageHerb',
              label: 'sage',
              kind: 'herb',
              quantity: 0,
              buyCoin: 1,
              stock: 2,
              researched: true,
            },
            {
              itemTypeId: 201,
              key: 'manaTonic',
              label: 'mana tonic',
              kind: 'potion',
              quantity: 0,
              buyCoin: 1,
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

    const seedBox = getStockBox(stage, 'seeds');
    const herbBox = getStockBox(stage, 'herbs');
    const potionBox = getStockBox(stage, 'potions');

    expect(seedBox?.textContent).toContain('sage seed (3)');
    expect(herbBox?.textContent).toContain('sage (2)');
    expect(potionBox?.textContent).toContain('mana tonic (1)');
    expect(manager.refs.rows.get(1)?.row.closest('.shop-page__stock')).toBe(seedBox);
    expect(manager.refs.rows.get(101)?.row.closest('.shop-page__stock')).toBe(herbBox);
    expect(manager.refs.rows.get(201)?.row.closest('.shop-page__stock')).toBe(potionBox);
    expect(manager.refs.rows.get(1)?.row.hidden).toBe(false);
    expect(manager.refs.rows.get(101)?.row.hidden).toBe(false);
    expect(manager.refs.rows.get(201)?.row.hidden).toBe(false);

    manager.unmount();
  });

  it('collapses stock rows after five and expands them from the bottom toggle', () => {
    const stage = document.createElement('section');
    const items = Array.from({ length: 6 }, (_, index) => ({
      itemTypeId: index + 1,
      key: `seed${index}Seed`,
      label: `seed ${index}`,
      kind: 'seed',
      quantity: 0,
      buyCoin: 1,
      stock: 3,
      researched: true,
    }));
    const snapshot = {
      coin: { current: 20 },
      research: { completedResearchIds: [] },
      shop: {
        stock: {
          items,
        },
      },
    };
    const gameplayFacade = createGameplayFacade(snapshot);
    const manager = new ShopStockManager({ gameplayFacade });

    manager.mount(stage);

    const seedBox = getStockBox(stage, 'seeds');

    expect(seedBox?.querySelector('.shop-page__stock-count')?.textContent).toBe('5/6');
    expect(seedBox?.querySelector('.shop-page__stock-toggle')?.hidden).toBe(false);
    expect(manager.refs.rows.get(1)?.row.hidden).toBe(false);
    expect(manager.refs.rows.get(5)?.row.hidden).toBe(false);
    expect(manager.refs.rows.get(6)?.row.hidden).toBe(true);

    manager.toggleStockExpanded('seed');

    expect(seedBox?.querySelector('.shop-page__stock-count')?.textContent).toBe('6/6');
    expect(seedBox?.querySelector('.shop-page__stock-toggle')?.textContent).toBe(
      'collapse',
    );
    expect(manager.refs.rows.get(6)?.row.hidden).toBe(false);
    expect(getStockBox(stage, 'herbs')?.querySelector('.shop-page__stock-count')?.textContent)
      .toBe('0/0');
    expect(getStockBox(stage, 'herbs')?.querySelector('.shop-page__stock-toggle')?.hidden)
      .toBe(true);
    expect(manager.isStockExpanded('seed')).toBe(true);
    expect(manager.isStockExpanded('herb')).toBe(false);

    manager.unmount();
  });

  it('keeps hidden stock rows hidden under the authored grid display rule', () => {
    const baseCss = readFileSync(`${process.cwd()}/src/styles/base.css`, 'utf8');

    expect(baseCss).toMatch(
      /\.shop-page__stock-row\[hidden\]\s*\{\s*display:\s*none;\s*\}/,
    );
  });

  it('keeps stock row buy actions unframed in themed buttons', () => {
    const baseCss = readFileSync(`${process.cwd()}/src/styles/base.css`, 'utf8');

    expect(baseCss).toMatch(
      /\.style-button\.shop-page__stock-buy-button\s*\{[^}]*border-image:\s*none;/s,
    );
    expect(baseCss).toMatch(
      /\.shop-page__stock-row\s*\{[^}]*--shop-page-stock-buy-width:\s*86px;/s,
    );
    expect(baseCss).toMatch(
      /\.style-button\.shop-page__stock-buy-button\s*\{[^}]*min-width:\s*var\(--shop-page-stock-buy-width\);/s,
    );
    expect(baseCss).toMatch(
      /:root\[data-style-theme="midnight"\][\s\S]*?\.style-button\.shop-page__stock-buy-button[\s\S]*?\{\s*border-image:\s*none;/,
    );
  });
});
