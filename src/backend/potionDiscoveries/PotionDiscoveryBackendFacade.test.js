import { describe, expect, it, vi } from 'vitest';

import { PotionDiscoveryBackendFacade } from './PotionDiscoveryBackendFacade.js';

describe('PotionDiscoveryBackendFacade', () => {
  it('uses a non-persistent dev snapshot until the preview is cleared', () => {
    const facade = new PotionDiscoveryBackendFacade();
    const listener = vi.fn();
    facade.subscribe(listener);
    const liveSnapshot = {
      connected: true,
      discoveries: [],
    };
    facade.subscriptionManager.publish(liveSnapshot);
    const devDiscovery = {
      potionKey: 'silverleafQuiet',
      username: 'Ada',
    };
    const devSnapshot = {
      connected: true,
      discoveries: [devDiscovery],
    };

    expect(facade.setDevSnapshot(devSnapshot)).toMatchObject({ ok: true });
    expect(facade.getSnapshot()).toBe(devSnapshot);
    expect(facade.getDiscovery('silverleafQuiet')).toBe(devDiscovery);
    expect(facade.hasDiscoveredPotion('silverleafQuiet')).toBe(true);

    facade.subscriptionManager.publish({
      connected: true,
      discoveries: [{ potionKey: 'ashenMemory', username: 'Live Wizard' }],
    });
    expect(facade.getSnapshot()).toBe(devSnapshot);

    expect(facade.clearDevSnapshot()).toMatchObject({ ok: true });
    expect(facade.getDiscovery('ashenMemory')).toMatchObject({
      username: 'Live Wizard',
    });
  });
});
