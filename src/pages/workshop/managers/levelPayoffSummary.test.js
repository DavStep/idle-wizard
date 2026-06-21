import { describe, expect, it } from 'vitest';

import { formatLevelUpNotice, getLevelPayoffRows } from './levelPayoffSummary.js';

const snapshot = {
  playerLevel: {
    levels: [
      {
        level: 1,
        totals: {
          maxGardenTiles: 2,
          maxCauldrons: 1,
          maxNpcMarketStands: 0,
          maxPlayerMarketStands: 0,
          maxManaCap: 50,
          manaPerSecond: 1,
        },
        effects: [
          'max garden tiles 2',
          'max cauldrons 1',
          'max mana cap 50',
          'mana regen 1/sec',
        ],
      },
      {
        level: 2,
        totals: {
          maxGardenTiles: 3,
          maxCauldrons: 2,
          maxNpcMarketStands: 0,
          maxPlayerMarketStands: 0,
          maxManaCap: 100,
          manaPerSecond: 1.25,
        },
        effects: [
          'max garden tiles 3',
          'max cauldrons 2',
          'allows researching "Mana Cap"',
          'max mana cap 100',
          'mana regen 1.25/sec',
          'crystal reward 1',
        ],
      },
      {
        level: 3,
        totals: {
          maxGardenTiles: 3,
          maxCauldrons: 3,
          maxNpcMarketStands: 0,
          maxPlayerMarketStands: 0,
          maxManaCap: 150,
          manaPerSecond: 1.5,
        },
        effects: [
          'max cauldrons 3',
          'allows researching "Still Fake"',
          'max mana cap 150',
          'mana regen 1.5/sec',
          'crystal reward 1',
        ],
      },
      {
        level: 4,
        totals: {
          maxGardenTiles: 3,
          maxCauldrons: 4,
          maxNpcMarketStands: 0,
          maxPlayerMarketStands: 0,
          maxManaCap: 200,
          manaPerSecond: 1.75,
        },
        effects: [
          'max cauldrons 4',
          'max mana cap 200',
          'mana regen 1.75/sec',
          'crystal reward 1',
        ],
      },
    ],
  },
};

describe('levelPayoffSummary', () => {
  it('uses only real level-two unlocks and rewards', () => {
    expect(getLevelPayoffRows(snapshot, { fromLevel: 1, toLevel: 2 })).toEqual([
      {
        label: 'unlocks',
        value: 'garden',
        valueLines: ['garden'],
        notice: 'garden unlocked',
      },
      {
        label: 'garden plots',
        value: '+1',
        notice: '+1 garden plot',
      },
      {
        label: 'mana cap',
        value: '+50',
        notice: '+50 mana cap',
      },
      {
        label: 'mana regen',
        value: '+0.25/sec',
        notice: '+0.25/sec mana regen',
      },
      {
        label: 'crystal',
        value: '+1',
        notice: '+1 crystal',
      },
    ]);
  });

  it('includes page and workshop unlocks, but skips unwired display-only data', () => {
    const rows = getLevelPayoffRows(snapshot, { fromLevel: 2, toLevel: 3 });

    expect(rows).toEqual([
      {
        label: 'unlocks',
        value: 'research, logs, leaderboard',
        valueLines: ['research', 'logs', 'leaderboard'],
        notice: 'research unlocked, logs available, leaderboard available',
      },
      {
        label: 'mana cap',
        value: '+50',
        notice: '+50 mana cap',
      },
      {
        label: 'mana regen',
        value: '+0.25/sec',
        notice: '+0.25/sec mana regen',
      },
      {
        label: 'crystal',
        value: '+1',
        notice: '+1 crystal',
      },
    ]);
    expect(formatLevelUpNotice(3, rows)).toBe(
      'level 3 reached: research unlocked, logs available, leaderboard available, +50 mana cap, +0.25/sec mana regen, +1 crystal',
    );
  });

  it('moves discoveries and alliance to the level-four unlock list', () => {
    const rows = getLevelPayoffRows(snapshot, { fromLevel: 3, toLevel: 4 });

    expect(rows).toEqual([
      {
        label: 'unlocks',
        value: 'brewing, discoveries, alliance',
        valueLines: ['brewing', 'discoveries', 'alliance'],
        notice: 'brewing unlocked, discoveries available, alliance available',
      },
      {
        label: 'mana cap',
        value: '+50',
        notice: '+50 mana cap',
      },
      {
        label: 'mana regen',
        value: '+0.25/sec',
        notice: '+0.25/sec mana regen',
      },
      {
        label: 'crystal',
        value: '+1',
        notice: '+1 crystal',
      },
    ]);
    expect(formatLevelUpNotice(4, rows)).toBe(
      'level 4 reached: brewing unlocked, discoveries available, alliance available, +50 mana cap, +0.25/sec mana regen, +1 crystal',
    );
  });
});
