import { describe, expect, it, vi } from 'vitest';

import { TradeAllianceBackendFacade } from './TradeAllianceBackendFacade.js';

describe('TradeAllianceBackendFacade', () => {
  it('can publish and clear a reversible development snapshot', () => {
    const facade = new TradeAllianceBackendFacade();
    const liveSnapshot = { topAllTimeAlliances: [] };
    facade.subscriptionManager.getSnapshot = vi.fn(() => liveSnapshot);
    const listener = vi.fn();
    facade.subscribe(listener);
    const devSnapshot = {
      topAllTimeAlliances: [{ allianceId: 'owl', name: 'Night Owls' }],
    };

    expect(facade.setDevSnapshot(devSnapshot)).toEqual({ ok: true });
    expect(facade.getSnapshot()).toBe(devSnapshot);
    expect(listener).toHaveBeenLastCalledWith(devSnapshot);

    expect(facade.clearDevSnapshot()).toEqual({
      ok: true,
      snapshot: liveSnapshot,
    });
    expect(facade.getSnapshot()).toBe(liveSnapshot);
    expect(listener).toHaveBeenLastCalledWith(liveSnapshot);
  });

  it('reapplies retained quest data after connect', () => {
    const facade = new TradeAllianceBackendFacade();
    const subscriptionManager = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      getSnapshot: vi.fn(() => ({})),
      setPublicDataActive: vi.fn(),
      setQuestDataActive: vi.fn(),
      setNotificationDataActive: vi.fn(),
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

  it('reapplies retained notification data after connect', () => {
    const facade = new TradeAllianceBackendFacade();
    const subscriptionManager = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      getSnapshot: vi.fn(() => ({})),
      setPublicDataActive: vi.fn(),
      setQuestDataActive: vi.fn(),
      setNotificationDataActive: vi.fn(),
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

    const release = facade.retainNotificationData();

    expect(subscriptionManager.setNotificationDataActive).toHaveBeenLastCalledWith(true);

    subscriptionManager.setNotificationDataActive.mockClear();
    facade.connect({}, 'self');

    expect(subscriptionManager.connect).toHaveBeenCalledWith({}, 'self');
    expect(subscriptionManager.setNotificationDataActive).toHaveBeenLastCalledWith(true);

    release();

    expect(subscriptionManager.setNotificationDataActive).toHaveBeenLastCalledWith(false);
  });
});
