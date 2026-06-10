import { describe, expect, it, vi } from 'vitest';

import { PotionDiscoverySendManager } from './PotionDiscoverySendManager.js';

describe('PotionDiscoverySendManager', () => {
  it('sends potion recipe discoveries through the generated reducer', async () => {
    const discoverPotionRecipe = vi.fn().mockResolvedValue(undefined);
    const manager = new PotionDiscoverySendManager();

    manager.connect({
      reducers: {
        discoverPotionRecipe,
      },
    });

    await expect(manager.discoverPotionRecipe('  ashenMemory  ')).resolves.toEqual({
      ok: true,
      potionKey: 'ashenMemory',
    });
    expect(discoverPotionRecipe).toHaveBeenCalledWith({ potionKey: 'ashenMemory' });
  });

  it('fails softly when offline or missing a potion key', async () => {
    const manager = new PotionDiscoverySendManager();

    await expect(manager.discoverPotionRecipe('')).resolves.toEqual({
      ok: false,
      reason: 'missing_potion',
    });
    await expect(manager.discoverPotionRecipe('ashenMemory')).resolves.toEqual({
      ok: false,
      reason: 'offline',
    });
  });
});
