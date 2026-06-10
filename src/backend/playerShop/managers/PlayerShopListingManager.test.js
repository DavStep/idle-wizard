import { describe, expect, it, vi } from 'vitest';

import { PlayerShopListingManager } from './PlayerShopListingManager.js';

describe('PlayerShopListingManager', () => {
  it('clears player market listings and proceeds for a progress reset', async () => {
    const clearPlayerShopSlot = vi.fn(() => Promise.resolve());
    const claimPlayerShopProceeds = vi.fn(() => Promise.resolve());
    const manager = new PlayerShopListingManager();

    manager.connect({
      reducers: {
        clearPlayerShopSlot,
        claimPlayerShopProceeds,
      },
    });

    await expect(manager.clearOwnProgress()).resolves.toEqual({ ok: true });
    expect(clearPlayerShopSlot).toHaveBeenCalledTimes(5);
    expect(clearPlayerShopSlot.mock.calls.map(([args]) => args)).toEqual([
      { slotNumber: 1 },
      { slotNumber: 2 },
      { slotNumber: 3 },
      { slotNumber: 4 },
      { slotNumber: 5 },
    ]);
    expect(claimPlayerShopProceeds).toHaveBeenCalledWith({});
  });

  it('uses snake-case reset reducers when camel-case bindings are missing', async () => {
    const clearPlayerShopSlot = vi.fn(() => Promise.resolve());
    const claimPlayerShopProceeds = vi.fn(() => Promise.resolve());
    const manager = new PlayerShopListingManager();

    manager.connect({
      reducers: {
        clear_player_shop_slot: clearPlayerShopSlot,
        claim_player_shop_proceeds: claimPlayerShopProceeds,
      },
    });

    await expect(manager.clearOwnProgress()).resolves.toEqual({ ok: true });
    expect(clearPlayerShopSlot).toHaveBeenCalledTimes(5);
    expect(claimPlayerShopProceeds).toHaveBeenCalledWith({});
  });
});
