import { describe, expect, it, vi } from 'vitest';

import { WorldChatResearchAnnouncementManager } from './WorldChatResearchAnnouncementManager.js';

describe('WorldChatResearchAnnouncementManager', () => {
  it('normalizes and sends research announcements through the generated reducer', async () => {
    const announceResearch = vi.fn().mockResolvedValue(undefined);
    const manager = new WorldChatResearchAnnouncementManager();

    manager.connect({
      reducers: {
        announceResearch,
      },
    });

    await expect(manager.announceResearch('  sage   seed  ')).resolves.toEqual({
      ok: true,
      researchName: 'sage seed',
    });
    expect(announceResearch).toHaveBeenCalledWith({
      researchName: 'sage seed',
    });
  });

  it('fails softly when offline or empty', async () => {
    const manager = new WorldChatResearchAnnouncementManager();

    await expect(manager.announceResearch('')).resolves.toEqual({
      ok: false,
      reason: 'missing_research',
    });
    await expect(manager.announceResearch('Mana Tonic')).resolves.toEqual({
      ok: false,
      reason: 'offline',
      researchName: 'Mana Tonic',
    });
  });
});
