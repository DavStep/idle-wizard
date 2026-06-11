import { describe, expect, it, vi } from 'vitest';

import { WorldChatLevelUpAnnouncementManager } from './WorldChatLevelUpAnnouncementManager.js';

describe('WorldChatLevelUpAnnouncementManager', () => {
  it('normalizes and sends level-up announcements through the generated reducer', async () => {
    const announceLevelUp = vi.fn().mockResolvedValue(undefined);
    const manager = new WorldChatLevelUpAnnouncementManager();

    manager.connect({
      reducers: {
        announceLevelUp,
      },
    });

    await expect(manager.announceLevelUp(2.8)).resolves.toEqual({
      ok: true,
      playerLevel: 2,
    });
    expect(announceLevelUp).toHaveBeenCalledWith({
      playerLevel: 2,
    });
  });

  it('fails softly when offline or invalid', async () => {
    const manager = new WorldChatLevelUpAnnouncementManager();

    await expect(manager.announceLevelUp(1)).resolves.toEqual({
      ok: false,
      reason: 'invalid_player_level',
    });
    await expect(manager.announceLevelUp(2)).resolves.toEqual({
      ok: false,
      reason: 'offline',
      playerLevel: 2,
    });
  });

  it('uses snake-case reducer bindings when camel-case bindings are missing', async () => {
    const announceLevelUp = vi.fn().mockResolvedValue(undefined);
    const manager = new WorldChatLevelUpAnnouncementManager();

    manager.connect({
      reducers: {
        announce_level_up: announceLevelUp,
      },
    });

    await expect(manager.announceLevelUp(3)).resolves.toEqual({
      ok: true,
      playerLevel: 3,
    });
    expect(announceLevelUp).toHaveBeenCalledWith({
      playerLevel: 3,
    });
  });
});
