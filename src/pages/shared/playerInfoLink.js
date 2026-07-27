export function createPlayerInfoLink(
  player,
  {
    onOpenPlayerInfo,
    text = player?.username ?? player?.name ?? 'Wizard',
    className = '',
    doc = document,
  } = {},
) {
  if (typeof onOpenPlayerInfo !== 'function') {
    return doc.createTextNode(String(text ?? 'Wizard'));
  }

  const button = doc.createElement('button');
  button.className = ['room-player-info-link', className].filter(Boolean).join(' ');
  button.type = 'button';
  button.textContent = String(text ?? 'Wizard');
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onOpenPlayerInfo?.({
      ...player,
      username: player?.username ?? player?.name ?? text,
    });
  });
  return button;
}
