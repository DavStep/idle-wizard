import { describe, expect, it, vi } from 'vitest';

import { PageActivityScopeManager } from './PageActivityScopeManager.js';

describe('PageActivityScopeManager', () => {
  it('suppresses hidden page callbacks and delivers only the latest value on resume', () => {
    let publish = () => {};
    const unsubscribe = vi.fn();
    const facade = {
      subscribe: vi.fn((listener) => {
        publish = listener;
        return unsubscribe;
      }),
      buyResearch: vi.fn(),
    };
    const listener = vi.fn();
    const scope = new PageActivityScopeManager();
    const scopedFacade = scope.scope(facade);
    const release = scopedFacade.subscribe(listener);

    publish({ value: 1 });
    scope.suspend();
    publish({ value: 2 });
    publish({ value: 3 });

    expect(listener).toHaveBeenCalledTimes(1);

    scope.resume();

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith({ value: 3 });

    scopedFacade.buyResearch('researchCost:1');
    expect(facade.buyResearch).toHaveBeenCalledWith('researchCost:1');

    release();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('scopes every subscribe-prefixed stream and cleans them up together', () => {
    const unsubscribers = [vi.fn(), vi.fn()];
    const facade = {
      subscribe: vi.fn(() => unsubscribers[0]),
      subscribeFrameResources: vi.fn(() => unsubscribers[1]),
    };
    const scope = new PageActivityScopeManager();
    const scopedFacade = scope.scope(facade);

    scopedFacade.subscribe(() => {});
    scopedFacade.subscribeFrameResources(() => {});
    scope.clear();

    expect(unsubscribers[0]).toHaveBeenCalledTimes(1);
    expect(unsubscribers[1]).toHaveBeenCalledTimes(1);
  });

  it('does not replay one-shot reward events when a hidden page resumes', () => {
    let publishReward = () => {};
    const facade = {
      subscribeRewardEvents: vi.fn((listener) => {
        publishReward = listener;
        return vi.fn();
      }),
    };
    const listener = vi.fn();
    const scope = new PageActivityScopeManager();
    const scopedFacade = scope.scope(facade);

    scopedFacade.subscribeRewardEvents(listener);
    scope.suspend();
    publishReward({ id: 1, type: 'item_sold' });
    scope.resume();

    expect(listener).not.toHaveBeenCalled();

    publishReward({ id: 2, type: 'item_sold' });
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenLastCalledWith({
      id: 2,
      type: 'item_sold',
    });
  });
});
