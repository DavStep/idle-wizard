import { describe, expect, it, vi } from 'vitest';

import { TradeAllianceBackendFacade } from './TradeAllianceBackendFacade.js';

describe('TradeAllianceBackendFacade', () => {
  it('reapplies retained quest data after connect', () => {
    const facade = new TradeAllianceBackendFacade();
    const subscriptionManager = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      getSnapshot: vi.fn(() => ({})),
      setPublicDataActive: vi.fn(),
      setQuestDataActive: vi.fn(),
    };
    facade.subscriptionManager = subscriptionManager;
    facade.actionManager = {
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    facade.rewardManager = {
      disconnect: vi.fn(),
      processSnapshot: vi.fn(),
    };

    const release = facade.retainQuestData();

    expect(subscriptionManager.setQuestDataActive).toHaveBeenLastCalledWith(true);

    subscriptionManager.setQuestDataActive.mockClear();

    facade.connect({}, 'self');

    expect(subscriptionManager.connect).toHaveBeenCalledWith({}, 'self');
    expect(subscriptionManager.setQuestDataActive).toHaveBeenLastCalledWith(true);

    release();

    expect(subscriptionManager.setQuestDataActive).toHaveBeenLastCalledWith(false);
  });
});
