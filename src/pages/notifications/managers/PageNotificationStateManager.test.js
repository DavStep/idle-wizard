import { describe, expect, it } from 'vitest';

import { PageNotificationStateManager } from './PageNotificationStateManager.js';

function createSnapshot() {
  return {
    mana: {
      current: 0,
      cap: 50,
      perSecond: 1,
    },
    coin: { current: 0 },
    seedSummoning: { canSummon: false },
    tasks: {
      level: {
        tasks: [],
      },
    },
    brewing: {
      herbs: [],
      canAddIngredient: false,
      canBrew: false,
      canStartBottling: false,
      canCollectPotion: false,
      activeBrew: null,
    },
    research: {
      completedResearchIds: [],
      boxes: [],
      tabs: [],
    },
    shop: {
      shelf: {
        nextSlotNumber: 2,
        nextSlotCost: 1,
        nextSlotLockedByLevel: false,
        sellItems: [],
        slots: [],
      },
      playerShelf: {
        nextSlotNumber: 2,
        nextSlotCost: 1,
        nextSlotLockedByLevel: false,
        sellItems: [],
        slots: [],
      },
    },
    garden: {
      plot: {
        nextTileNumber: 2,
        nextTileCost: 1,
        nextTileLockedByLevel: false,
        tiles: [
          {
            tileNumber: 1,
            unlocked: true,
            selectedSeedItemTypeId: null,
            phase: 'empty',
          },
          {
            tileNumber: 2,
            unlocked: false,
            selectedSeedItemTypeId: null,
            phase: 'empty',
          },
        ],
      },
      seeds: [
        {
          itemTypeId: 1,
          key: 'sageSeed',
          label: 'sage seed',
          kind: 'seed',
          quantity: 0,
        },
      ],
    },
  };
}

