import { describe, expect, it, vi } from 'vitest';

import { PlayerShopListingManager } from './PlayerShopListingManager.js';

describe('PlayerShopListingManager', () => {
  it('keeps the reducer reason when a player listing is rejected', async () => {
    const setPlayerShopSlot = vi.fn(() =>
      Promise.reject(new Error('Player shop slot requires a higher market rank.')),
    );
    const manager = new PlayerShopListingManager();

    manager.connect({
      reducers: {
        setPlayerShopSlot,
      },
    });

    await expect(
      manager.setSlotListing({
        slotNumber: 2,
        itemKey: 'sageSeed',
        itemLabel: 'sage seed',
        itemKind: 'seed',
        quantity: 4,
        priceCoin: 200,
      }),
    ).resolves.toEqual({
      ok: false,
      reason: 'publish_failed',
      message: 'Player shop slot requires a higher market rank.',
    });
  });

  it('does not expose an opaque internal server error as the listing reason', async () => {
    const internalError = new Error('The instance encountered a fatal error.');
    internalError.name = 'InternalError';
    const setPlayerShopSlot = vi.fn(() => Promise.reject(internalError));
    const manager = new PlayerShopListingManager();

    manager.connect({
      reducers: {
        setPlayerShopSlot,
      },
    });

    await expect(
      manager.setSlotListing({
        slotNumber: 1,
        itemKey: 'sageSeed',
        itemLabel: 'sage seed',
        itemKind: 'seed',
        quantity: 1_000,
        priceCoin: 99,
      }),
    ).resolves.toEqual({
      ok: false,
      reason: 'server_error',
      message: 'Server error. Nothing was sold. Please try again.',
    });
  });

  it('keeps actionable request errors and hides opaque internal request failures', async () => {
    const setPlayerShopRequest = vi
      .fn()
      .mockRejectedValueOnce(
        new Error('Market licence does not match the active market.'),
      )
      .mockRejectedValueOnce(
        Object.assign(new Error('The instance encountered a fatal error.'), {
          name: 'InternalError',
        }),
      );
    const manager = new PlayerShopListingManager();

    manager.connect({
      reducers: {
        setPlayerShopRequest,
      },
    });

    const request = {
      slotNumber: 1,
      itemKey: 'sageSeed',
      itemLabel: 'sage seed',
      itemKind: 'seed',
      quantity: 99,
      priceCoin: 999,
    };

    await expect(manager.setSlotRequest(request)).resolves.toEqual({
      ok: false,
      reason: 'publish_failed',
      message: 'Market licence does not match the active market.',
    });
    await expect(manager.setSlotRequest(request)).resolves.toEqual({
      ok: false,
      reason: 'server_error',
      message: 'Server error. Request was not placed. Please try again.',
    });
  });

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
      { marketId: 'smallTown', slotNumber: 1 },
      { marketId: 'smallTown', slotNumber: 2 },
      { marketId: 'smallTown', slotNumber: 3 },
      { marketId: 'smallTown', slotNumber: 4 },
      { marketId: 'smallTown', slotNumber: 5 },
    ]);
    expect(claimPlayerShopProceeds).toHaveBeenCalledWith({ marketId: 'smallTown' });
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
    expect(claimPlayerShopProceeds).toHaveBeenCalledWith({ marketId: 'smallTown' });
  });
});
