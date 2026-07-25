import { describe, expect, it, vi } from 'vitest';

import { createGuild } from './createGuild.js';

describe('createGuild', () => {
  it('copies current Guild snapshots and routes facade aliases once', () => {
    const actions = {
      createGuild: vi.fn(() => ({ ok: true })),
      fireGuildAdventurer: vi.fn(),
      hireGuildApplicant: vi.fn(() => ({ ok: true })),
      postGuildRequest: vi.fn(() => ({ ok: true })),
      removeGuildRequest: vi.fn(() => ({ ok: true })),
      updateGuildProfile: vi.fn(() => ({ ok: true })),
      upgradeGuildSecretary: vi.fn(),
      upgradeSecretary: vi.fn(() => ({ ok: true })),
    };
    const model = createGuild({
      gameplaySnapshot: {
        guild: {
          unlocked: true,
          created: true,
          profile: {
            name: 'ash hall',
            tag: 'ASH',
            color: 'red',
          },
          secretary: {
            level: 1,
            hiredCap: 2,
            boardSlots: 3,
            canUpgrade: true,
            next: {
              level: 2,
              costCoin: 100,
            },
          },
          board: [
            {
              id: 'request-1',
              title: 'lost lantern',
              stats: ['wits'],
              rewardText: '12 coin',
            },
          ],
          adventurers: [
            {
              id: 'adventurer-1',
              name: 'mira',
              epithet: 'the quiet',
              level: 2,
              status: 'hospital',
              stats: { wits: 4 },
            },
          ],
          applicants: [],
          logs: ['the hall is quiet.'],
        },
      },
      selectedTabId: 'roster',
      gameplayActions: actions,
    });

    expect(model.selectedTabId).toBe('adventurers');
    expect(model.guild.board[0]).toMatchObject({
      id: 'request-1',
      statLabel: 'wits',
      rewardText: '12 coin',
    });
    expect(model.guild.adventurers[0]).toMatchObject({
      displayName: 'mira the quiet',
      statusLabel: 'hospital',
    });
    expect(model.guild.logs[0]).toMatchObject({
      id: 0,
      text: 'the hall is quiet.',
    });

    model.actions.upgradeSecretary();
    expect(actions.upgradeGuildSecretary).toHaveBeenCalledTimes(1);
    expect(actions.upgradeSecretary).not.toHaveBeenCalled();

    model.actions.fireAdventurer('adventurer-1');
    expect(actions.fireGuildAdventurer).toHaveBeenCalledWith(
      'adventurer-1',
    );
  });

  it('adapts subscribed GameplayFacade snapshots', () => {
    let emit;
    const model = createGuild({
      gameplaySnapshot: {
        guild: { unlocked: false, created: false },
      },
      subscribe(listener) {
        emit = listener;
        return () => {};
      },
    });
    const listener = vi.fn();
    model.subscribe(listener);
    emit({
      guild: {
        unlocked: true,
        created: false,
        canCreate: true,
      },
    });

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        guild: expect.objectContaining({
          unlocked: true,
          created: false,
          canCreate: true,
        }),
      }),
    );
  });
});
