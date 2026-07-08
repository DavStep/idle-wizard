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
          maxCauldrons: 1,
          maxNpcMarketStands: 0,
          maxPlayerMarketStands: 0,
          maxManaCap: 100,
          manaPerSecond: 2,
        },
        effects: [
          'max garden tiles 3',
          'max cauldrons 2',
          'allows researching "Mana Cap"',
          'max mana cap 100',
          'mana regen 2/sec',
          'crystal reward 1',
        ],
      },
      {
        level: 3,
        totals: {
          maxGardenTiles: 3,
          maxCauldrons: 1,
          maxNpcMarketStands: 0,
          maxPlayerMarketStands: 0,
          maxManaCap: 150,
          manaPerSecond: 3,
        },
        effects: [
          'max cauldrons 3',
          'allows researching "Still Fake"',
          'max mana cap 150',
          'mana regen 3/sec',
          'crystal reward 1',
        ],
      },
      {
        level: 4,
        totals: {
          maxGardenTiles: 3,
          maxCauldrons: 1,
          maxNpcMarketStands: 0,
          maxPlayerMarketStands: 0,
          maxManaCap: 200,
          manaPerSecond: 4,
        },
        effects: [
          'max cauldrons 4',
          'max mana cap 200',
          'mana regen 4/sec',
          'crystal reward 1',
        ],
      },
      {
        level: 5,
        totals: {
          maxGardenTiles: 5,
          maxCauldrons: 2,
          maxNpcMarketStands: 0,
          maxPlayerMarketStands: 0,
          maxManaCap: 250,
          manaPerSecond: 5,
        },
        effects: [
          'max garden tiles 5',
          'max cauldrons 2',
          'max mana cap 250',
          'mana regen 5/sec',
          'crystal reward 1',
        ],
      },
    ],
  },
};

describe('levelPayoffSummary', () => {
  it('includes market unlocks and first-level rewards from the tutorial baseline', () => {
    const rows = getLevelPayoffRows(snapshot, { fromLevel: 0, toLevel: 1 });

    expect(rows).toEqual([
      {
        label: 'unlocks',
        value: 'market',
        valueLines: ['market'],
        valueLinePageIds: { market: 'shop' },
        valueLineNotices: { market: 'market unlocked' },
        notice: 'market unlocked',
      },
      {
        label: 'garden plots',
        value: '+2',
        notice: '+2 garden plots',
      },
      {
        label: 'cauldrons',
        value: '+1',
        notice: '+1 cauldron',
      },
      {
        label: 'mana capacity',
        value: '+50 mana',
        notice: '+50 mana capacity',
      },
      {
        label: 'mana regeneration',
        value: '+1/sec mana',
        notice: '+1/sec mana regeneration',
      },
    ]);
    expect(formatLevelUpNotice(1, rows)).toBe(
      'level 1 reached: market unlocked, +2 garden plots, +1 cauldron, +50 mana capacity, +1/sec mana regeneration',
    );
  });

  it('uses only real level-two unlocks and rewards', () => {
    expect(getLevelPayoffRows(snapshot, { fromLevel: 1, toLevel: 2 })).toEqual([
      {
        label: 'unlocks',
        value: 'garden, research',
        valueLines: ['garden', 'research'],
        valueLinePageIds: { garden: 'garden', research: 'research' },
        valueLineNotices: { garden: 'garden unlocked', research: 'research unlocked' },
        notice: 'garden unlocked, research unlocked',
      },
      {
        label: 'mana capacity',
        value: '+50 mana',
        notice: '+50 mana capacity',
      },
      {
        label: 'mana regeneration',
        value: '+1/sec mana',
        notice: '+1/sec mana regeneration',
      },
      {
        label: 'bonus',
        value: '+1 crystal',
        notice: '+1 crystal',
      },
    ]);
  });

  it('includes page and workshop unlocks without same-level capacity noise', () => {
    const rows = getLevelPayoffRows(snapshot, { fromLevel: 2, toLevel: 3 });

    expect(rows).toEqual([
      {
        label: 'unlocks',
        value: 'leaderboard',
        valueLines: ['leaderboard'],
        valueLineNotices: {
          leaderboard: 'leaderboard available',
        },
        notice: 'leaderboard available',
      },
      {
        label: 'mana capacity',
        value: '+50 mana',
        notice: '+50 mana capacity',
      },
      {
        label: 'mana regeneration',
        value: '+1/sec mana',
        notice: '+1/sec mana regeneration',
      },
      {
        label: 'bonus',
        value: '+1 crystal',
        notice: '+1 crystal',
      },
    ]);
    expect(formatLevelUpNotice(3, rows)).toBe(
      'level 3 reached: leaderboard available, +50 mana capacity, +1/sec mana regeneration, +1 crystal',
    );
  });

  it('moves discoveries and alliance to the level-four unlock list without an initial cauldron row', () => {
    const rows = getLevelPayoffRows(snapshot, { fromLevel: 3, toLevel: 4 });

    expect(rows).toEqual([
      {
        label: 'unlocks',
        value: 'brewing, discoveries, alliance, inbox',
        valueLines: ['brewing', 'discoveries', 'alliance', 'inbox'],
        valueLinePageIds: { brewing: 'brewing' },
        valueLineNotices: {
          brewing: 'brewing unlocked',
          discoveries: 'discoveries available',
          alliance: 'alliance available',
          inbox: 'inbox available',
        },
        notice: 'brewing unlocked, discoveries available, alliance available, inbox available',
      },
      {
        label: 'mana capacity',
        value: '+50 mana',
        notice: '+50 mana capacity',
      },
      {
        label: 'mana regeneration',
        value: '+1/sec mana',
        notice: '+1/sec mana regeneration',
      },
      {
        label: 'bonus',
        value: '+1 crystal',
        notice: '+1 crystal',
      },
    ]);
    expect(formatLevelUpNotice(4, rows)).toBe(
      'level 4 reached: brewing unlocked, discoveries available, alliance available, inbox available, +50 mana capacity, +1/sec mana regeneration, +1 crystal',
    );
  });

  it('shows garden and cauldron capacity after those feature unlock levels', () => {
    expect(getLevelPayoffRows(snapshot, { fromLevel: 4, toLevel: 5 })).toEqual([
      {
        label: 'garden plots',
        value: '+2',
        notice: '+2 garden plots',
      },
      {
        label: 'cauldrons',
        value: '+1',
        notice: '+1 cauldron',
      },
      {
        label: 'mana capacity',
        value: '+50 mana',
        notice: '+50 mana capacity',
      },
      {
        label: 'mana regeneration',
        value: '+1/sec mana',
        notice: '+1/sec mana regeneration',
      },
      {
        label: 'bonus',
        value: '+1 crystal',
        notice: '+1 crystal',
      },
    ]);
  });

  it('dedupes unlock labels when a large level jump crosses shared unlock gates', () => {
    const rows = getLevelPayoffRows(snapshot, { fromLevel: 1, toLevel: 10 });
    const unlockRow = rows.find((row) => row.label === 'unlocks');

    expect(unlockRow?.valueLines).toEqual([
      'garden',
      'research',
      'brewing',
      'prestige',
      'leaderboard',
      'discoveries',
      'alliance',
      'inbox',
    ]);
    expect(unlockRow?.valueLineNotices).toEqual({
      garden: 'garden unlocked',
      research: 'research unlocked',
      brewing: 'brewing unlocked',
      prestige: 'prestige unlocked',
      leaderboard: 'leaderboard available',
      discoveries: 'discoveries available',
      alliance: 'alliance available',
      inbox: 'inbox available',
    });
  });
});
