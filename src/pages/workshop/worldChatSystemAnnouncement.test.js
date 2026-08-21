import { describe, expect, it } from 'vitest';

import { parseWorldChatSystemPlayerAnnouncement } from './worldChatSystemAnnouncement.js';

describe('world chat system player announcements', () => {
  it.each([
    ['Mira founded the alliance.', 'founded the alliance.'],
    ['Mira joined the alliance.', 'joined the alliance.'],
    [
      'Mira was approved by Luna and joined the alliance.',
      'was approved by Luna and joined the alliance.',
    ],
    ['Mira left the alliance.', 'left the alliance.'],
    ['Mira was kicked by Luna.', 'was kicked by Luna.'],
    [
      'Mira was promoted to Trade Master by Luna; Luna was demoted to Trader.',
      'was promoted to Trade Master by Luna; Luna was demoted to Trader.',
    ],
  ])('extracts the announced alliance player from %s', (body, detail) => {
    expect(parseWorldChatSystemPlayerAnnouncement(body)).toEqual({
      username: 'Mira',
      detail: ` ${detail}`,
    });
  });
});
