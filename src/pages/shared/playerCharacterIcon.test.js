import { describe, expect, it } from 'vitest';

import { getPlayerCharacterOptions } from '../../player/playerCharacters.js';
import { GUILD_ADVENTURER_ICON_KEYS } from '../../shared/guildAdventurerIcons.js';
import {
  getCharacterImageUrl,
  getPlayerCharacterImageUrl,
} from './playerCharacterIcon.js';

describe('playerCharacterIcon', () => {
  it('maps every selectable player character to an image URL', () => {
    for (const { key } of getPlayerCharacterOptions()) {
      expect(getPlayerCharacterImageUrl(key), key).toContain(`/assets/characters/${key}.png`);
    }
  });

  it('maps every guild adventurer icon key to an image URL', () => {
    for (const key of GUILD_ADVENTURER_ICON_KEYS) {
      expect(getCharacterImageUrl(key), key).not.toBe('');
    }
  });
});
