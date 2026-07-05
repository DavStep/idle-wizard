export const DEFAULT_GUILD_ADVENTURER_ICON_KEY = 'adventurer_packscout';

export const GUILD_ADVENTURER_ICON_KEYS = Object.freeze([
  'adventurer_blackarmor_sword',
  'adventurer_blacksmith',
  'adventurer_blondshield_guard',
  'adventurer_blondsword',
  'adventurer_bluebandana',
  'adventurer_bluequiver_archer',
  'adventurer_bluescarf_spear',
  'adventurer_brownhood_archer',
  'adventurer_cleric',
  'adventurer_furguard',
  'adventurer_goldshield_guard',
  'adventurer_grayquiver_archer',
  'adventurer_greenbow_archer',
  'adventurer_greencloak_spear',
  'adventurer_greenhood_archer',
  'adventurer_greenscarf_dagger',
  'adventurer_greenscarf_shield',
  'adventurer_headband_furguard',
  'adventurer_helmhammer',
  'adventurer_hornhelm_axe',
  'adventurer_hoodblade',
  'adventurer_lamplighter',
  'adventurer_minstrel',
  'adventurer_olivehood_archer',
  'adventurer_packscout',
  'adventurer_planter',
  'adventurer_plumehelm_sword',
  'adventurer_pouchrunner',
  'adventurer_purpleaxe',
  'adventurer_redaxe_guard',
  'adventurer_redbow_archer',
  'adventurer_redplume_sword',
  'adventurer_redscarf_sword',
  'adventurer_redspearman',
  'adventurer_sapling',
  'adventurer_scrollcap',
  'adventurer_shadowdagger',
  'adventurer_shieldguard',
  'adventurer_silverhair_spear',
  'adventurer_steelward',
  'adventurer_treasurehunter',
  'adventurer_troubadour',
  'adventurer_wayfinder',
  'bard',
  'explorer',
  'herbalist',
  'knight',
  'miner',
  'ranger',
  'rogue',
  'traveler',
]);

const GUILD_ADVENTURER_ICON_KEY_SET = new Set(GUILD_ADVENTURER_ICON_KEYS);

const PERSONALITY_ICON_POOLS = Object.freeze({
  brawler: [
    'adventurer_redscarf_sword',
    'adventurer_redplume_sword',
    'adventurer_redaxe_guard',
    'adventurer_helmhammer',
    'knight',
  ],
  burglar: [
    'adventurer_shadowdagger',
    'adventurer_greenscarf_dagger',
    'adventurer_hoodblade',
    'adventurer_pouchrunner',
    'rogue',
  ],
  coward: [
    'adventurer_greenscarf_shield',
    'adventurer_blondshield_guard',
    'adventurer_shieldguard',
    'adventurer_steelward',
    'traveler',
  ],
  drinker: [
    'adventurer_bluebandana',
    'adventurer_furguard',
    'adventurer_headband_furguard',
    'adventurer_blacksmith',
    'miner',
  ],
  family: [
    'adventurer_cleric',
    'adventurer_planter',
    'adventurer_sapling',
    'herbalist',
  ],
  gambler: [
    'adventurer_treasurehunter',
    'adventurer_wayfinder',
    'adventurer_bluebandana',
    'traveler',
  ],
  gloryHound: [
    'adventurer_plumehelm_sword',
    'adventurer_hornhelm_axe',
    'adventurer_goldshield_guard',
    'adventurer_purpleaxe',
    'bard',
  ],
  loyal: [
    'adventurer_steelward',
    'adventurer_goldshield_guard',
    'adventurer_greenscarf_shield',
    'knight',
  ],
  reckless: [
    'adventurer_redspearman',
    'adventurer_silverhair_spear',
    'adventurer_bluescarf_spear',
    'adventurer_redbow_archer',
    'ranger',
  ],
  romantic: [
    'adventurer_minstrel',
    'adventurer_troubadour',
    'bard',
    'adventurer_blondsword',
  ],
  scholar: [
    'adventurer_scrollcap',
    'adventurer_lamplighter',
    'adventurer_cleric',
    'explorer',
  ],
});

