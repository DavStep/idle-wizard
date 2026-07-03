import { describe, expect, it } from 'vitest';

import { StatsFacade } from './StatsFacade.js';

function createItemsFacadeFake() {
  return {
    getSeedDefinitions: () => [
      { id: 1, key: 'sageSeed', label: 'sage seed', kind: 'seed' },
      { id: 2, key: 'mintSeed', label: 'mint seed', kind: 'seed' },
    ],
    getHerbDefinitions: () => [
      { id: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
      { id: 1002, key: 'mintHerb', label: 'mint', kind: 'herb' },
    ],
    getPotionDefinitions: () => [
      { id: 2001, key: 'manaTonic', label: 'mana tonic', kind: 'potion' },
      { id: 2002, key: 'wastedPotion', label: 'wasted potion', kind: 'potion' },
    ],
  };
}

describe('StatsFacade', () => {
  it('tracks produced seeds, herbs, and potions by item key', () => {
    const facade = new StatsFacade({ itemsFacade: createItemsFacadeFake() });

    facade.recordSeedsGenerated([
      { seed: { key: 'sageSeed' }, quantity: 2 },
      { seed: { key: 'mintSeed' }, quantity: 1 },
    ]);
    facade.recordHerbsGrown({ herb: { key: 'sageHerb' }, quantity: 3 });
    facade.recordPotionsBrewed({ potion: { key: 'manaTonic' }, quantity: 4 });

    const snapshot = facade.getSnapshot();

    expect(snapshot.seeds.total).toBe(3);
    expect(snapshot.seeds.items.map((item) => [item.key, item.quantity])).toEqual([
      ['sageSeed', 2],
      ['mintSeed', 1],
    ]);
    expect(snapshot.herbs.total).toBe(3);
    expect(snapshot.herbs.items.map((item) => [item.key, item.quantity])).toEqual([
      ['sageHerb', 3],
      ['mintHerb', 0],
    ]);
    expect(snapshot.potions.total).toBe(4);
    expect(snapshot.potions.items.map((item) => [item.key, item.quantity])).toEqual([
      ['manaTonic', 4],
      ['wastedPotion', 0],
    ]);
  });

  it('splits coin earned by npc trade, player trade, and potion royalties', () => {
    const facade = new StatsFacade({ itemsFacade: createItemsFacadeFake() });

    facade.recordNpcTradeCoin(12.25);
    facade.recordPlayerMarketProceeds({
      proceedsCoin: 8.5,
      playerTrades: [{ tradeId: 'trade-1', coin: 6 }],
      royalties: [{ royaltyId: 'royalty-1', potionKey: 'manaTonic', coin: 2.5 }],
      fallbackPlayerTradeCoin: 0,
    });
    facade.recordPlayerMarketProceeds({
      proceedsCoin: 10,
      playerTrades: [{ tradeId: 'trade-1', coin: 6 }],
      royalties: [{ royaltyId: 'royalty-1', potionKey: 'manaTonic', coin: 2.5 }],
      fallbackPlayerTradeCoin: 1.5,
    });

    expect(facade.getSnapshot().coin).toMatchObject({
      npcTrade: 12.25,
      playerTrade: 7.5,
      royalties: {
        total: 2.5,
        items: [{ potionKey: 'manaTonic', potionLabel: 'mana tonic', coin: 2.5 }],
      },
    });
  });

  it('persists and restores stats without unknown item data loss', () => {
    const first = new StatsFacade({ itemsFacade: createItemsFacadeFake() });
    first.recordSeedsGenerated([{ seed: { key: 'unknownSeed' }, quantity: 5 }]);
    first.recordPlayerMarketProceeds({
      proceedsCoin: 4,
      royalties: [{ royaltyId: 'royalty-1', potionKey: 'unknownPotion', coin: 4 }],
    });

    const second = new StatsFacade({ itemsFacade: createItemsFacadeFake() });
    second.applyPersistenceSnapshot(first.getPersistenceSnapshot());

    expect(second.getSnapshot().seeds.items.at(-1)).toMatchObject({
      key: 'unknownSeed',
      quantity: 5,
    });
    expect(second.getSnapshot().coin.royalties.items.at(-1)).toMatchObject({
      potionKey: 'unknownPotion',
      coin: 4,
    });
  });
});
