import { describe, expect, it, vi } from 'vitest';

import { PlayerInboxActionManager } from './PlayerInboxActionManager.js';

describe('PlayerInboxActionManager', () => {
  it('calls read and collect reducers with normalized mail keys', async () => {
    const markPlayerInboxMailRead = vi.fn().mockResolvedValue(undefined);
    const collectPlayerInboxMailReward = vi.fn().mockResolvedValue(undefined);
    const manager = new PlayerInboxActionManager();

    manager.connect({
      reducers: {
        markPlayerInboxMailRead,
        collectPlayerInboxMailReward,
      },
    });

    await expect(manager.markRead(' mail-1 ')).resolves.toEqual({ ok: true });
    await expect(manager.collectReward(' mail-1 ')).resolves.toEqual({ ok: true });

    expect(markPlayerInboxMailRead).toHaveBeenCalledWith({ mailKey: 'mail-1' });
    expect(collectPlayerInboxMailReward).toHaveBeenCalledWith({ mailKey: 'mail-1' });
  });

  it('fails softly offline', async () => {
    const manager = new PlayerInboxActionManager();

    await expect(manager.markRead('mail')).resolves.toEqual({
      ok: false,
      reason: 'offline',
    });
  });
});
