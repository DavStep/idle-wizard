const SYSTEM_PLAYER_ANNOUNCEMENT_PATTERNS = [
  /^(?<username>.{1,24})(?<detail> reached level \d+)$/u,
  /^(?<username>.{1,24})(?<detail> reached ⭐ \d+, completing prestige level \d+)$/u,
  /^(?<username>.{1,24})(?<detail> researched .+)$/u,
  /^(?<username>.{1,24})(?<detail> unlocked the recipe of .+)$/u,
];

export function parseWorldChatSystemPlayerAnnouncement(body) {
  const text = String(body ?? '');

  for (const pattern of SYSTEM_PLAYER_ANNOUNCEMENT_PATTERNS) {
    const match = pattern.exec(text);

    if (match?.groups?.username && match.groups.detail) {
      return {
        username: match.groups.username,
        detail: match.groups.detail,
      };
    }
  }

  return null;
}
