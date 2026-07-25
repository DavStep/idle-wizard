import { describe, expect, it, vi } from 'vitest';

import { createShop } from './createShop.js';

describe('createShop', () => {
  it('translates current gameplay/backend snapshots without owning rules', async () => {
    const gameplayActions = {
      buyNpcMarketStockItem: vi.fn(() => ({ ok: true })),
      claimPlayerShopSaleProceeds: vi.fn(() => ({ ok: true })),
      clearPlayerShopRequest: vi.fn(() => ({ ok: true })),
      collectShopCoinOffer: vi.fn(() => ({ ok: true })),
      selectShopShelfSlot: vi.fn(() => ({ ok: true })),
      setSelectedShopShelfSlotAllocation: vi.fn(() => ({
        ok: true,
      })),
    };
    const playerShopActions = {
      claimProceeds: vi.fn(async () => ({ ok: true })),
      clearSlotRequest: vi.fn(async () => ({ ok: true })),
    };
    const model = createShop({
      gameplaySnapshot: {
        shop: {
          market: {
            name: 'Small Town Market',
            rank: 2,
          },
          shelf: {
            autoSellSeconds: 60,
            sellKinds: [{ kind: 'seed', label: 'seeds' }],
            sellItems: [
              {
                itemTypeId: 1,
                key: 'sageSeed',
                kind: 'seed',
                label: 'sage seed',
                quantity: 8,
                buyCoin: 3,
                stock: 4,
                npcNeed: 6,
              },
            ],
            slots: [
              {
                slotNumber: 1,
                sellItemTypeId: 1,
                sellKind: 'seed',
                sellKey: 'sageSeed',
                sellLabel: 'sage seed',
                loadedQuantity: 2,
                batchSize: 1,
                sellCoin: 2,
                sellProgressSeconds: 15,
              },
            ],
          },
          playerRequests: {
            slots: [
              {
                slotNumber: 1,
                unlocked: true,
                itemTypeId: 1,
                itemKey: 'sageSeed',
                itemKind: 'seed',
                itemLabel: 'sage seed',
                quantity: 2,
                priceCoin: 5,
              },
            ],
          },
          playerShelf: {
            sellKinds: [{ kind: 'seed', label: 'seeds' }],
            sellItems: [],
            slots: [
              {
                slotNumber: 1,
                unlocked: true,
                itemTypeId: null,
              },
            ],
          },
          stock: {
            sellKinds: [{ kind: 'seed', label: 'seeds' }],
            items: [
              {
                itemTypeId: 1,
                key: 'sageSeed',
                kind: 'seed',
                label: 'sage seed',
                buyCoin: 3,
                stock: 4,
                npcNeed: 6,
              },
            ],
          },
          coinOffer: {
            rewardCoin: 100,
            cooldownRemainingSeconds: 45,
            canCollect: true,
          },
        },
      },
      playerShopSnapshot: {
        connected: true,
        proceedsCoin: 12,
        listings: [
          {
            listingKey: 'listing-1',
            username: 'mira',
            itemLabel: 'sage seed',
            itemKind: 'seed',
            quantity: 2,
            priceCoin: 3,
          },
        ],
        requests: [],
        tradeHistory: [],
      },
      notificationSnapshot: {
        pages: {
          shop: {
            children: {
              playerMarket: 'orange',
            },
          },
        },
      },
      gameplayActions,
      playerShopActions,
    });

    expect(model.shop.market).toMatchObject({
      name: 'Small Town Market',
      rank: 2,
    });
    expect(model.shop.traders.stalls[0]).toMatchObject({
      itemLabel: 'sage seed',
      priceLabel: '2 coin',
      progress: 0.25,
      timerLabel: '45s',
    });
    expect(model.shop.players.requests.slots[0]).toMatchObject({
      itemLabel: 'sage seed (2)',
      value: '5 coin',
    });
    expect(model.shop.players.market).toMatchObject({
      proceedsLabel: 'claim (12 coin)',
      browseNotification: true,
    });
    expect(model.shop.crystals.coinOffer).toMatchObject({
      rewardLabel: '100 coin',
      actionLabel: 'collect',
      notification: true,
    });
    expect(model.shop.dialogs.ledger.items[0]).toMatchObject({
      label: 'sage seed',
      detail: 'stock 4 · buyers 6',
      value: '3 coin',
      semanticId: 'shop.ledger.item.sageSeed',
    });
    expect(model.shop.dialogs.market.items[0]).toMatchObject({
      id: 'listing-1',
      semanticId: 'shop.market.listing.listing-1',
    });

    model.shop.dialogs.ledger.items[0].action();
    expect(gameplayActions.buyNpcMarketStockItem).toHaveBeenCalledWith(
      1,
      1,
    );

    await model.actions.clearPlayerRequest();
    expect(playerShopActions.clearSlotRequest).toHaveBeenCalledWith(1);
    expect(gameplayActions.clearPlayerShopRequest).toHaveBeenCalledWith(
      1,
    );

    await model.actions.claimPlayerMarketProceeds();
    expect(playerShopActions.claimProceeds).toHaveBeenCalledTimes(1);
    expect(
      gameplayActions.claimPlayerShopSaleProceeds,
    ).toHaveBeenCalledWith(12);

    model.actions.collectCoinOffer();
    expect(gameplayActions.collectShopCoinOffer).toHaveBeenCalledTimes(
      1,
    );
  });

  it('adapts raw subscription emissions before binding them', () => {
    let emit;
    const model = createShop({
      gameplaySnapshot: {
        shop: {
          market: { name: 'first', rank: 1 },
        },
      },
      subscribe(listener) {
        emit = listener;
        return () => {};
      },
    });
    const listener = vi.fn();
    model.subscribe(listener);
    emit({
      shop: {
        market: { name: 'second', rank: 3 },
      },
    });

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        shop: expect.objectContaining({
          market: expect.objectContaining({
            name: 'second',
            rank: 3,
          }),
        }),
      }),
    );
  });
});
