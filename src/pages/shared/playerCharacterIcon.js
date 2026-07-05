import {
  DEFAULT_PLAYER_CHARACTER,
  normalizePlayerCharacter,
} from '../../player/playerCharacters.js';

const CHARACTER_IMAGE_URLS = Object.freeze({
  adventurer_blackarmor_sword: new URL(
    '../../assets/characters/adventurer_blackarmor_sword.png',
    import.meta.url,
  ).href,
  adventurer_blacksmith: new URL(
    '../../assets/characters/adventurer_blacksmith.png',
    import.meta.url,
  ).href,
  adventurer_blondshield_guard: new URL(
    '../../assets/characters/adventurer_blondshield_guard.png',
    import.meta.url,
  ).href,
  adventurer_blondsword: new URL(
    '../../assets/characters/adventurer_blondsword.png',
    import.meta.url,
  ).href,
  adventurer_bluebandana: new URL(
    '../../assets/characters/adventurer_bluebandana.png',
    import.meta.url,
  ).href,
  adventurer_bluequiver_archer: new URL(
    '../../assets/characters/adventurer_bluequiver_archer.png',
    import.meta.url,
  ).href,
  adventurer_bluescarf_spear: new URL(
    '../../assets/characters/adventurer_bluescarf_spear.png',
    import.meta.url,
  ).href,
  adventurer_brownhood_archer: new URL(
    '../../assets/characters/adventurer_brownhood_archer.png',
    import.meta.url,
  ).href,
  adventurer_cleric: new URL(
    '../../assets/characters/adventurer_cleric.png',
    import.meta.url,
  ).href,
  adventurer_furguard: new URL(
    '../../assets/characters/adventurer_furguard.png',
    import.meta.url,
  ).href,
  adventurer_goldshield_guard: new URL(
    '../../assets/characters/adventurer_goldshield_guard.png',
    import.meta.url,
  ).href,
  adventurer_grayquiver_archer: new URL(
    '../../assets/characters/adventurer_grayquiver_archer.png',
    import.meta.url,
  ).href,
  adventurer_greenbow_archer: new URL(
    '../../assets/characters/adventurer_greenbow_archer.png',
    import.meta.url,
  ).href,
  adventurer_greencloak_spear: new URL(
    '../../assets/characters/adventurer_greencloak_spear.png',
    import.meta.url,
  ).href,
  adventurer_greenhood_archer: new URL(
    '../../assets/characters/adventurer_greenhood_archer.png',
    import.meta.url,
  ).href,
  adventurer_greenscarf_shield: new URL(
    '../../assets/characters/adventurer_greenscarf_shield.png',
    import.meta.url,
  ).href,
  adventurer_greenscarf_dagger: new URL(
    '../../assets/characters/adventurer_greenscarf_dagger.png',
    import.meta.url,
  ).href,
  adventurer_headband_furguard: new URL(
    '../../assets/characters/adventurer_headband_furguard.png',
    import.meta.url,
  ).href,
  guild_secretary: new URL(
    '../../assets/characters/guild_secretary.png',
    import.meta.url,
  ).href,
  adventurer_helmhammer: new URL(
    '../../assets/characters/adventurer_helmhammer.png',
    import.meta.url,
  ).href,
  adventurer_hornhelm_axe: new URL(
    '../../assets/characters/adventurer_hornhelm_axe.png',
    import.meta.url,
  ).href,
  adventurer_hoodblade: new URL(
    '../../assets/characters/adventurer_hoodblade.png',
    import.meta.url,
  ).href,
  adventurer_lamplighter: new URL(
    '../../assets/characters/adventurer_lamplighter.png',
    import.meta.url,
  ).href,
  adventurer_minstrel: new URL(
    '../../assets/characters/adventurer_minstrel.png',
    import.meta.url,
  ).href,
  adventurer_olivehood_archer: new URL(
    '../../assets/characters/adventurer_olivehood_archer.png',
    import.meta.url,
  ).href,
  adventurer_packscout: new URL(
    '../../assets/characters/adventurer_packscout.png',
    import.meta.url,
  ).href,
  adventurer_planter: new URL(
    '../../assets/characters/adventurer_planter.png',
    import.meta.url,
  ).href,
  adventurer_plumehelm_sword: new URL(
    '../../assets/characters/adventurer_plumehelm_sword.png',
    import.meta.url,
  ).href,
  adventurer_pouchrunner: new URL(
    '../../assets/characters/adventurer_pouchrunner.png',
    import.meta.url,
  ).href,
  adventurer_purpleaxe: new URL(
    '../../assets/characters/adventurer_purpleaxe.png',
    import.meta.url,
  ).href,
  adventurer_redaxe_guard: new URL(
    '../../assets/characters/adventurer_redaxe_guard.png',
    import.meta.url,
  ).href,
  adventurer_redbow_archer: new URL(
    '../../assets/characters/adventurer_redbow_archer.png',
    import.meta.url,
  ).href,
  adventurer_redscarf_sword: new URL(
    '../../assets/characters/adventurer_redscarf_sword.png',
    import.meta.url,
  ).href,
  adventurer_redplume_sword: new URL(
    '../../assets/characters/adventurer_redplume_sword.png',
    import.meta.url,
  ).href,
  adventurer_redspearman: new URL(
    '../../assets/characters/adventurer_redspearman.png',
    import.meta.url,
  ).href,
  adventurer_sapling: new URL(
    '../../assets/characters/adventurer_sapling.png',
    import.meta.url,
  ).href,
  adventurer_scrollcap: new URL(
    '../../assets/characters/adventurer_scrollcap.png',
    import.meta.url,
  ).href,
  adventurer_shadowdagger: new URL(
    '../../assets/characters/adventurer_shadowdagger.png',
    import.meta.url,
  ).href,
  adventurer_silverhair_spear: new URL(
    '../../assets/characters/adventurer_silverhair_spear.png',
    import.meta.url,
  ).href,
  adventurer_shieldguard: new URL(
    '../../assets/characters/adventurer_shieldguard.png',
    import.meta.url,
  ).href,
  adventurer_steelward: new URL(
    '../../assets/characters/adventurer_steelward.png',
    import.meta.url,
  ).href,
  adventurer_treasurehunter: new URL(
    '../../assets/characters/adventurer_treasurehunter.png',
    import.meta.url,
  ).href,
  adventurer_troubadour: new URL(
    '../../assets/characters/adventurer_troubadour.png',
    import.meta.url,
  ).href,
  adventurer_wayfinder: new URL(
    '../../assets/characters/adventurer_wayfinder.png',
    import.meta.url,
  ).href,
  bard: new URL('../../assets/characters/bard.png', import.meta.url).href,
  bramble: new URL('../../assets/characters/bramble.png', import.meta.url).href,
  corvin: new URL('../../assets/characters/corvin.png', import.meta.url).href,
  elara: new URL('../../assets/characters/elara.png', import.meta.url).href,
  explorer: new URL('../../assets/characters/explorer.png', import.meta.url).href,
  herbalist: new URL('../../assets/characters/herbalist.png', import.meta.url).href,
  juniper: new URL('../../assets/characters/juniper.png', import.meta.url).href,
  knight: new URL('../../assets/characters/knight.png', import.meta.url).href,
  miner: new URL('../../assets/characters/miner.png', import.meta.url).href,
  mira: new URL('../../assets/characters/mira.png', import.meta.url).href,
  ranger: new URL('../../assets/characters/ranger.png', import.meta.url).href,
  rogue: new URL('../../assets/characters/rogue.png', import.meta.url).href,
  rowan: new URL('../../assets/characters/rowan.png', import.meta.url).href,
  traveler: new URL('../../assets/characters/traveler.png', import.meta.url).href,
});

export function getCharacterImageUrl(character) {
  const key = String(character ?? '').trim().toLowerCase();
  return CHARACTER_IMAGE_URLS[key] ?? '';
}

export function createCharacterImage(character, className = '') {
  const img = document.createElement('img');
  img.className = className;
  img.src = getCharacterImageUrl(character);
  img.alt = '';
  img.loading = 'lazy';
  img.decoding = 'async';
  img.setAttribute('aria-hidden', 'true');
  return img;
}

export function getPlayerCharacterImageUrl(character) {
  const key = normalizePlayerCharacter(character);
  return getCharacterImageUrl(key) || getCharacterImageUrl(DEFAULT_PLAYER_CHARACTER);
}

export function createPlayerCharacterIcon(character, className = '') {
  const img = createCharacterImage(
    normalizePlayerCharacter(character),
    ['style-player-character-icon', className].filter(Boolean).join(' '),
  );
  return img;
}
