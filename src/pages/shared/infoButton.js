const INFO_BUTTON_ICON_URL = new URL(
  '../../../assets/game/source/ui/prop_info.png',
  import.meta.url,
).href;

export function setInfoButtonIcon(button) {
  if (!button) return null;

  const image = button.ownerDocument.createElement('img');
  image.className = 'style-info-button__icon';
  image.src = INFO_BUTTON_ICON_URL;
  image.alt = '';
  image.draggable = false;
  image.decoding = 'async';
  image.setAttribute('aria-hidden', 'true');

  button.classList.add('style-info-button');
  button.replaceChildren(image);
  return image;
}
