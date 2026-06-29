// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { TopPanelInboxManager } from './TopPanelInboxManager.js';
import { TopPanelViewManager } from './TopPanelViewManager.js';

function createInboxFacade(snapshot) {
  const listeners = new Set();
  return {
    getSnapshot: vi.fn(() => snapshot),
    subscribe: vi.fn((listener) => {
      listeners.add(listener);
      listener(snapshot);
      return () => listeners.delete(listener);
    }),
    markVisibleRead: vi.fn(() => ({ ok: true, count: 1 })),
    claimReward: vi.fn(() => Promise.resolve({ ok: true })),
    publish(nextSnapshot) {
      snapshot = nextSnapshot;
      for (const listener of listeners) {
        listener(snapshot);
      }
    },
  };
}

describe('TopPanelInboxManager', () => {
  it('opens inbox, marks visible mail read, and claims rewards', async () => {
    const stage = document.createElement('section');
    const viewManager = new TopPanelViewManager();
    viewManager.mount(stage);
    const snapshot = {
      connected: true,
      unreadCount: 1,
      claimableCount: 1,
      mail: [
        {
          mailKey: 'admin:gift:identity',
          senderLabel: 'admin',
          title: 'gift',
          body: 'take it',
          createdAtMs: Date.UTC(2026, 5, 29),
          read: false,
          hasReward: true,
          rewardCollected: false,
          rewardText: '5 coin',
          reward: { coin: 5, crystal: 0, ruby: 0, emerald: 0, items: [] },
        },
      ],
    };
    const inboxFacade = createInboxFacade(snapshot);
    const manager = new TopPanelInboxManager({ playerInboxFacade: inboxFacade });

    manager.mount(viewManager.getRefs());
    const popup = stage.querySelector('.room-top-panel__inbox-popup');

    expect(stage.querySelector('.room-top-panel__mail')).toBeNull();
    expect(popup?.hidden).toBe(true);

    manager.show();

    expect(popup.hidden).toBe(false);
    expect(inboxFacade.markVisibleRead).toHaveBeenCalledTimes(1);
    expect(popup.textContent).toContain('gift');
    expect(popup.textContent).toContain('5 coin');

    popup
      .querySelector('.room-top-panel__inbox-claim')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await Promise.resolve();

    expect(inboxFacade.claimReward).toHaveBeenCalledWith('admin:gift:identity');
    manager.unmount();
    viewManager.unmount();
  });
});
