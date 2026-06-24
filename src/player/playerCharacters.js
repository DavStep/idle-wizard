export const DEFAULT_PLAYER_CHARACTER = 'elara';

export const PLAYER_CHARACTER_OPTIONS = Object.freeze([
  Object.freeze({ key: 'elara', label: 'elara' }),
  Object.freeze({ key: 'mira', label: 'mira' }),
  Object.freeze({ key: 'bramble', label: 'bramble' }),
  Object.freeze({ key: 'corvin', label: 'corvin' }),
  Object.freeze({ key: 'juniper', label: 'juniper' }),
  Object.freeze({ key: 'rowan', label: 'rowan' }),
  Object.freeze({ key: 'adventurer_cleric', label: 'cleric' }),
  Object.freeze({ key: 'adventurer_treasurehunter', label: 'treasure hunter' }),
  Object.freeze({ key: 'adventurer_olivehood_archer', label: 'olive archer' }),
  Object.freeze({ key: 'adventurer_brownhood_archer', label: 'brown archer' }),
  Object.freeze({ key: 'adventurer_redbow_archer', label: 'red archer' }),
  Object.freeze({ key: 'adventurer_greenbow_archer', label: 'green archer' }),
  Object.freeze({ key: 'adventurer_bluequiver_archer', label: 'blue archer' }),
  Object.freeze({ key: 'adventurer_grayquiver_archer', label: 'gray archer' }),
  Object.freeze({ key: 'adventurer_redscarf_sword', label: 'red sword' }),
  Object.freeze({ key: 'adventurer_bluescarf_spear', label: 'blue spear' }),
  Object.freeze({ key: 'adventurer_greenscarf_shield', label: 'green shield' }),
  Object.freeze({ key: 'adventurer_redaxe_guard', label: 'red guard' }),
  Object.freeze({ key: 'adventurer_plumehelm_sword', label: 'plume sword' }),
  Object.freeze({ key: 'adventurer_goldshield_guard', label: 'gold guard' }),
  Object.freeze({ key: 'adventurer_blackarmor_sword', label: 'black sword' }),
  Object.freeze({ key: 'adventurer_greencloak_spear', label: 'green spear' }),
  Object.freeze({ key: 'adventurer_redspearman', label: 'red spearman' }),
  Object.freeze({ key: 'adventurer_blondsword', label: 'blond sword' }),
  Object.freeze({ key: 'adventurer_furguard', label: 'fur guard' }),
  Object.freeze({ key: 'adventurer_packscout', label: 'pack scout' }),
  Object.freeze({ key: 'adventurer_helmhammer', label: 'helm hammer' }),
  Object.freeze({ key: 'adventurer_bluebandana', label: 'blue bandana' }),
  Object.freeze({ key: 'adventurer_purpleaxe', label: 'purple axe' }),
]);

const PLAYER_CHARACTER_KEYS = new Set(
  PLAYER_CHARACTER_OPTIONS.map((character) => character.key),
);
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

export function getPlayerCharacterOptions() {
  return PLAYER_CHARACTER_OPTIONS.map((character) => ({ ...character }));
}
