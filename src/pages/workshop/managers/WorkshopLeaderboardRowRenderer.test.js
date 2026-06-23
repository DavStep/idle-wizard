// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import {
  createWorkshopLeaderboardRow,
  createWorkshopLeaderboardUserLabel,
} from './WorkshopLeaderboardRowRenderer.js';

describe('WorkshopLeaderboardRowRenderer', () => {
  it('renders the shared leaderboard user/value row contract', () => {
    const onOpenPlayerInfo = vi.fn();
    const label = createWorkshopLeaderboardUserLabel(
      {
        identity: 'ada',
        rank: 7,
        name: 'Ada',
        allianceTag: 'day',
        allianceTagColor: 'blue',
        character: 'rowan',
        playerLevel: 5,
        points: 450,
      },
      {
        onOpenPlayerInfo,
        playerInfo: {
          worldEventPoints: 450,
        },
      },
    );
    const row = createWorkshopLeaderboardRow(label, '450', { current: true });

    expect(row.className).toBe(
      'workshop-page__row workshop-page__leaderboard-row workshop-page__leaderboard-current',
    );
    expect(row.querySelector('.row_key')?.textContent).toBe('7. [DAY] Ada (5)');
    expect(row.querySelector('.row_val')?.textContent).toBe('450');
    expect(
      row.querySelector('.workshop-page__leaderboard-character-icon')?.getAttribute('src'),
    ).toContain('rowan.webp');
    expect(row.querySelector('.workshop-page__alliance-tag')?.textContent).toBe(
      '[DAY]',
    );

    row.querySelector('.workshop-page__leaderboard-player-link')?.click();
    expect(onOpenPlayerInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        identity: 'ada',
        username: 'Ada',
        worldEventPoints: 450,
      }),
    );
  });

  it('keeps fallback rank labels without inventing a numbered rank', () => {
    const row = createWorkshopLeaderboardRow(
      createWorkshopLeaderboardUserLabel({
        rankLabel: '-',
        name: 'wizard',
        playerLevel: 1,
      }),
      '125',
      { current: true },
    );

    expect(row.querySelector('.row_key')?.textContent).toBe('- wizard (1)');
    expect(row.querySelector('.row_val')?.textContent).toBe('125');
  });
});
