import { describe, expect, it, vi } from 'vitest';

import { PlayerInfoBackendFacade } from './PlayerInfoBackendFacade.js';

describe('PlayerInfoBackendFacade', () => {
  it('subscribes to public player info only while retained', () => {
    const connection = {};
    const subscriptionManager = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      getSnapshot: vi.fn(() => ({ connected: false, players: [] })),
    };
    const facade = new PlayerInfoBackendFacade();
    facade.subscriptionManager = subscriptionManager;

    facade.connect(connection);

    expect(subscriptionManager.connect).not.toHaveBeenCalled();

    const release = facade.retainPublicData();

    expect(subscriptionManager.connect).toHaveBeenCalledWith(connection);

    release();

    expect(subscriptionManager.disconnect).toHaveBeenCalledTimes(1);
  });
});
