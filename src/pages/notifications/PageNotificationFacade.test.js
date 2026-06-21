import { describe, expect, it, vi } from 'vitest';

import { PageNotificationFacade } from './PageNotificationFacade.js';

describe('PageNotificationFacade', () => {
  it('retains trade alliance quest data while page notifications are mounted', () => {
    const releaseQuestData = vi.fn();
    const tradeAllianceFacade = {
      getSnapshot: vi.fn(() => ({})),
      retainQuestData: vi.fn(() => releaseQuestData),
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

    facade.unmount();

    expect(releaseQuestData).toHaveBeenCalledTimes(1);
  });
});
