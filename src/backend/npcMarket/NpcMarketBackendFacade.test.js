import { describe, expect, it, vi } from 'vitest';

import { NpcMarketBackendFacade } from './NpcMarketBackendFacade.js';

describe('NpcMarketBackendFacade', () => {
  it('connects reducers immediately but subscribes to prices only while retained', () => {
    const connection = {};
    const subscriptionManager = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      getSnapshot: vi.fn(() => ({ connected: false, prices: [] })),
      getPrice: vi.fn(() => null),
    };
    const tradeManager = {
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    const facade = new NpcMarketBackendFacade();
    facade.subscriptionManager = subscriptionManager;
    facade.tradeManager = tradeManager;

    facade.connect(connection);

    expect(tradeManager.connect).toHaveBeenCalledWith(connection);
    expect(subscriptionManager.connect).not.toHaveBeenCalled();

    const release = facade.retainPrices();

    expect(subscriptionManager.connect).toHaveBeenCalledWith(connection);

    release();

    expect(subscriptionManager.disconnect).toHaveBeenCalledTimes(1);
  });
});
