// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import {
  WorkshopLedgerManager,
  createWorkshopLedgerSnapshot,
} from './WorkshopLedgerManager.js';

function createGameplayFacadeFake(snapshot = {}) {
  const listeners = new Set();
  let currentSnapshot = {
    tasks: {
      currentLevel: 1,
      level: {
        tasks: [],
      },
    },
    inventory: [],
    seedInventory: [],
    garden: {
      herbs: [],
    },
    prestige: {
      completedLevels: [],
    },
    research: {
      completedResearchIds: [],
    },
    worldNotice: {
      current: null,
      archive: [],
    },
    ...snapshot,
  };

  return {
    getSnapshot: vi.fn(() => currentSnapshot),
    setSnapshot(nextSnapshot) {
      currentSnapshot = {
        ...currentSnapshot,
        ...nextSnapshot,
      };

      for (const listener of listeners) {
        listener(currentSnapshot);
      }
    },
    subscribe: vi.fn((listener) => {
      listeners.add(listener);
      listener(currentSnapshot);
      return () => listeners.delete(listener);
    }),
  };
}

function getTab(ledger, id) {
  return ledger.tabs.find((tab) => tab.id === id);
}

function getRow(tab, label) {
  return tab.rows.find((row) => row.label === label);
}

describe('WorkshopLedgerManager', () => {
  it('does not count the default sage seed unlock as a completed study', () => {
    const ledger = createWorkshopLedgerSnapshot({
      tasks: {
        currentLevel: 1,
        level: {
          tasks: [],
        },
      },
      research: {
        completedResearchIds: ['unlockSeed:sageSeed'],
      },
      prestige: {
        completedLevels: [],
      },
      worldNotice: {
        archive: [],
      },
    });

    expect(getRow(getTab(ledger, 'firsts'), 'first research completed')).toMatchObject({
      status: 'locked',
      state: 'locked',
    });
    expect(getRow(getTab(ledger, 'longRoad'), 'complete 10 research studies')).toMatchObject({
      status: '0/10',
      state: 'progress',
    });
  });

  it('derives quiet milestones from the existing gameplay snapshot', () => {
    const ledger = createWorkshopLedgerSnapshot({
      tasks: {
        currentLevel: 6,
        level: {
          tasks: [],
        },
      },
      seedInventory: [{ key: 'sageSeed', quantity: 0 }],
      inventory: [
        { kind: 'herb', key: 'sage', quantity: 2 },
        { kind: 'potion', key: 'manaTonic', quantity: 1 },
      ],
      garden: {
        herbs: [{ key: 'sage', quantity: 0 }],
      },
      research: {
        completedResearchIds: ['unlockSeed:sageSeed', 'unlockSeed:mintSeed'],
      },
      prestige: {
        completedLevels: [10],
      },
      worldNotice: {
        current: {
          completedRequests: 1,
          leaderboard: {
            currentPoints: 12,
          },
        },
        archive: [
          {
            periodKey: 'week-1',
            responseTier: 'strong',
            contributionPoints: 40,
          },
        ],
      },
    });

    expect(getTab(ledger, 'firsts').rows.map((row) => row.status)).toEqual([
      'done',
      'done',
      'done',
      'done',
      'done',
    ]);
    expect(getRow(getTab(ledger, 'chapters'), 'first world notice answered')).toMatchObject({
      status: 'done',
      state: 'done',
    });
    expect(getRow(getTab(ledger, 'longRoad'), 'reach level 10')).toMatchObject({
      status: 'done',
      state: 'done',
    });
    expect(getRow(getTab(ledger, 'longRoad'), 'reach level 20')).toMatchObject({
      status: '10/20',
      state: 'progress',
    });
    expect(getRow(getTab(ledger, 'longRoad'), 'complete 5 prestiges')).toMatchObject({
      status: '1/5',
      state: 'progress',
    });
    expect(getRow(getTab(ledger, 'longRoad'), 'complete 10 research studies')).toMatchObject({
      status: '1/10',
      state: 'progress',
    });
    expect(getRow(getTab(ledger, 'longRoad'), 'complete 3 world events')).toMatchObject({
      status: '1/3',
      state: 'progress',
    });
  });

  it('renders a compact tabbed ledger popup with numbered text rows', () => {
    const gameplayFacade = createGameplayFacadeFake({
      tasks: {
        currentLevel: 4,
        level: {
          tasks: [],
        },
      },
      research: {
        completedResearchIds: ['unlockSeed:sageSeed', 'unlockSeed:mintSeed'],
      },
    });
    const manager = new WorkshopLedgerManager({ gameplayFacade });
    const parent = document.createElement('div');

    manager.mount(parent);
    manager.show();

    const popup = parent.querySelector('.workshop-page__ledger-popup');
    const title = parent.querySelector('.workshop-page__ledger-dialog .style-box__title');
    const rows = [...parent.querySelectorAll('.workshop-page__ledger-row')];
    const tabs = [...parent.querySelectorAll('.workshop-page__ledger-tab-button')];

    expect(popup?.hidden).toBe(false);
    expect(parent.querySelector('.workshop-page__ledger-close')?.textContent).toBe('close');
    expect(title?.textContent).toBe('ledger');
    expect(tabs.map((tab) => tab.textContent)).toEqual(['firsts', 'chapters', 'long road']);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(rows[0].querySelector('.workshop-page__ledger-number')?.textContent).toBe('1.');
    expect(rows[0].querySelector('.workshop-page__ledger-name')?.textContent).toBe(
      'first seed summoned',
    );
    expect(rows[0].querySelector('.workshop-page__ledger-status')?.textContent).toBe('done');
    expect(parent.querySelector('img, svg')).toBeNull();

    tabs[2].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(tabs[2].getAttribute('aria-selected')).toBe('true');
    expect(parent.textContent).toContain('reach level 10');

    manager.unmount();
  });
});
