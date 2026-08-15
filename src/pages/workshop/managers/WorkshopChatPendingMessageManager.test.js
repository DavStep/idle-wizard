import { describe, expect, it } from 'vitest';

import { WorkshopChatPendingMessageManager } from './WorkshopChatPendingMessageManager.js';

describe('WorkshopChatPendingMessageManager', () => {
  it('preserves the selected player frame while a World Chat send is pending', () => {
    const manager = new WorkshopChatPendingMessageManager({
      now: () => 10_000,
      storage: null,
    });

    expect(
      manager.setMessages('world', [
        {
          id: 'local-world-1',
          username: 'Mira',
          character: 'mira',
          frame: 'violet',
          playerLevel: 7,
          body: 'Still here.',
          sentAtMs: 9_000,
        },
      ]),
    ).toEqual([
      expect.objectContaining({
        character: 'mira',
        frame: 'violet',
        username: 'Mira',
      }),
    ]);
  });
});
