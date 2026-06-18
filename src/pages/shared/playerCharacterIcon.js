import {
  DEFAULT_PLAYER_CHARACTER,
  normalizePlayerCharacter,
} from '../../player/playerCharacters.js';

const CHARACTER_IMAGE_URLS = Object.freeze({
  elara: new URL('../tutorial/assets/witch-guide.png', import.meta.url).href,
  mira: new URL('../tutorial/assets/characters/mira.png', import.meta.url).href,
  bramble: new URL('../tutorial/assets/characters/bramble.png', import.meta.url).href,
  corvin: new URL('../tutorial/assets/characters/corvin.png', import.meta.url).href,
  juniper: new URL('../tutorial/assets/characters/juniper.png', import.meta.url).href,
  rowan: new URL('../tutorial/assets/characters/rowan.png', import.meta.url).href,
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
