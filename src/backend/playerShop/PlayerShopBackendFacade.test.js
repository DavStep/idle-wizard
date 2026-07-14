import { describe, expect, it, vi } from 'vitest';

import { PlayerShopBackendFacade } from './PlayerShopBackendFacade.js';

describe('PlayerShopBackendFacade', () => {
  it('does not refresh listings or subscriptions for the active market', () => {
    const facade = new PlayerShopBackendFacade();
    facade.listingManager = {
      setActiveMarketId: vi.fn(),
    };
    facade.subscriptionManager = {
      setActiveMarketId: vi.fn(),
    };

    facade.setActiveMarketId('crossroads');
    facade.setActiveMarketId('crossroads');

    expect(facade.listingManager.setActiveMarketId).toHaveBeenCalledTimes(1);
    expect(facade.subscriptionManager.setActiveMarketId).toHaveBeenCalledTimes(1);
    expect(facade.subscriptionManager.setActiveMarketId).toHaveBeenCalledWith('crossroads');
  });
});
