import { describe, expect, it } from 'vitest';

import {
  GUILD_ADVENTURER_ICON_KEYS,
  isGuildAdventurerIconKey,
  normalizeGuildAdventurerIconKey,
  pickGuildAdventurerIconKey,
} from './guildAdventurerIcons.js';

describe('guildAdventurerIcons', () => {
  it('keeps Elara out of guild adventurer icon choices', () => {
    expect(GUILD_ADVENTURER_ICON_KEYS).not.toContain('elara');
    expect(isGuildAdventurerIconKey('elara')).toBe(false);
    expect(normalizeGuildAdventurerIconKey('elara')).not.toBe('elara');
  });

  it('normalizes unknown icon keys to a valid guild adventurer icon', () => {
    expect(normalizeGuildAdventurerIconKey('unknown')).toBe('adventurer_packscout');
    expect(normalizeGuildAdventurerIconKey('unknown', 'adventurer_cleric')).toBe(
      'adventurer_cleric',
    );
  });

  it('picks icons from personality and strongest stat fit', () => {
    expect(
      pickGuildAdventurerIconKey(
        {
          personalityId: 'burglar',
          stats: {
            cunning: 30,
            strength: 10,
          },
        },
        () => 0,
      ),
    ).toBe('adventurer_shadowdagger');

    expect(
      pickGuildAdventurerIconKey(
        {
          personalityId: 'scholar',
          stats: {
            wisdom: 30,
            strength: 10,
          },
        },
        () => 0.99,
      ),
    ).not.toBe('elara');
  });
});
