import { describe, expect, it } from 'vitest';

import { PlayerLevelBalanceManager } from './PlayerLevelBalanceManager.js';

describe('PlayerLevelBalanceManager', () => {
  it('describes cap, feature, and research milestone text from config', () => {
    const manager = new PlayerLevelBalanceManager({
      balance: {
        maxLevel: 3,
        mana: {
          baseMaxManaCap: 50,
          maxManaCapPerLevel: 10,
          baseManaPerSecond: 1,
          manaPerSecondPerLevel: 0.1,
        },
        milestones: [
          {
            level: 1,
            maxGardenTiles: 1,
            maxCauldrons: 1,
            maxNpcMarketStands: 1,
            maxPlayerMarketStands: 1,
            unlocks: ['garden'],
            researchUnlocks: ['Mana Cap'],
          },
          {
            level: 3,
            maxGardenTiles: 2,
            unlocks: ['chat'],
          },
        ],
      },
    });

    expect(manager.getLevelSummaries(1)[0].effects).toEqual([
      'max garden tiles 1',
      'max cauldrons 1',
      'max npc market stands 1',
      'max player market stands 1',
      'unlocks garden',
      'allows researching "Mana Cap"',
      'max mana cap 50',
      'mana regen 1/sec',
    ]);
    expect(manager.getLevelSummaries(1)[2].effects).toEqual([
      'max garden tiles 2',
      'unlocks chat',
      'max mana cap 70',
      'mana regen 1.2/sec',
    ]);
    expect(manager.getLevelSummaries(1)[1].totals).toEqual({
      maxGardenTiles: 1,
      maxCauldrons: 1,
      maxShopSlots: 1,
      maxNpcMarketStands: 1,
      maxPlayerMarketStands: 1,
      maxManaCap: 60,
      manaPerSecond: 1.1,
    });
    expect(manager.getLevelSummaries(1)[2].totals).toEqual({
      maxGardenTiles: 2,
      maxCauldrons: 1,
      maxShopSlots: 1,
      maxNpcMarketStands: 1,
      maxPlayerMarketStands: 1,
      maxManaCap: 70,
      manaPerSecond: 1.2,
    });
    expect(manager.getEffects(3)).toEqual({
      maxGardenTiles: 2,
      maxCauldrons: 1,
      maxShopSlots: 1,
      maxNpcMarketStands: 1,
      maxPlayerMarketStands: 1,
      maxManaCap: 70,
      manaPerSecond: 1.2,
    });
  });
});
