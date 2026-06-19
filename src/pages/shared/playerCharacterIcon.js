import {
  DEFAULT_PLAYER_CHARACTER,
  normalizePlayerCharacter,
} from '../../player/playerCharacters.js';

const CHARACTER_IMAGE_URLS = Object.freeze({
  elara: new URL('../tutorial/assets/witch-guide.png', import.meta.url).href,
  mira: new URL('./assets/player-characters/mira.webp', import.meta.url).href,
  bramble: new URL('./assets/player-characters/bramble.webp', import.meta.url).href,
  corvin: new URL('./assets/player-characters/corvin.webp', import.meta.url).href,
  juniper: new URL('./assets/player-characters/juniper.webp', import.meta.url).href,
  rowan: new URL('./assets/player-characters/rowan.webp', import.meta.url).href,
  wizard: new URL('./assets/player-characters/wizard.webp', import.meta.url).href,
});

export function getPlayerCharacterImageUrl(character) {
  const key = normalizePlayerCharacter(character);
  return CHARACTER_IMAGE_URLS[key] ?? CHARACTER_IMAGE_URLS[DEFAULT_PLAYER_CHARACTER];
}

export function createPlayerCharacterIcon(character, className = '') {
  const img = document.createElement('img');
  img.className = ['style-player-character-icon', className].filter(Boolean).join(' ');
  img.src = getPlayerCharacterImageUrl(character);
  img.alt = '';
  img.loading = 'lazy';
  img.decoding = 'async';
  img.setAttribute('aria-hidden', 'true');
  return img;
}
