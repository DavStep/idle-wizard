import { createAllianceTagSpan } from '../../shared/allianceTagLabel.js';
import { createPlayerCharacterIcon } from '../../shared/playerCharacterIcon.js';
import { createPlayerInfoLink } from '../../shared/playerInfoLink.js';

export function createWorkshopLeaderboardRow(
  label,
  value,
  { header = false, current = false, onActivate = null } = {},
) {
  const row = document.createElement('div');
  row.className = 'workshop-page__row workshop-page__leaderboard-row';

  if (header) {
    row.classList.add('workshop-page__leaderboard-header');
  }

  if (current) {
    row.classList.add('workshop-page__leaderboard-current');
  }

  if (typeof onActivate === 'function') {
    row.classList.add('is-actionable');
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
    row.addEventListener('click', () => onActivate());
    row.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }

      event.preventDefault();
      onActivate();
    });
  }

  const key = document.createElement('span');
  key.className = 'row_key';
  appendCellContent(key, label);

  const val = document.createElement('span');
  val.className = 'row_val';
  val.textContent = value;

  row.append(key, val);
  return row;
}

export function createWorkshopLeaderboardUserLabel(
  user,
  {
    index = 0,
    onOpenPlayerInfo = null,
    playerInfo = {},
    rankLabel = formatWorkshopLeaderboardRankLabel(user, index),
  } = {},
) {
  const tag = createAllianceTagSpan(user?.allianceTag, user?.allianceTagColor);
  const name = createPlayerInfoLink(
    {
      identity: user?.identity,
      username: user?.name,
      character: user?.character,
      allianceTag: user?.allianceTag,
      allianceTagColor: user?.allianceTagColor,
      playerLevel: user?.playerLevel,
      ...playerInfo,
    },
    {
      onOpenPlayerInfo,
      text: user?.name,
      className: 'workshop-page__leaderboard-player-link',
    },
  );
  const player = document.createElement('span');
  player.className = 'workshop-page__leaderboard-player';
  player.append(
    createPlayerCharacterIcon(
      user?.character,
      'workshop-page__leaderboard-character-icon',
    ),
    ...(tag ? [tag, document.createTextNode(' ')] : []),
    name,
  );

  return [
    document.createTextNode(`${rankLabel} `),
    player,
    document.createTextNode(` (${normalizeLeaderboardPlayerLevel(user?.playerLevel)})`),
  ];
}

export function formatWorkshopLeaderboardRankLabel(entry = {}, index = 0) {
  const rawRankLabel = String(entry?.rankLabel ?? '').trim();

  if (rawRankLabel) {
    return rawRankLabel === '-' || rawRankLabel.endsWith('.')
      ? rawRankLabel
      : `${rawRankLabel}.`;
  }

  return `${normalizeLeaderboardRank(entry?.rank) ?? index + 1}.`;
}

export function normalizeLeaderboardRank(rank) {
  const safeRank = Math.floor(Number(rank));

  if (!Number.isFinite(safeRank) || safeRank < 1) {
    return null;
  }

  return safeRank;
}

export function normalizeLeaderboardPlayerLevel(playerLevel) {
  const safePlayerLevel = Math.floor(Number(playerLevel));

  if (!Number.isFinite(safePlayerLevel) || safePlayerLevel < 1) {
    return 1;
  }

  return safePlayerLevel;
}

function appendCellContent(element, content) {
  if (Array.isArray(content)) {
    element.replaceChildren(...content);
    return;
  }

  if (content && typeof content === 'object' && typeof content.nodeType === 'number') {
    element.replaceChildren(content);
    return;
  }

  element.textContent = String(content ?? '');
}
