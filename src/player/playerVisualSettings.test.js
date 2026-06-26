import { describe, expect, it } from 'vitest';

import { DEFAULT_UNLOCKED_PLAYER_CHARACTER_KEYS } from './playerCharacters.js';
import { getDefaultPlayerVisualSettingsResearched } from './playerVisualSettings.js';

describe('playerVisualSettings', () => {
  it('starts only the named avatar choices researched', () => {
    const researched = getDefaultPlayerVisualSettingsResearched().character;

    expect(
      Object.entries(researched)
        .filter(([, unlocked]) => unlocked)
        .map(([key]) => key),
    ).toEqual([...DEFAULT_UNLOCKED_PLAYER_CHARACTER_KEYS]);
    expect(researched.adventurer_cleric).toBe(false);
  });
});
