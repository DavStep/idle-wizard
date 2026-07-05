import { describe, expect, it } from 'vitest';

import { normalizePlayerCharacter } from './playerCharacters.js';

describe('playerCharacters', () => {
  it('accepts generated adventurer character keys', () => {
    const keys = [
      'adventurer_cleric',
      'adventurer_treasurehunter',
      'adventurer_olivehood_archer',
      'adventurer_brownhood_archer',
      'adventurer_redbow_archer',
      'adventurer_greenbow_archer',
      'adventurer_bluequiver_archer',
      'adventurer_grayquiver_archer',
      'adventurer_redspearman',
      'adventurer_blondsword',
      'adventurer_furguard',
      'adventurer_packscout',
      'adventurer_helmhammer',
      'adventurer_bluebandana',
      'adventurer_purpleaxe',
      'adventurer_redplume_sword',
      'adventurer_blondshield_guard',
      'adventurer_greenscarf_dagger',
      'adventurer_headband_furguard',
      'adventurer_silverhair_spear',
      'adventurer_greenhood_archer',
      'adventurer_hornhelm_axe',
      'adventurer_redscarf_sword',
      'adventurer_bluescarf_spear',
      'adventurer_greenscarf_shield',
      'adventurer_redaxe_guard',
      'adventurer_plumehelm_sword',
      'adventurer_goldshield_guard',
      'adventurer_blackarmor_sword',
      'adventurer_greencloak_spear',
    ];

    for (const key of keys) {
      expect(normalizePlayerCharacter(key)).toBe(key);
    }
  });
});
