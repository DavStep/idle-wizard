const SYSTEM_PLAYER_ANNOUNCEMENT_PATTERNS = [
  {
    pattern: /^(?<username>.{1,24})(?<detail> reached level \d+)$/u,
    usernameGroups: ['username'],
  },
  {
    pattern:
      /^(?<username>.{1,24})(?<detail> reached ⭐ \d+, completing prestige level \d+)$/u,
    usernameGroups: ['username'],
  },
  {
    pattern: /^(?<username>.{1,24})(?<detail> researched .+)$/u,
    usernameGroups: ['username'],
  },
  {
    pattern:
      /^(?<username>.{1,24})(?<detail> unlocked the recipe of .+)$/u,
    usernameGroups: ['username'],
  },
  {
    pattern: /^(?<username>.{1,24})(?<detail> founded the alliance\.)$/u,
    usernameGroups: ['username'],
  },
  {
    pattern: /^(?<username>.{1,24})(?<detail> joined the alliance\.)$/u,
    usernameGroups: ['username'],
  },
  {
    pattern:
      /^(?<username>.{1,24})(?<detail> was approved by (?<actor>.{1,24}) and joined the alliance\.)$/u,
    usernameGroups: ['username', 'actor'],
  },
  {
    pattern: /^(?<username>.{1,24})(?<detail> left the alliance\.)$/u,
    usernameGroups: ['username'],
  },
  {
    pattern:
      /^(?<username>.{1,24})(?<detail> was kicked by (?<actor>.{1,24})\.)$/u,
    usernameGroups: ['username', 'actor'],
  },
  {
    pattern:
      /^(?<username>.{1,24})(?<detail> was promoted to Trade Master by (?<actor>.{1,24}); (?<actorAgain>.{1,24}) was demoted to .+\.)$/u,
    usernameGroups: ['username', 'actor', 'actorAgain'],
  },
  {
    pattern:
      /^(?<username>.{1,24})(?<detail> was (?:promoted|demoted) to .+? by (?<actor>.{1,24})\.)$/u,
    usernameGroups: ['username', 'actor'],
  },
  {
    pattern:
      /^(?<username>.{1,24})(?<detail> was (?:promoted|demoted) to .+)$/u,
    usernameGroups: ['username'],
  },
];

export function parseWorldChatSystemPlayerAnnouncement(body) {
  const text = String(body ?? '');

  for (const { pattern, usernameGroups } of SYSTEM_PLAYER_ANNOUNCEMENT_PATTERNS) {
    const match = pattern.exec(text);

    if (match?.groups?.username && match.groups.detail) {
      const usernames = usernameGroups
        .map((group) => match.groups[group])
        .filter(Boolean);
      return {
        username: match.groups.username,
        detail: match.groups.detail,
        usernames,
        mentions: createUsernameMentions(text, usernames),
      };
    }
  }

  return null;
}

function createUsernameMentions(text, usernames) {
  let cursor = 0;
  return usernames.flatMap((username) => {
    const start = text.indexOf(username, cursor);
    if (start < 0) {
      return [];
    }
    const end = start + username.length;
    cursor = end;
    return [{ username, start, end }];
  });
}
