import { describe, expect, it } from 'vitest';

import { PlayerLevelBalanceManager } from './PlayerLevelBalanceManager.js';

describe('PlayerLevelBalanceManager', () => {
  it('keeps starter room caps before level one', () => {
    const manager = new PlayerLevelBalanceManager();

    expect(manager.getEffects(0)).toEqual({
      maxGardenTiles: 2,
      maxCauldrons: 1,
      maxShopSlots: 1,
      maxNpcMarketStands: 1,
      maxPlayerMarketStands: 0,
    });
    expect(manager.getCrystalRewardThroughLevel(0)).toBe(0);
    expect(manager.getCrystalRewardForLevelRange(0, 1)).toBe(1);
  });

  it('keeps default plot and cauldron caps below prestige capacity', () => {
    const manager = new PlayerLevelBalanceManager();

    expect(manager.getEffects(20).maxGardenTiles).toBe(5);
    expect(manager.getEffects(20).maxCauldrons).toBe(2);
    expect(manager.getRequiredLevelForGardenTile(6)).toBeNull();
    expect(manager.getRequiredLevelForCauldron(2)).toBe(5);
    expect(manager.getRequiredLevelForCauldron(3)).toBeNull();
  });

  it('does not expose mana as a player-level effect', () => {
    const manager = new PlayerLevelBalanceManager();

    expect(manager.getEffects(1)).not.toHaveProperty('maxManaCap');
    expect(manager.getEffects(100)).not.toHaveProperty('manaPerSecond');
  });

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
        crystal: {
          perLevel: 2,
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
      'unlocks garden',
      'allows researching "Mana Cap"',
      'crystal reward 2',
    ]);
    expect(manager.getLevelSummaries(1)[2].effects).toEqual([
      'max garden tiles 2',
      'unlocks chat',
      'crystal reward 2',
    ]);
    expect(manager.getLevelSummaries(1)[1].totals).toEqual({
      maxGardenTiles: 1,
      maxCauldrons: 1,
      maxShopSlots: 1,
      maxNpcMarketStands: 1,
      maxPlayerMarketStands: 1,
    });
    expect(manager.getLevelSummaries(1)[2].totals).toEqual({
      maxGardenTiles: 2,
      maxCauldrons: 1,
      maxShopSlots: 1,
      maxNpcMarketStands: 1,
      maxPlayerMarketStands: 1,
    });
    expect(manager.getCrystalRewardForLevel(1)).toBe(2);
    expect(manager.getCrystalRewardForLevel(3)).toBe(2);
    expect(manager.getCrystalRewardThroughLevel(3)).toBe(6);
    expect(manager.getCrystalRewardForLevelRange(1, 3)).toBe(4);
    expect(manager.getEffects(3)).toEqual({
      maxGardenTiles: 2,
      maxCauldrons: 1,
      maxShopSlots: 1,
      maxNpcMarketStands: 1,
      maxPlayerMarketStands: 1,
    });
  });

  it('ignores legacy configured mana level ranges', () => {
    const manager = new PlayerLevelBalanceManager({
      balance: {
        maxLevel: 4,
        mana: {
          baseMaxManaCap: 50,
          maxManaCapPerLevel: 10,
          baseManaPerSecond: 1,
          manaPerSecondPerLevelRanges: [
            { fromLevel: 2, toLevel: 3, amount: 2 },
            { fromLevel: 4, amount: 0.5 },
          ],
        },
        milestones: [
          {
            level: 1,
            maxGardenTiles: 1,
            maxCauldrons: 1,
            maxNpcMarketStands: 0,
            maxPlayerMarketStands: 0,
          },
        ],
      },
    });

    expect(manager.getEffects(1)).not.toHaveProperty('manaPerSecond');
    expect(manager.getEffects(4)).not.toHaveProperty('maxManaCap');
  });
});