const STAT_ICON_POOLS = Object.freeze({
  agility: [
    'adventurer_redbow_archer',
    'adventurer_greenbow_archer',
    'adventurer_greenhood_archer',
    'adventurer_bluequiver_archer',
    'ranger',
  ],
  charisma: [
    'adventurer_minstrel',
    'adventurer_troubadour',
    'bard',
    'adventurer_goldshield_guard',
  ],
  cunning: [
    'adventurer_shadowdagger',
    'adventurer_greenscarf_dagger',
    'adventurer_hoodblade',
    'adventurer_treasurehunter',
    'rogue',
  ],
  discipline: [
    'adventurer_steelward',
    'adventurer_silverhair_spear',
    'adventurer_cleric',
    'adventurer_shieldguard',
    'adventurer_greencloak_spear',
  ],
  endurance: [
    'adventurer_greenscarf_shield',
    'adventurer_furguard',
    'adventurer_headband_furguard',
    'adventurer_blackarmor_sword',
    'knight',
  ],
  luck: [
    'adventurer_wayfinder',
    'adventurer_treasurehunter',
    'adventurer_bluebandana',
    'traveler',
  ],
  strength: [
    'adventurer_redscarf_sword',
    'adventurer_redaxe_guard',
    'adventurer_hornhelm_axe',
    'adventurer_helmhammer',
    'adventurer_purpleaxe',
  ],
  wisdom: [
    'adventurer_scrollcap',
    'adventurer_lamplighter',
    'adventurer_cleric',
    'explorer',
  ],
});

const FALLBACK_ICON_POOL = Object.freeze([
  DEFAULT_GUILD_ADVENTURER_ICON_KEY,
  'adventurer_olivehood_archer',
  'adventurer_brownhood_archer',
  'adventurer_greenhood_archer',
  'adventurer_grayquiver_archer',
  'adventurer_greencloak_spear',
]);

export function isGuildAdventurerIconKey(iconKey) {
  return GUILD_ADVENTURER_ICON_KEY_SET.has(normalizeIconKey(iconKey));
}

export function normalizeGuildAdventurerIconKey(
  iconKey,
  fallback = DEFAULT_GUILD_ADVENTURER_ICON_KEY,
) {
  const key = normalizeIconKey(iconKey);

  if (GUILD_ADVENTURER_ICON_KEY_SET.has(key)) {
    return key;
  }

  const fallbackKey = normalizeIconKey(fallback);
  return GUILD_ADVENTURER_ICON_KEY_SET.has(fallbackKey)
    ? fallbackKey
    : DEFAULT_GUILD_ADVENTURER_ICON_KEY;
}

export function pickGuildAdventurerIconKey({ personalityId, stats } = {}, rng = Math.random) {
  const personalityPool = PERSONALITY_ICON_POOLS[String(personalityId ?? '')] ?? [];
  const statPool = STAT_ICON_POOLS[getStrongestStat(stats)] ?? [];
  const pool = uniqueIconKeys([...personalityPool, ...statPool, ...FALLBACK_ICON_POOL]);
  return pick(rng, pool);
}

function getStrongestStat(stats = {}) {
  let strongestStat = '';
  let strongestValue = -Infinity;

  for (const [stat, value] of Object.entries(stats ?? {})) {
    const numericValue = Math.max(0, Math.floor(Number(value) || 0));

    if (numericValue > strongestValue) {
      strongestStat = stat;
      strongestValue = numericValue;
    }
  }

  return strongestStat;
}

function uniqueIconKeys(iconKeys) {
  return [...new Set(iconKeys.map(normalizeIconKey))].filter((iconKey) =>
    GUILD_ADVENTURER_ICON_KEY_SET.has(iconKey),
  );
}

function pick(rng, items) {
  const list = items.length > 0 ? items : [DEFAULT_GUILD_ADVENTURER_ICON_KEY];
  const next = typeof rng === 'function' ? rng() : 0;
  const normalized = Number.isFinite(next) ? next : 0;
  return list[Math.floor(Math.max(0, normalized) * list.length) % list.length];
}

function normalizeIconKey(iconKey) {
  return String(iconKey ?? '').trim().toLowerCase();
}
