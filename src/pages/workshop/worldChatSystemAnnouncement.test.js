import { describe, expect, it } from 'vitest';

import { parseWorldChatSystemPlayerAnnouncement } from './worldChatSystemAnnouncement.js';

describe('world chat system player announcements', () => {
  it.each([
    ['Mira founded the alliance.', 'founded the alliance.', ['Mira']],
    ['Mira joined the alliance.', 'joined the alliance.', ['Mira']],
    [
      'Mira was approved by Luna and joined the alliance.',
      'was approved by Luna and joined the alliance.',
      ['Mira', 'Luna'],
    ],
    ['Mira left the alliance.', 'left the alliance.', ['Mira']],
    ['Mira was kicked by Luna.', 'was kicked by Luna.', ['Mira', 'Luna']],
    [
      'Mira was promoted to Trade Master by Luna; Luna was demoted to Trader.',
      'was promoted to Trade Master by Luna; Luna was demoted to Trader.',
      ['Mira', 'Luna', 'Luna'],
    ],
  ])('extracts every announced alliance player from %s', (body, detail, usernames) => {
    const announcement = parseWorldChatSystemPlayerAnnouncement(body);

    expect(announcement).toMatchObject({
      username: 'Mira',
      detail: ` ${detail}`,
      usernames,
    });
    expect(
      announcement.mentions.map(({ username, start, end }) => ({
        username,
        text: body.slice(start, end),
      })),
    ).toEqual(usernames.map((username) => ({ username, text: username })));
  });
});
