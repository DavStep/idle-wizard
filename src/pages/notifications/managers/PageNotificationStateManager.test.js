import { describe, expect, it } from 'vitest';

import { PageNotificationStateManager } from './PageNotificationStateManager.js';

function createSnapshot() {
  return {
    gold: { current: 0 },
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
          label: 'Sage Seed',
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
        brewing: { active: false, children: { herbs: false, action: false } },
        garden: { active: false, children: { plots: false } },
        workshop: { active: false, children: { seeds: false, tasks: false } },
        research: { active: false, children: { research: false } },
        shop: {
          active: false,
          children: {
            npcStand: false,
            npcListing: false,
            playerStand: false,
            playerListing: false,
            playerProceeds: false,
            playerMarket: false,
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

  it('rolls ready garden harvests and affordable plot buys up to the garden page', () => {
    const manager = new PageNotificationStateManager();
    const snapshot = createSnapshot();

    snapshot.garden.plot.tiles[0].phase = 'ready';
    expect(manager.getSnapshot(snapshot).pages.garden.active).toBe(true);

    snapshot.garden.plot.tiles[0].phase = 'empty';
    snapshot.gold.current = 1;
    expect(manager.getSnapshot(snapshot).pages.garden.active).toBe(true);
  });
});
