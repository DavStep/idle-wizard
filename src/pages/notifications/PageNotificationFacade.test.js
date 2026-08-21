import { describe, expect, it, vi } from 'vitest';

import { PageNotificationFacade } from './PageNotificationFacade.js';

describe('PageNotificationFacade', () => {
  it('retains trade alliance quest and request data while page notifications are mounted', () => {
    const releaseQuestData = vi.fn();
    const releaseNotificationData = vi.fn();
    const tradeAllianceFacade = {
      getSnapshot: vi.fn(() => ({})),
      retainQuestData: vi.fn(() => releaseQuestData),
      retainNotificationData: vi.fn(() => releaseNotificationData),
      subscribe: vi.fn((listener) => {
        listener({});
        return vi.fn();
      }),
    };
    const facade = new PageNotificationFacade({
      tradeAllianceFacade,
    });

    facade.mount();

    expect(tradeAllianceFacade.retainQuestData).toHaveBeenCalledTimes(1);
    expect(tradeAllianceFacade.retainNotificationData).toHaveBeenCalledTimes(1);

    facade.unmount();

    expect(releaseQuestData).toHaveBeenCalledTimes(1);
    expect(releaseNotificationData).toHaveBeenCalledTimes(1);
  });
});
