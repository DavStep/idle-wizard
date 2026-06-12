import { describe, expect, it, vi } from 'vitest';

import { NpcMarketTradeManager } from './NpcMarketTradeManager.js';

describe('NpcMarketTradeManager', () => {
  it('resets NPC market demand and stock through the generated reducer', async () => {
    const resetNpcMarket = vi.fn(() => Promise.resolve());
    const manager = new NpcMarketTradeManager();

    manager.connect({
      reducers: {
        resetNpcMarket,
      },
    });

    try {
      await expect(manager.resetMarket()).resolves.toEqual({ ok: true });
      expect(resetNpcMarket).toHaveBeenCalledWith({});
    } finally {
      manager.disconnect();
    }
  });

  it('uses snake-case NPC market reset reducer when camel-case bindings are missing', async () => {
    const resetNpcMarket = vi.fn(() => Promise.resolve());
    const manager = new NpcMarketTradeManager();

    manager.connect({
      reducers: {
        reset_npc_market: resetNpcMarket,
      },
    });

    try {
      await expect(manager.resetMarket()).resolves.toEqual({ ok: true });
      expect(resetNpcMarket).toHaveBeenCalledWith({});
    } finally {
      manager.disconnect();
    }
  });
});
