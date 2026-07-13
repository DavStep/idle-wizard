import { describe, expect, it } from 'vitest';

import { MarketLicenceFacade } from './MarketLicenceFacade.js';

function createPrestigeFacade(completedStars = 0) {
  return {
    getCompletedCount: () => completedStars,
  };
}

describe('MarketLicenceFacade', () => {
  it.each([
    [0, 'smallTown', 'Small Town Market'],
    [1, 'crossroads', 'Crossroads Market'],
    [2, 'crossroads', 'Crossroads Market'],
    [3, 'cityBazaar', 'City Bazaar'],
    [5, 'cityBazaar', 'City Bazaar'],
    [6, 'grandExchange', 'Grand Exchange'],
    [9, 'grandExchange', 'Grand Exchange'],
    [10, 'arcaneExchange', 'Arcane Exchange'],
  ])('resolves %i completed stars to %s', (completedStars, id, name) => {
    const facade = new MarketLicenceFacade({
      prestigeFacade: createPrestigeFacade(completedStars),
    });

    expect(facade.getSnapshot()).toMatchObject({ id, name, completedStars });
  });

  it('keeps the licence after a run reset because it only reads permanent stars', () => {
    const playerState = { completedStars: 6, currentRunLevel: 100 };
    const facade = new MarketLicenceFacade({
      prestigeFacade: {
        getCompletedCount: () => playerState.completedStars,
      },
    });

    expect(facade.getActiveMarketId()).toBe('grandExchange');
    playerState.currentRunLevel = 1;
    expect(facade.getActiveMarketId()).toBe('grandExchange');
  });
});
