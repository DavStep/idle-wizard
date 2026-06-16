import { describe, expect, it, vi } from 'vitest';

import { WorldChatPrestigeAnnouncementManager } from './WorldChatPrestigeAnnouncementManager.js';

describe('WorldChatPrestigeAnnouncementManager', () => {
  it('normalizes and sends prestige announcements through the generated reducer', async () => {
    const announcePrestige = vi.fn().mockResolvedValue(undefined);
    const manager = new WorldChatPrestigeAnnouncementManager();

    manager.connect({
      reducers: {
        announcePrestige,
      },
    });

    await expect(
      manager.announcePrestige({
        prestigeCount: 1.8,
        playerLevel: 9.9,
      }),
    ).resolves.toEqual({
      ok: true,
      prestigeCount: 1,
      playerLevel: 9,
    });
    expect(announcePrestige).toHaveBeenCalledWith({
      prestigeCount: 1,
      playerLevel: 9,
    });
  });

  it('fails softly when offline or invalid', async () => {
    const manager = new WorldChatPrestigeAnnouncementManager();

    await expect(manager.announcePrestige({ prestigeCount: 0, playerLevel: 9 })).resolves.toEqual({
      ok: false,
      reason: 'invalid_prestige',
    });
    await expect(manager.announcePrestige({ prestigeCount: 1, playerLevel: 9 })).resolves.toEqual({
      ok: false,
      reason: 'offline',
      prestigeCount: 1,
      playerLevel: 9,
    });
  });

  it('uses snake-case reducer bindings when camel-case bindings are missing', async () => {
    const announcePrestige = vi.fn().mockResolvedValue(undefined);
    const manager = new WorldChatPrestigeAnnouncementManager();

    manager.connect({
      reducers: {
        announce_prestige: announcePrestige,
      },
    });

    await expect(
      manager.announcePrestige({
        prestigeCount: 2,
        playerLevel: 10,
      }),
    ).resolves.toEqual({
      ok: true,
      prestigeCount: 2,
      playerLevel: 10,
    });
    expect(announcePrestige).toHaveBeenCalledWith({
      prestigeCount: 2,
      playerLevel: 10,
    });
  });
});