describe('PageNotificationStateManager', () => {
  it('handles missing startup snapshots before gameplay publishes', () => {
    const manager = new PageNotificationStateManager();

    expect(manager.getSnapshot(null, { playerShop: null })).toEqual({
      active: false,
      pages: {
        brewing: { active: false, children: { herbs: false, action: false, cauldron: false } },
        garden: { active: false, children: { plots: false } },
        workshop: {
          active: false,
          children: { seeds: false, tasks: false, personalTasks: false, alliance: false },
        },
        research: { active: false, children: { research: false } },
        guild: { active: false, children: {} },
        shop: {
          active: false,
          children: {
            npcStand: false,
            npcListing: false,
            playerStand: false,
            playerListing: false,
            playerProceeds: false,
            playerMarket: false,
            crystals: false,
          },
        },
      },
    });
  });

  it('rolls plantable garden tiles up to the garden page', () => {
    const manager = new PageNotificationStateManager();
    const snapshot = createSnapshot();

    expect(manager.getSnapshot(snapshot).pages.garden.active).toBe(false);

    snapshot.garden.seeds[0].quantity = 1;

    expect(manager.getSnapshot(snapshot).pages.garden).toMatchObject({
      active: true,
      children: {
        plots: true,
      },
    });
  });

  it('keeps summon seed notifications immediate through early levels', () => {
    const manager = new PageNotificationStateManager();
    const snapshot = createSnapshot();

    snapshot.seedSummoning.canSummon = true;
    snapshot.mana.current = 10;
    snapshot.mana.cap = 100;
    snapshot.tasks.currentLevel = 2;

    expect(manager.getSnapshot(snapshot).pages.workshop).toMatchObject({
      active: true,
      tone: 'red',
      children: {
        seeds: true,
      },
    });
  });

  it('suppresses summon seed notifications after early levels until mana is capped', () => {
    const manager = new PageNotificationStateManager();
    const snapshot = createSnapshot();

    snapshot.seedSummoning.canSummon = true;
    snapshot.mana.current = 10;
    snapshot.mana.cap = 150;
    snapshot.tasks.currentLevel = 3;

    expect(manager.getSnapshot(snapshot).pages.workshop).toMatchObject({
      active: false,
      children: {
        seeds: false,
      },
    });

    snapshot.mana.current = 150;

    expect(manager.getSnapshot(snapshot).pages.workshop).toMatchObject({
      active: true,
      tone: 'orange',
      children: {
        seeds: 'orange',
      },
    });
  });

  it('rolls claimable alliance quests up to the workshop page after alliance unlock', () => {
    const manager = new PageNotificationStateManager();
    const snapshot = createSnapshot();
    const tradeAlliance = {
      ownAlliance: {
        allianceId: 'alliance-1',
      },
      ownMember: {
        memberIdentity: 'self',
      },
      quests: [
        {
          allianceId: 'alliance-1',
          questId: 'allianceIncomeEasy',
          dayKey: '2026-W24',
          target: 500,
          progress: 500,
          minContribution: 25,
        },
      ],
      contributions: [
        {
          allianceId: 'alliance-1',
          questId: 'allianceIncomeEasy',
          dayKey: '2026-W24',
          contributorIdentity: 'self',
          contribution: 25,
        },
      ],
    };

    snapshot.tasks.currentLevel = 3;

    expect(manager.getSnapshot(snapshot, { tradeAlliance }).pages.workshop).toMatchObject({
      active: false,
      children: {
        alliance: false,
      },
    });

    snapshot.tasks.currentLevel = 4;

    expect(manager.getSnapshot(snapshot, { tradeAlliance }).pages.workshop).toMatchObject({
      active: true,
      tone: 'red',
      children: {
        alliance: true,
      },
    });
  });

  it('rolls an affordable guild charter up to the guild page', () => {
    const manager = new PageNotificationStateManager();
    const snapshot = createSnapshot();

    snapshot.guild = {
      unlocked: true,
      created: false,
      canCreate: false,
      charterCostCoin: 1500,
      currentCoin: 1499,
    };

    expect(manager.getSnapshot(snapshot).pages.guild).toMatchObject({
      active: false,
      children: {},
    });

    snapshot.guild.canCreate = true;
    snapshot.guild.currentCoin = 1500;

    expect(manager.getSnapshot(snapshot).pages.guild).toMatchObject({
      active: true,
      tone: 'red',
      children: {
        charter: true,
      },
    });

    snapshot.guild.created = true;
    snapshot.guild.notifications = {
      active: false,
    };

    expect(manager.getSnapshot(snapshot).pages.guild).toMatchObject({
      active: false,
      children: {},
    });
  });

  it('rolls claimable personal task rewards up to the workshop page', () => {
    const manager = new PageNotificationStateManager();
    const snapshot = createSnapshot();

    snapshot.personalTasks = {
      unlocked: true,
      claimableRewards: 1,
      daily: {
        claimableRewards: 1,
        rewards: [
          {
            claimable: true,
          },
        ],
      },
      weekly: {
        claimableRewards: 0,
        rewards: [],
      },
    };

    expect(manager.getSnapshot(snapshot).pages.workshop).toMatchObject({
      active: true,
      tone: 'red',
      children: {
        personalTasks: true,
      },
    });
  });

  it('does not roll non-claimable personal task milestones up to the workshop page', () => {
    const manager = new PageNotificationStateManager();
    const snapshot = createSnapshot();

    snapshot.personalTasks = {
      unlocked: true,
      claimableRewards: 1,
      daily: {
        claimableRewards: 1,
        rewards: [
          {
            claimable: false,
          },
        ],
      },
      weekly: {
        claimableRewards: 0,
        rewards: [],
      },
    };

    expect(manager.getSnapshot(snapshot).pages.workshop.children.personalTasks).toBe(
      false,
    );
  });

  it('rolls ready garden harvests and affordable plot buys up to the garden page', () => {
    const manager = new PageNotificationStateManager();
    const snapshot = createSnapshot();

    snapshot.garden.plot.tiles[0].phase = 'ready';
    expect(manager.getSnapshot(snapshot).pages.garden.active).toBe(true);

    snapshot.garden.plot.tiles[0].phase = 'empty';
    snapshot.coin.current = 1;
    expect(manager.getSnapshot(snapshot).pages.garden.active).toBe(true);
  });

  it('rolls per-cauldron brewing work up to the brewing page', () => {
    const manager = new PageNotificationStateManager();
    const snapshot = createSnapshot();

    snapshot.brewing.herbs = [
      {
        itemTypeId: 2,
        key: 'sageHerb',
        label: 'sage',
        kind: 'herb',
        quantity: 1,
        availableQuantity: 1,
      },
    ];
    snapshot.brewing.cauldrons = [
      {
        cauldronIndex: 0,
        canAddIngredient: false,
        canBrew: false,
        canStartBottling: false,
        activeBrew: {
          canStartBottling: false,
        },
      },
      {
        cauldronIndex: 1,
        canAddIngredient: true,
        canBrew: false,
        canStartBottling: false,
        activeBrew: null,
      },
    ];

    expect(manager.getSnapshot(snapshot).pages.brewing).toMatchObject({
      active: true,
      tone: 'red',
      children: {
        herbs: true,
        action: false,
      },
    });

    snapshot.brewing.cauldrons[1].canAddIngredient = false;
    snapshot.brewing.cauldrons[1].activeBrew = {
      label: 'calming draught',
      canStartBottling: true,
    };

    expect(manager.getSnapshot(snapshot).pages.brewing).toMatchObject({
      active: true,
      tone: 'red',
      children: {
        herbs: false,
        action: true,
      },
    });
  });

  it('does not mark empty player market stands as player-market notifications', () => {
    const manager = new PageNotificationStateManager();
    const snapshot = createSnapshot();

    snapshot.shop.playerShelf.sellItems = [
      {
        itemTypeId: 1,
        key: 'sageSeed',
        label: 'sage seed',
        kind: 'seed',
        quantity: 1,
      },
    ];
    snapshot.shop.playerShelf.slots = [
      {
        slotNumber: 1,
        unlocked: true,
        itemTypeId: null,
      },
    ];

    expect(
      manager.getSnapshot(snapshot, { playerShop: { connected: true } }).pages.shop,
    ).toMatchObject({
      active: false,
      children: {
        playerListing: false,
      },
    });
  });

  it('marks empty NPC demand stands as lower-priority market notifications', () => {
    const manager = new PageNotificationStateManager();
    const snapshot = createSnapshot();

    snapshot.research.completedResearchIds = ['unlockSeed:sageSeed'];
    snapshot.shop.shelf.sellItems = [
      {
        itemTypeId: 1,
        key: 'sageSeed',
        label: 'sage seed',
        kind: 'seed',
        quantity: 1,
      },
    ];
    snapshot.shop.shelf.slots = [
      {
        slotNumber: 1,
        unlocked: true,
        sellItemTypeId: null,
      },
    ];

    expect(manager.getSnapshot(snapshot).pages.shop).toMatchObject({
      active: true,
      tone: 'orange',
      children: {
        npcListing: 'orange',
      },
    });
  });

  it('marks player market only when another listing matches an own request', () => {
    const manager = new PageNotificationStateManager();
    const snapshot = createSnapshot();

    snapshot.coin.current = 10;

    expect(
      manager.getSnapshot(snapshot, {
        playerShop: {
          connected: true,
          listings: [
            {
              listingKey: 'seller:1',
              itemKey: 'mintSeed',
              itemKind: 'seed',
              quantity: 1,
              priceCoin: 3,
            },
          ],
          ownRequests: [
            {
              requestKey: 'self:1',
              itemKey: 'sageSeed',
              itemKind: 'seed',
              quantity: 1,
              priceCoin: 3,
            },
          ],
        },
      }).pages.shop.children.playerMarket,
    ).toBe(false);

    expect(
      manager.getSnapshot(snapshot, {
        playerShop: {
          connected: true,
          listings: [
            {
              listingKey: 'seller:1',
              itemKey: 'sageSeed',
              itemKind: 'seed',
              quantity: 1,
              priceCoin: 3,
            },
          ],
          ownRequests: [
            {
              requestKey: 'self:1',
              itemKey: 'sageSeed',
              itemKind: 'seed',
              quantity: 1,
              priceCoin: 3,
            },
          ],
        },
      }).pages.shop,
    ).toMatchObject({
      active: true,
      tone: 'red',
      children: {
        playerMarket: true,
      },
    });
  });

  it('rolls the market page up to red when any shop action is red', () => {
    const manager = new PageNotificationStateManager();
    const snapshot = createSnapshot();

    snapshot.shop.playerShelf.sellItems = [
      {
        itemTypeId: 1,
        key: 'sageSeed',
        label: 'sage seed',
        kind: 'seed',
        quantity: 1,
      },
    ];
    snapshot.shop.playerShelf.slots = [
      {
        slotNumber: 1,
        unlocked: true,
        itemTypeId: null,
      },
    ];

    expect(
      manager.getSnapshot(snapshot, {
        playerShop: { connected: true, proceedsCoin: 1 },
      }).pages.shop,
    ).toMatchObject({
      active: true,
      tone: 'red',
      children: {
        playerListing: false,
        playerProceeds: true,
      },
    });
  });

  it('rolls ready crystal-tab coin offers up to the market page', () => {
    const manager = new PageNotificationStateManager();
    const snapshot = createSnapshot();

    snapshot.shop.coinOffer = {
      canCollect: true,
    };

    expect(manager.getSnapshot(snapshot).pages.shop).toMatchObject({
      active: true,
      tone: 'red',
      children: {
        crystals: true,
      },
    });

    snapshot.shop.coinOffer.canCollect = false;

    expect(manager.getSnapshot(snapshot).pages.shop.children.crystals).toBe(false);
  });
});
