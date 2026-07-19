import { describe, expect, it, vi } from 'vitest';

import { GameplaySaveBackendFacade } from './GameplaySaveBackendFacade.js';

describe('GameplaySaveBackendFacade', () => {
  it('scopes the pending-save journal to the connected player identity', () => {
    const facade = new GameplaySaveBackendFacade();
    const connection = {};
    const identity = { toHexString: () => 'player-1' };

    facade.sendManager.setReadyToSend = vi.fn();
    facade.sendManager.connect = vi.fn();
    facade.subscriptionManager.connect = vi.fn(() => true);

    expect(facade.connect(connection, identity)).toBe(true);
    expect(facade.sendManager.connect).toHaveBeenCalledWith(connection, identity);
  });
});
