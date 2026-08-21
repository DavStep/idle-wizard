import { describe, expect, it, vi } from 'vitest';

import { createShop } from './createShop.js';

describe('createShop', () => {
  it('translates current gameplay/backend snapshots without owning rules', async () => {
    const clearStall = vi.fn(() => ({ ok: true }));
    const clearRequestSlot = vi.fn(() => ({ ok: true }));
    const clearListingSlot = vi.fn(() => ({ ok: true }));
    const gameplayActions = {
      buyNpcMarketStockItem: vi.fn(() => ({ ok: true })),
      claimPlayerShopSaleProceeds: vi.fn(() => ({ ok: true })),
      clearPlayerShopRequest: vi.fn(() => ({ ok: true })),
      collectShopCoinOffer: vi.fn(() => ({ ok: true })),
      collectShopDailyCrystalOffer: vi.fn(() => ({ ok: true })),
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
        weeklyOffers: {
          offers: [
            {
              id: 'extraPlot',
              title: 'Extra Plot',
              description: 'Unlocks 1 extra automated plot for 7 days.',
              slotLabel: 'E1',
              priceUsd: 15,
              active: false,
              canPurchase: true,
            },
            {
              id: 'extraCauldron',
              title: 'Extra Cauldron',
              description: 'Unlocks 1 extra automated cauldron for 7 days.',
              slotLabel: 'E1',
              priceUsd: 15,
              active: true,
              canPurchase: false,
              remainingLabel: '6d 2h',
            },
          ],
        },
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
                sellCoin: 2,
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
                batchSize: 2,
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
                itemTypeId: 1,
                itemKey: 'sageSeed',
                itemKind: 'seed',
                itemLabel: 'sage seed',
                quantity: 2,
                priceCoin: 6,
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
                sellCoin: 2,
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
          dailyCrystalOffer: {
            rewardCrystal: 1,
            cooldownRemainingSeconds: 0,
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
      actions: {
        ui: {
          clearStall,
          clearPlayerRequest: clearRequestSlot,
          clearPlayerListing: clearListingSlot,
        },
      },
    });

    expect(model.shop.market).toMatchObject({
      name: 'Small Town Market',
      rank: 2,
    });
    expect(model.shop.traders.stalls[0]).toMatchObject({
      batchLabel: 'x2',
      itemKey: 'sageSeed',
      itemKind: 'seed',
      itemLabel: 'sage seed',
      priceLabel: '4 coin',
      salePriceLabel: '4 coin',
      salePriceResourceKey: 'coin',
      progress: 0.25,
      timerLabel: '45s',
      selected: true,
    });
    expect(model.shop.traders.stalls[0].dialog).toMatchObject({
      title: 'Load Stall',
      range: {
        enabled: true,
        tone: 'yellow',
        min: 0,
        max: 10,
        step: 1,
        value: 2,
        tutorialTargetValue: 1,
      },
      summaryRows: [
        {
          itemKey: 'sageSeed',
          itemKind: 'seed',
          quantityLabel: 'x2',
          label: 'Current',
          value: 'Sage Seed',
        },
      ],
    });
    expect(model.shop.traders.stalls[0].dialog.items[0]).toMatchObject({
      label: 'Sage Seed',
      detail: '8 Available',
      itemKey: 'sageSeed',
      itemKind: 'seed',
      value: '2 coin',
      valueIconResourceKey: 'coin',
      notification: true,
      semanticId: 'shop.stall.1.item.sageSeed',
      tutorialId: 'shop:sell:sageSeed',
    });
    expect(model.shop.traders.stalls[0].dialog.actions[0]).toMatchObject({
      label: 'Mark x2',
      enabled: false,
      semanticId: 'shop.stall.1.mark',
      tutorialId: 'shop:sell:mark',
    });
    expect(model.shop.traders.stalls[0].dialog.actions).toMatchObject([
      { label: 'Mark x2', variant: 'green' },
      { label: 'Clear', variant: 'red' },
    ]);
    expect(model.shop.traders.stalls[0].dialog.tabs[0]).toMatchObject({
      label: 'Seeds',
      notification: true,
      semanticId: 'shop.stall.1.tab.seed',
      tutorialId: 'shop:sell:tab:seed',
    });
    expect(model.shop.players.requests.slots[0]).toMatchObject({
      itemLabel: 'sage seed',
      quantityLabel: '2',
      value: '5 coin',
      priceLabel: '5 coin',
      priceResourceKey: 'coin',
      selected: true,
    });
    expect(model.shop.players.market.slots[0]).toMatchObject({
      itemLabel: 'sage seed',
      selected: true,
    });

    model.shop.traders.stalls[0].cancelAction();
    model.shop.players.requests.slots[0].cancelAction();
    model.shop.players.market.slots[0].cancelAction();
    expect(clearStall).toHaveBeenCalledWith(1);
    expect(clearRequestSlot).toHaveBeenCalledWith(1);
    expect(clearListingSlot).toHaveBeenCalledWith(1);
    expect(model.shop.players.market).toMatchObject({
      proceedsLabel: 'claim (12 coin)',
      proceedsValueLabel: '12 coin',
      browseNotification: true,
    });
    expect(model.shop.crystals.coinOffer).toMatchObject({
      rewardLabel: '100 coin',
      actionLabel: 'collect',
      claimCadence: 'Claim every 2 hours',
      notification: true,
    });
    expect(model.shop.crystals.dailyCrystalOffer).toMatchObject({
      rewardLabel: '1 amber',
      actionLabel: 'free',
      claimCadence: 'Claim every 24 hours',
      notification: true,
    });
    expect(model.shop.crystals.weeklyOffers).toEqual([
      expect.objectContaining({
        id: 'extraPlot',
        description: 'Unlocks 1 extra automated plot for 7 days.',
        priceLabel: '$15.00',
        slotLabel: 'E1',
      }),
      expect.objectContaining({
        id: 'extraCauldron',
        active: true,
        description: 'Unlocks 1 extra automated cauldron for 7 days.',
        priceLabel: '$15.00',
        remainingLabel: '6d 2h',
      }),
    ]);
    expect(model.shop.crystals.offers).toHaveLength(12);
    expect(model.shop.crystals.offers[0]).toMatchObject({
      resourceKey: 'crystal',
      amount: 1,
      title: 'Amber Pouch',
      priceLabel: '$4.99',
    });
    expect(model.shop.crystals.offers[6]).toMatchObject({
      resourceKey: 'amethyst',
      amount: 100,
      title: 'Amethyst Pouch',
      priceLabel: '$4.99',
    });
    expect(model.shop.crystals.offers.map(({ title }) => title)).toEqual([
      'Amber Pouch',
      'Amber Bag',
      'Amber Pile',
      'Amber Chest',
      'Amber Trove',
      'Amber Hoard',
      'Amethyst Pouch',
      'Amethyst Bag',
      'Amethyst Pile',
      'Amethyst Chest',
      'Amethyst Trove',
      'Amethyst Hoard',
    ]);
    expect(model.shop.dialogs.ledger.items[0]).toMatchObject({
      label: 'Sage Seed',
      detail: 'stock 4 · buyers 6',
      value: '3 coin',
      stockLabel: '4',
      buyersLabel: '6',
      buyPriceLabel: '3 coin',
      buyPriceResourceKey: 'coin',
      sellPriceLabel: '2 coin',
      sellPriceResourceKey: 'coin',
      itemKey: 'sageSeed',
      itemKind: 'seed',
      semanticId: 'shop.ledger.item.sageSeed',
    });
    expect(model.shop.dialogs.ledger).toMatchObject({
      title: 'Market Ledger',
      tabs: [
        expect.objectContaining({
          id: 'seed',
          label: 'Seeds',
          selected: true,
        }),
      ],
    });
    expect(model.shop.dialogs.market.items[0]).toMatchObject({
      id: 'listing-1',
      semanticId: 'shop.market.listing.listing-1',
    });
    expect(model.shop.dialogs.support).toEqual({
      title: 'Support',
      message:
        'Thank you for trying to support the project but the transactions are not yet available <3',
    });

    model.shop.dialogs.ledger.items[0].action();
    expect(gameplayActions.buyNpcMarketStockItem).toHaveBeenCalledWith(
      1,
      1,
    );

    await model.actions.clearPlayerRequest();
    expect(clearRequestSlot).toHaveBeenNthCalledWith(2);
    expect(playerShopActions.clearSlotRequest).not.toHaveBeenCalled();
    expect(
      gameplayActions.clearPlayerShopRequest,
    ).not.toHaveBeenCalled();

    await model.actions.claimPlayerMarketProceeds();
    expect(playerShopActions.claimProceeds).toHaveBeenCalledTimes(1);
    expect(
      gameplayActions.claimPlayerShopSaleProceeds,
    ).toHaveBeenCalledWith(12);

    model.actions.collectCoinOffer();
    expect(gameplayActions.collectShopCoinOffer).toHaveBeenCalledTimes(
      1,
    );
    model.actions.collectDailyCrystalOffer();
    expect(
      gameplayActions.collectShopDailyCrystalOffer,
    ).toHaveBeenCalledTimes(1);
  });

  it('projects player-centered ledger facts and honest unavailable states', () => {
    const ledger = createShop({
      gameplaySnapshot: {
        playerLevel: { currentLevel: 4 },
        research: {
          completedResearchIds: [
            'unlockSeed:sageSeed',
            'unlockSeed:mintSeed',
          ],
        },
        shop: {
          stock: {
            sellKinds: [{ kind: 'seed', label: 'seeds' }],
            items: [
              {
                itemTypeId: 1,
                key: 'sageSeed',
                kind: 'seed',
                label: 'sage seed',
                stock: 0,
                npcNeed: 1_000,
                buyCoin: 0,
                sellCoin: 2,
                tradedHere: true,
              },
              {
                itemTypeId: 2,
                key: 'mintSeed',
                kind: 'seed',
                label: 'mint seed',
                stock: null,
                npcNeed: null,
                buyCoin: null,
                sellCoin: null,
                tradedHere: false,
                requiredMarket: {
                  name: 'City Bazaar',
                  rank: 2,
                },
              },
            ],
          },
        },
      },
    }).shop.dialogs.ledger;

    expect(ledger.items).toMatchObject([
      {
        label: 'Sage Seed',
        stockLabel: '0',
        buyersLabel: '1,000',
        buyPriceLabel: 'Unavailable',
        buyPriceResourceKey: null,
        sellPriceLabel: '2 coin',
        sellPriceResourceKey: 'coin',
        enabled: false,
        disabled: false,
      },
      {
        label: 'Mint Seed',
        availabilityLabel: 'Trades at City Bazaar',
        requiredMarketRank: 2,
        enabled: false,
        disabled: true,
      },
    ]);
  });

  it('keeps the Player Market filter section visible and applies all three criteria', () => {
    const uiActions = {
      applyMarketFilters: vi.fn(),
      clearMarketFilters: vi.fn(),
      openMarketFilters: vi.fn(),
      selectMarketBrowseTab: vi.fn(),
      setMarketFilterDraft: vi.fn(),
    };
    const market = createShop({
      playerShopSnapshot: {
        connected: true,
        listings: [
          {
            listingKey: 'sage-mira',
            username: 'mira',
            itemKey: 'sageSeed',
            itemLabel: 'sage seed',
            itemKind: 'seed',
            quantity: 2,
            priceCoin: 8,
          },
          {
            listingKey: 'sage-rowan',
            username: 'rowan',
            itemKey: 'sageSeed',
            itemLabel: 'sage seed',
            itemKind: 'seed',
            quantity: 4,
            priceCoin: 4,
          },
          {
            listingKey: 'mint-mira',
            username: 'mira',
            itemKey: 'mintSeed',
            itemLabel: 'mint seed',
            itemKind: 'seed',
            quantity: 1,
            priceCoin: 12,
          },
        ],
      },
      actions: { ui: uiActions },
      uiState: {
        marketBrowseTab: 'selling',
        marketFiltersOpen: false,
        marketFilterDraft: {
          item: 'sage',
          minPrice: '6',
          username: 'mir',
        },
        marketFilterApplied: {
          item: 'SAGE',
          minPrice: '6',
          username: 'MIR',
        },
      },
    }).shop.dialogs.market;

    expect(market).toMatchObject({
      title: 'Player Market',
      status: '1 Matching Offer',
      fields: [
        { id: 'item', label: 'Item', value: 'sage' },
        { id: 'minPrice', label: 'Min Price', value: '6' },
        { id: 'username', label: 'Username', value: 'mir' },
      ],
      actions: [
        { id: 'clearFilters', label: 'Clear' },
        { id: 'applyFilters', label: 'Apply Filter' },
      ],
      tabs: [
        { id: 'selling', label: 'Selling', selected: true },
        { id: 'buying', label: 'Buying', selected: false },
      ],
    });
    expect(market.items).toMatchObject([
      {
        id: 'sage-mira',
        username: 'mira',
        itemLabel: 'Sage Seed',
        quantityLabel: 'x2',
        priceLabel: '8 coin',
        valueResourceKey: 'coin',
        actionLabel: 'Buy',
      },
    ]);

    market.fields[0].onChange('mint');
    expect(uiActions.setMarketFilterDraft).toHaveBeenCalledWith(
      'item',
      'mint',
    );
    market.actions[1].action();
    expect(uiActions.applyMarketFilters).toHaveBeenCalledTimes(1);
    market.tabs[1].action();
    expect(uiActions.selectMarketBrowseTab).toHaveBeenCalledWith(
      'buying',
    );
  });

  it('projects a selected offer into a seller section and quantity-based Buy dialog', () => {
    const setMarketBuyQuantity = vi.fn();
    const confirmMarketBuy = vi.fn();
    const model = createShop({
      gameplaySnapshot: { coin: { current: 100 } },
      playerInfoSnapshot: {
        players: [
          {
            identity: 'seller-1',
            username: 'Mira',
            allianceName: 'Night Owls',
            allianceTag: 'OWL',
            allianceTagColor: 'violet',
            character: 'mira',
            frame: 'violet',
          },
        ],
      },
      playerShopSnapshot: {
        connected: true,
        listings: [
          {
            listingKey: 'listing-1',
            sellerIdentity: 'seller-1',
            username: 'Mira',
            itemKey: 'sageSeed',
            itemLabel: 'sage seed',
            itemKind: 'seed',
            quantity: 12,
            priceCoin: 8,
          },
        ],
      },
      actions: {
        ui: { confirmMarketBuy, setMarketBuyQuantity },
      },
      uiState: {
        marketBuyListingKey: 'listing-1',
        marketBuyQuantity: 3,
      },
    });

    expect(model.shop.dialogs.market.items[0]).toMatchObject({
      username: 'Mira',
      allianceTag: 'OWL',
      character: 'mira',
      frame: 'violet',
      actionLabel: 'Buy',
    });
    expect(model.shop.dialogs.buy).toMatchObject({
      title: 'Buy Offer',
      seller: {
        username: 'Mira',
        allianceTag: 'OWL',
        detail: 'Night Owls',
      },
      featuredItem: {
        label: 'Sage Seed',
        detail: 'Buying x3',
        quantityLabel: 'x3',
      },
      range: { min: 1, max: 12, value: 3 },
      totalLabel: '24 coin',
      actions: [{ id: 'buy', label: 'Buy', enabled: true }],
    });

    model.shop.dialogs.buy.range.onChange(5);
    expect(setMarketBuyQuantity).toHaveBeenCalledWith(5);
    model.shop.dialogs.buy.actions[0].action();
    expect(confirmMarketBuy).toHaveBeenCalledWith(
      expect.objectContaining({ listingKey: 'listing-1' }),
      3,
    );
  });

  it('shows only unlocked stall tabs and researched stall items', () => {
    const gameplaySnapshot = {
      playerLevel: { currentLevel: 1 },
      research: {
        completedResearchIds: ['unlockSeed:sageSeed'],
      },
      shop: {
        shelf: {
          sellKinds: [
            { kind: 'seed', label: 'seeds' },
            { kind: 'herb', label: 'herbs' },
            { kind: 'potion', label: 'potions' },
          ],
          sellItems: [
            {
              itemTypeId: 1,
              key: 'sageSeed',
              kind: 'seed',
              label: 'sage seed',
              quantity: 0,
            },
            {
              itemTypeId: 2,
              key: 'mintSeed',
              kind: 'seed',
              label: 'mint seed',
              quantity: 4,
            },
            {
              itemTypeId: 1001,
              key: 'sageHerb',
              kind: 'herb',
              label: 'sage',
              quantity: 0,
            },
            {
              itemTypeId: 2001,
              key: 'manaTonic',
              kind: 'potion',
              label: 'mana tonic',
              quantity: 0,
            },
          ],
          slots: [
            {
              slotNumber: 1,
              sellItemTypeId: null,
              futureItemTypeId: null,
              loadedQuantity: 0,
            },
          ],
        },
      },
    };

    const createStall = () =>
      createShop({ gameplaySnapshot }).shop.traders.stalls[0];
    const createDialog = () => createStall().dialog;

    expect(createStall()).toMatchObject({
      itemLabel: 'empty stand',
      priceLabel: 'select',
      priceVariant: 'green',
    });
    expect(createDialog().tabs.map((tab) => tab.id)).toEqual(['seed']);
    expect(createDialog().items.map((item) => item.itemKey)).toEqual(['sageSeed']);
    expect(createDialog().summaryRows[0]).toMatchObject({
      value: 'Empty',
      quantityLabel: '',
    });
    expect(createDialog().range.enabled).toBe(false);
    expect(createDialog().items[0].selected).toBe(false);

    gameplaySnapshot.playerLevel.currentLevel = 2;
    expect(createDialog().tabs.map((tab) => tab.id)).toEqual(['seed', 'herb']);

    gameplaySnapshot.playerLevel.currentLevel = 4;
    expect(createDialog().tabs.map((tab) => tab.id)).toEqual([
      'seed',
      'herb',
      'potion',
    ]);
  });

  it('notifies only sell-ready Load Stall rows and their category tabs', () => {
    const gameplaySnapshot = {
      playerLevel: { currentLevel: 4 },
      research: {
        completedResearchIds: [
          'unlockSeed:sageSeed',
          'unlockSeed:mintSeed',
          'unlockHerb:sageHerb',
        ],
      },
      shop: {
        shelf: {
          sellKinds: [
            { kind: 'seed', label: 'seeds' },
            { kind: 'herb', label: 'herbs' },
          ],
          sellItems: [
            {
              itemTypeId: 1,
              key: 'sageSeed',
              kind: 'seed',
              label: 'sage seed',
              quantity: 3,
              sellCoin: 2,
            },
            {
              itemTypeId: 2,
              key: 'mintSeed',
              kind: 'seed',
              label: 'mint seed',
              quantity: 0,
              sellCoin: 4,
            },
            {
              itemTypeId: 1001,
              key: 'sageHerb',
              kind: 'herb',
              label: 'sage',
              quantity: 2,
              sellCoin: null,
            },
          ],
          slots: [{ slotNumber: 1 }],
        },
      },
    };

    const dialog =
      createShop({ gameplaySnapshot }).shop.traders.stalls[0].dialog;

    expect(dialog.items).toMatchObject([
      {
        itemKey: 'sageSeed',
        value: '2 coin',
        valueIconResourceKey: 'coin',
        notification: true,
      },
      {
        itemKey: 'mintSeed',
        value: '4 coin',
        valueIconResourceKey: 'coin',
        notification: false,
      },
    ]);
    expect(dialog.tabs).toMatchObject([
      { id: 'seed', notification: true },
      { id: 'herb', notification: false },
    ]);
  });

  it('projects the orange NPC listing notification onto each actionable empty stall Select action', () => {
    const stalls = createShop({
      gameplaySnapshot: {
        shop: {
          shelf: {
            sellKinds: [{ kind: 'seed', label: 'seeds' }],
            sellItems: [],
            slots: [
              { slotNumber: 1, unlocked: true },
              {
                slotNumber: 2,
                unlocked: true,
                futureItemTypeId: 1,
              },
              { slotNumber: 3, unlocked: false },
            ],
          },
        },
      },
      notificationSnapshot: {
        active: true,
        tone: 'orange',
        children: {
          npcListing: 'orange',
        },
      },
    }).shop.traders.stalls;

    expect(stalls).toMatchObject([
      {
        slotNumber: 1,
        notification: true,
        notificationTone: 'orange',
      },
      {
        slotNumber: 2,
        notification: false,
      },
      {
        slotNumber: 3,
        notification: false,
      },
    ]);
  });

  it('reuses the Load Stall picker flow for player requests and slider-based sales', () => {
    const selectRequestItem = vi.fn();
    const setRequestDraftField = vi.fn();
    const selectRequestItemKind = vi.fn();
    const selectListingItem = vi.fn();
    const setListingDraftField = vi.fn();
    const selectListingItemKind = vi.fn();
    const gameplaySnapshot = {
      playerLevel: { currentLevel: 4 },
      research: {
        completedResearchIds: [
          'unlockSeed:sageSeed',
          'unlockHerb:sageHerb',
        ],
      },
      shop: {
        shelf: {
          sellKinds: [
            { kind: 'seed', label: 'seeds' },
            { kind: 'herb', label: 'herbs' },
          ],
          sellItems: [
            {
              itemTypeId: 1,
              key: 'sageSeed',
              kind: 'seed',
              label: 'sage seed',
              quantity: 12,
            },
            {
              itemTypeId: 1001,
              key: 'sageHerb',
              kind: 'herb',
              label: 'sage',
              quantity: 4,
            },
          ],
        },
        playerRequests: {
          slots: [{ slotNumber: 1, unlocked: true }],
        },
        playerShelf: {
          sellKinds: [
            { kind: 'seed', label: 'seeds' },
            { kind: 'herb', label: 'herbs' },
          ],
          sellItems: [
            {
              itemTypeId: 1,
              key: 'sageSeed',
              kind: 'seed',
              label: 'sage seed',
              quantity: 12,
            },
            {
              itemTypeId: 1001,
              key: 'sageHerb',
              kind: 'herb',
              label: 'sage',
              quantity: 4,
            },
          ],
          slots: [{ slotNumber: 1, unlocked: true }],
        },
      },
    };
    const model = createShop({
      gameplaySnapshot,
      uiState: {
        requestDraftBySlot: {
          1: {
            itemTypeId: 1,
            itemKind: 'seed',
            quantity: 30,
            priceCoin: 7,
          },
        },
        requestItemKindBySlot: { 1: 'seed' },
        listingDraftBySlot: {
          1: {
            itemTypeId: 1,
            itemKind: 'seed',
            quantity: 5,
            priceCoin: 9,
          },
        },
        listingItemKindBySlot: { 1: 'seed' },
      },
      actions: {
        ui: {
          selectRequestItem,
          setRequestDraftField,
          selectRequestItemKind,
          selectListingItem,
          setListingDraftField,
          selectListingItemKind,
        },
      },
    });

    const request = model.shop.players.requests.slots[0].dialog;
    expect(request).toMatchObject({
      title: 'Request',
      summaryRows: [
        {
          label: 'Current',
          value: 'Sage Seed',
          itemKey: 'sageSeed',
        },
      ],
      fields: [
        {
          id: 'priceCoin',
          label: 'Coins Per Item',
          value: 7,
        },
        {
          id: 'quantity',
          label: 'Max Quantity',
          value: 30,
        },
      ],
      actions: [
        {
          label: 'Place Request',
          variant: 'green',
          enabled: true,
        },
      ],
    });
    expect(request.items).toEqual([
      expect.objectContaining({
        label: 'Sage Seed',
        detail: '12 Available',
        selected: true,
      }),
    ]);
    expect(request.tabs).toEqual([
      expect.objectContaining({ id: 'seed', selected: true }),
      expect.objectContaining({ id: 'herb', selected: false }),
    ]);

    const listing = model.shop.players.market.slots[0].dialog;
    expect(listing).toMatchObject({
      title: 'Sell',
      summaryRows: [
        {
          label: 'Current',
          value: 'Sage Seed',
          quantityLabel: 'x5',
          itemKey: 'sageSeed',
        },
      ],
      range: {
        min: 1,
        max: 12,
        step: 1,
        value: 5,
        tone: 'yellow',
      },
      fields: [
        {
          id: 'priceCoin',
          label: 'Coins Per Item',
          value: 9,
        },
      ],
      actions: [
        {
          id: 'clear',
          label: 'Clear',
          variant: 'red',
          enabled: true,
          layoutWeight: 1,
        },
        {
          id: 'list',
          label: 'Sell',
          variant: 'green',
          enabled: true,
          layoutWeight: 2,
        },
      ],
    });
    expect(listing.items).toEqual([
      expect.objectContaining({
        label: 'Sage Seed',
        detail: '12 Available',
        selected: true,
      }),
    ]);

    request.fields[0].onChange('11');
    request.tabs[1].action();
    listing.range.onChange(8);
    listing.tabs[1].action();
    request.items[0].action();
    listing.items[0].action();

    expect(setRequestDraftField).toHaveBeenCalledWith(
      1,
      'priceCoin',
      '11',
    );
    expect(selectRequestItemKind).toHaveBeenCalledWith(1, 'herb');
    expect(setListingDraftField).toHaveBeenCalledWith(
      1,
      'quantity',
      8,
    );
    expect(selectListingItemKind).toHaveBeenCalledWith(1, 'herb');
    expect(selectRequestItem).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ itemTypeId: 1 }),
    );
    expect(selectListingItem).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ itemTypeId: 1 }),
    );
  });

  it('unlocks and switches Ledger tabs with the matching room features', () => {
    const selectLedgerKind = vi.fn();
    const gameplaySnapshot = {
      playerLevel: { currentLevel: 1 },
      shop: {
        shelf: {
          sellKinds: [
            { kind: 'seed', label: 'seeds' },
            { kind: 'herb', label: 'herbs' },
            { kind: 'potion', label: 'potions' },
          ],
          sellItems: [
            {
              itemTypeId: 1,
              key: 'sageSeed',
              kind: 'seed',
              label: 'sage seed',
              buyCoin: 3,
              stock: 4,
              npcNeed: 6,
            },
            {
              itemTypeId: 1001,
              key: 'sageHerb',
              kind: 'herb',
              label: 'sage',
              buyCoin: 4,
              stock: 3,
              npcNeed: 5,
            },
            {
              itemTypeId: 2001,
              key: 'manaTonic',
              kind: 'potion',
              label: 'mana tonic',
              buyCoin: 8,
              stock: 2,
              npcNeed: 4,
            },
          ],
        },
      },
    };
    const createLedger = (ledgerKind = 'seed') =>
      createShop({
        gameplaySnapshot,
        actions: { ui: { selectLedgerKind } },
        uiState: { ledgerKind },
      }).shop.dialogs.ledger;

    expect(createLedger().tabs.map((tab) => tab.label)).toEqual([
      'Seeds',
    ]);

    gameplaySnapshot.playerLevel.currentLevel = 2;
    const herbLedger = createLedger('herb');
    expect(herbLedger.tabs.map((tab) => tab.label)).toEqual([
      'Seeds',
      'Herbs',
    ]);
    expect(herbLedger.items).toEqual([
      expect.objectContaining({
        label: 'Sage',
        itemKey: 'sageHerb',
        itemKind: 'herb',
      }),
    ]);
    herbLedger.tabs[0].action();
    expect(selectLedgerKind).toHaveBeenCalledWith('seed');

    gameplaySnapshot.playerLevel.currentLevel = 4;
    expect(createLedger('potion').tabs.map((tab) => tab.label)).toEqual([
      'Seeds',
      'Herbs',
      'Potions',
    ]);
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

  it('preserves item identity for market and trade-history dialog icons', () => {
    const dialogs = createShop({
      playerShopSnapshot: {
        connected: true,
        listings: [
          {
            listingKey: 'listing-1',
            itemKey: 'sageSeed',
            itemKind: 'seed',
            itemLabel: 'sage seed',
            quantity: 2,
            priceCoin: 3,
          },
        ],
        ownTradeHistory: [
          {
            tradeId: 'trade-1',
            itemKey: 'mintSeed',
            itemKind: 'seed',
            itemLabel: 'mint seed',
            quantity: 1,
            totalPriceCoin: 4,
          },
        ],
      },
    }).shop.dialogs;

    expect(dialogs.market.items[0]).toMatchObject({
      itemKey: 'sageSeed',
      itemKind: 'seed',
    });
    expect(dialogs.tradeHistory.items[0]).toMatchObject({
      itemKey: 'mintSeed',
      itemKind: 'seed',
    });
  });

  it('projects the next locked trader stall as a direct coin purchase', () => {
    const buyShopShelfSlot = vi.fn(() => ({
      ok: true,
      cost: 50,
      slotNumber: 1,
    }));
    const model = createShop({
      gameplaySnapshot: {
        coin: { current: 50 },
        shop: {
          shelf: {
            nextSlotNumber: 1,
            nextSlotCost: 50,
            nextSlotLockedByLevel: false,
            slots: [{ slotNumber: 1, unlocked: false }],
          },
        },
      },
      gameplayActions: { buyShopShelfSlot },
    });

    expect(model.shop.traders.stalls[0]).toMatchObject({
      slotNumber: 1,
      buySlot: true,
      costCoin: 50,
      affordable: true,
      enabled: true,
      selected: false,
    });

    expect(model.shop.traders.stalls[0].action()).toEqual({
      ok: true,
      cost: 50,
      slotNumber: 1,
    });
    expect(buyShopShelfSlot).toHaveBeenCalledOnce();
  });

  it('projects shared shortage feedback for an unaffordable trader stall', () => {
    const showCurrencyShortage = vi.fn(() => true);
    const model = createShop({
      gameplaySnapshot: {
        coin: { current: 20 },
        shop: {
          shelf: {
            nextSlotNumber: 1,
            nextSlotCost: 50,
            nextSlotLockedByLevel: false,
            slots: [{ slotNumber: 1, unlocked: false }],
          },
        },
      },
      gameplayActions: { buyShopShelfSlot: vi.fn() },
      actions: { ui: { showCurrencyShortage } },
    });

    const stall = model.shop.traders.stalls[0];
    expect(stall.affordable).toBe(false);
    expect(stall.insufficientAction()).toBe(true);
    expect(showCurrencyShortage).toHaveBeenCalledWith({
      cost: 50,
      resource: 'coin',
    });
  });
});
