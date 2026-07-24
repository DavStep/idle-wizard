import {
  DEFAULT_PLAYER_CHARACTER,
  normalizePlayerCharacter,
} from '../../player/playerCharacters.js';

const CHARACTER_IMAGE_URLS = Object.freeze({
  adventurer_blackarmor_sword: new URL(
    '../../../assets/game/source/characters/adventurer_blackarmor_sword.png',
    import.meta.url,
  ).href,
  adventurer_blacksmith: new URL(
    '../../../assets/game/source/characters/adventurer_blacksmith.png',
    import.meta.url,
  ).href,
  adventurer_blondshield_guard: new URL(
    '../../../assets/game/source/characters/adventurer_blondshield_guard.png',
    import.meta.url,
  ).href,
  adventurer_blondsword: new URL(
    '../../../assets/game/source/characters/adventurer_blondsword.png',
    import.meta.url,
  ).href,
  adventurer_bluebandana: new URL(
    '../../../assets/game/source/characters/adventurer_bluebandana.png',
    import.meta.url,
  ).href,
  adventurer_bluequiver_archer: new URL(
    '../../../assets/game/source/characters/adventurer_bluequiver_archer.png',
    import.meta.url,
  ).href,
  adventurer_bluescarf_spear: new URL(
    '../../../assets/game/source/characters/adventurer_bluescarf_spear.png',
    import.meta.url,
  ).href,
  adventurer_brownhood_archer: new URL(
    '../../../assets/game/source/characters/adventurer_brownhood_archer.png',
    import.meta.url,
  ).href,
  adventurer_cleric: new URL(
    '../../../assets/game/source/characters/adventurer_cleric.png',
    import.meta.url,
  ).href,
  adventurer_furguard: new URL(
    '../../../assets/game/source/characters/adventurer_furguard.png',
    import.meta.url,
  ).href,
  adventurer_goldshield_guard: new URL(
    '../../../assets/game/source/characters/adventurer_goldshield_guard.png',
    import.meta.url,
  ).href,
  adventurer_grayquiver_archer: new URL(
    '../../../assets/game/source/characters/adventurer_grayquiver_archer.png',
    import.meta.url,
  ).href,
  adventurer_greenbow_archer: new URL(
    '../../../assets/game/source/characters/adventurer_greenbow_archer.png',
    import.meta.url,
  ).href,
  adventurer_greencloak_spear: new URL(
    '../../../assets/game/source/characters/adventurer_greencloak_spear.png',
    import.meta.url,
  ).href,
  adventurer_greenhood_archer: new URL(
    '../../../assets/game/source/characters/adventurer_greenhood_archer.png',
    import.meta.url,
  ).href,
  adventurer_greenscarf_shield: new URL(
    '../../../assets/game/source/characters/adventurer_greenscarf_shield.png',
    import.meta.url,
  ).href,
  adventurer_greenscarf_dagger: new URL(
    '../../../assets/game/source/characters/adventurer_greenscarf_dagger.png',
    import.meta.url,
  ).href,
  adventurer_headband_furguard: new URL(
    '../../../assets/game/source/characters/adventurer_headband_furguard.png',
    import.meta.url,
  ).href,
  guild_secretary: new URL(
    '../../../assets/game/source/characters/guild_secretary.png',
    import.meta.url,
  ).href,
  adventurer_helmhammer: new URL(
    '../../../assets/game/source/characters/adventurer_helmhammer.png',
    import.meta.url,
  ).href,
  adventurer_hornhelm_axe: new URL(
    '../../../assets/game/source/characters/adventurer_hornhelm_axe.png',
    import.meta.url,
  ).href,
  adventurer_hoodblade: new URL(
    '../../../assets/game/source/characters/adventurer_hoodblade.png',
    import.meta.url,
  ).href,
  adventurer_lamplighter: new URL(
    '../../../assets/game/source/characters/adventurer_lamplighter.png',
    import.meta.url,
  ).href,
  adventurer_minstrel: new URL(
    '../../../assets/game/source/characters/adventurer_minstrel.png',
    import.meta.url,
  ).href,
  adventurer_olivehood_archer: new URL(
    '../../../assets/game/source/characters/adventurer_olivehood_archer.png',
    import.meta.url,
  ).href,
  adventurer_packscout: new URL(
    '../../../assets/game/source/characters/adventurer_packscout.png',
    import.meta.url,
  ).href,
  adventurer_planter: new URL(
    '../../../assets/game/source/characters/adventurer_planter.png',
    import.meta.url,
  ).href,
  adventurer_plumehelm_sword: new URL(
    '../../../assets/game/source/characters/adventurer_plumehelm_sword.png',
    import.meta.url,
  ).href,
  adventurer_pouchrunner: new URL(
    '../../../assets/game/source/characters/adventurer_pouchrunner.png',
    import.meta.url,
  ).href,
  adventurer_purpleaxe: new URL(
    '../../../assets/game/source/characters/adventurer_purpleaxe.png',
    import.meta.url,
  ).href,
  adventurer_redaxe_guard: new URL(
    '../../../assets/game/source/characters/adventurer_redaxe_guard.png',
    import.meta.url,
  ).href,
  adventurer_redbow_archer: new URL(
    '../../../assets/game/source/characters/adventurer_redbow_archer.png',
    import.meta.url,
  ).href,
  adventurer_redscarf_sword: new URL(
    '../../../assets/game/source/characters/adventurer_redscarf_sword.png',
    import.meta.url,
  ).href,
  adventurer_redplume_sword: new URL(
    '../../../assets/game/source/characters/adventurer_redplume_sword.png',
    import.meta.url,
  ).href,
  adventurer_redspearman: new URL(
    '../../../assets/game/source/characters/adventurer_redspearman.png',
    import.meta.url,
  ).href,
  adventurer_sapling: new URL(
    '../../../assets/game/source/characters/adventurer_sapling.png',
    import.meta.url,
  ).href,
  adventurer_scrollcap: new URL(
    '../../../assets/game/source/characters/adventurer_scrollcap.png',
    import.meta.url,
  ).href,
  adventurer_shadowdagger: new URL(
    '../../../assets/game/source/characters/adventurer_shadowdagger.png',
    import.meta.url,
  ).href,
  adventurer_silverhair_spear: new URL(
    '../../../assets/game/source/characters/adventurer_silverhair_spear.png',
    import.meta.url,
  ).href,
  adventurer_shieldguard: new URL(
    '../../../assets/game/source/characters/adventurer_shieldguard.png',
    import.meta.url,
  ).href,
  adventurer_steelward: new URL(
    '../../../assets/game/source/characters/adventurer_steelward.png',
    import.meta.url,
  ).href,
  adventurer_treasurehunter: new URL(
    '../../../assets/game/source/characters/adventurer_treasurehunter.png',
    import.meta.url,
  ).href,
  adventurer_troubadour: new URL(
    '../../../assets/game/source/characters/adventurer_troubadour.png',
    import.meta.url,
  ).href,
  adventurer_wayfinder: new URL(
    '../../../assets/game/source/characters/adventurer_wayfinder.png',
    import.meta.url,
  ).href,
  bard: new URL('../../../assets/game/source/characters/bard.png', import.meta.url).href,
  bramble: new URL('../../../assets/game/source/characters/bramble.png', import.meta.url).href,
  corvin: new URL('../../../assets/game/source/characters/corvin.png', import.meta.url).href,
  elara: new URL('../../../assets/game/source/characters/elara.png', import.meta.url).href,
  explorer: new URL('../../../assets/game/source/characters/explorer.png', import.meta.url).href,
  herbalist: new URL('../../../assets/game/source/characters/herbalist.png', import.meta.url).href,
  juniper: new URL('../../../assets/game/source/characters/juniper.png', import.meta.url).href,
  knight: new URL('../../../assets/game/source/characters/knight.png', import.meta.url).href,
  miner: new URL('../../../assets/game/source/characters/miner.png', import.meta.url).href,
  mira: new URL('../../../assets/game/source/characters/mira.png', import.meta.url).href,
  ranger: new URL('../../../assets/game/source/characters/ranger.png', import.meta.url).href,
  rogue: new URL('../../../assets/game/source/characters/rogue.png', import.meta.url).href,
  rowan: new URL('../../../assets/game/source/characters/rowan.png', import.meta.url).href,
  traveler: new URL('../../../assets/game/source/characters/traveler.png', import.meta.url).href,
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
