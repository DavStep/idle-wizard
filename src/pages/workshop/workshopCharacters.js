const WORKSHOP_CHARACTER_IMAGE_URLS = Object.freeze({
  personalTasks: new URL('./assets/characters/miso.webp', import.meta.url).href,
  worldNotice: new URL('./assets/characters/guild-secretary.webp', import.meta.url).href,
});

export function getWorkshopCharacterImageUrl(character) {
  return WORKSHOP_CHARACTER_IMAGE_URLS[character] ?? '';
}

export function createWorkshopCharacterPortrait(character, className = '') {
  const img = document.createElement('img');
  img.className = ['workshop-page__feature-character', className]
    .filter(Boolean)
    .join(' ');
  img.src = getWorkshopCharacterImageUrl(character);
  img.alt = '';
  img.loading = 'lazy';
  img.decoding = 'async';
  img.setAttribute('aria-hidden', 'true');
  return img;
}
