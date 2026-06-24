export const DEFAULT_PLAYER_CHARACTER = 'elara';

const PLAYER_CHARACTER_KEYS = new Set([
  'elara',
  'mira',
  'bramble',
  'corvin',
  'juniper',
  'rowan',
  'adventurer_cleric',
  'adventurer_treasurehunter',
  'adventurer_olivehood_archer',
  'adventurer_brownhood_archer',
  'adventurer_redbow_archer',
  'adventurer_greenbow_archer',
  'adventurer_bluequiver_archer',
  'adventurer_grayquiver_archer',
  'adventurer_redscarf_sword',
  'adventurer_bluescarf_spear',
  'adventurer_greenscarf_shield',
  'adventurer_redaxe_guard',
  'adventurer_plumehelm_sword',
  'adventurer_goldshield_guard',
  'adventurer_blackarmor_sword',
  'adventurer_greencloak_spear',
  'adventurer_redspearman',
  'adventurer_blondsword',
  'adventurer_furguard',
  'adventurer_packscout',
  'adventurer_helmhammer',
  'adventurer_bluebandana',
  'adventurer_purpleaxe',
]);
const CHARACTER_ALIASES = new Map([
  ['witch', 'elara'],
  ['witch-guide', 'elara'],
  ['guide', 'elara'],
]);

export function normalizePlayerCharacter(character) {
  const value = String(character ?? '').trim().toLowerCase();
  const normalizedValue = CHARACTER_ALIASES.get(value) ?? value;
  return PLAYER_CHARACTER_KEYS.has(normalizedValue)
    ? normalizedValue
    : DEFAULT_PLAYER_CHARACTER;
}
