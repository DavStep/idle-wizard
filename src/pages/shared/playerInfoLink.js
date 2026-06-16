export function createPlayerInfoLink(
  player,
  {
    onOpenPlayerInfo,
    text = player?.username ?? player?.name ?? 'wizard',
    className = '',
    doc = document,
  } = {},
) {
  if (typeof onOpenPlayerInfo !== 'function') {
    return doc.createTextNode(String(text ?? 'wizard'));
  }

  const button = doc.createElement('button');
  button.className = ['room-player-info-link', className].filter(Boolean).join(' ');
  button.type = 'button';
  button.textContent = String(text ?? 'wizard');
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
