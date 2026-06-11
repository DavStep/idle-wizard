/* @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';

import { ShopPlayerShelfManager } from './ShopPlayerShelfManager.js';
import { ShopShelfManager } from './ShopShelfManager.js';

describe('ShopShelfManager', () => {
  it('shows zero-cost NPC market stand buys as free', () => {
    const manager = new ShopShelfManager();

    expect(manager.formatLockedSlotAction({ nextSlotLockedByLevel: false }, 0)).toBe(
      'buy (free)',
    );
  });

  it('shows zero-cost player market stand buys as free', () => {
    const manager = new ShopPlayerShelfManager();

    expect(manager.formatLockedSlotAction({ nextSlotLockedByLevel: false }, 0)).toBe(
      'buy (free)',
    );
  });

  it('shows empty player market stand notifications as orange', () => {
    const stage = document.createElement('section');
    const popupLayer = document.createElement('section');
    const gameplaySnapshot = {
      gold: { current: 0 },
      research: { completedResearchIds: [] },
      shop: {
        playerShelf: {
          maxSlots: 1,
          selectedSlotNumber: 1,
          slotCosts: [0],
          sellKinds: [{ kind: 'seed', label: 'seeds' }],
          sellItems: [
            {
              itemTypeId: 1,
              key: 'sageSeed',
              label: 'Sage Seed',
              kind: 'seed',
              quantity: 1,
            },
          ],
          slots: [
            {
              slotNumber: 1,
              unlocked: true,
              itemTypeId: null,
            },
          ],
        },
      },
    };
    const gameplayFacade = {
      subscribe(callback) {
        callback(gameplaySnapshot);
        return () => {};
      },
      getSnapshot() {
        return gameplaySnapshot;
      },
      applyPlayerShopMarketSlotQuantity() {},
    };
    const playerShopSnapshot = {
      connected: true,
      listings: [],
      ownListings: [],
      proceedsGold: 0,
    };
    const playerShopFacade = {
      subscribe(callback) {
        callback(playerShopSnapshot);
        return () => {};
      },
      getSnapshot() {
        return playerShopSnapshot;
      },
    };
    const manager = new ShopPlayerShelfManager({ gameplayFacade, playerShopFacade });

    manager.mount(stage, popupLayer);

    const row = stage.querySelector('.shop-page__player-slot-row');
    expect(row?.dataset.notification).toBe('true');
    expect(row?.dataset.notificationTone).toBe('orange');

    manager.unmount();
  });
});
