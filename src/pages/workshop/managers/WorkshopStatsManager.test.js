// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import {
  WorkshopStatsManager,
  createWorkshopStatsSnapshot,
} from './WorkshopStatsManager.js';

function createStatsSnapshot(overrides = {}) {
  return {
    stats: {
      seeds: {
        total: 3,
        items: [
          { key: 'sageSeed', label: 'sage seed', quantity: 2 },
          { key: 'mintSeed', label: 'mint seed', quantity: 1 },
        ],
      },
      herbs: {
        total: 5,
        items: [
          { key: 'sageHerb', label: 'sage', quantity: 5 },
          { key: 'mintHerb', label: 'mint', quantity: 0 },
        ],
      },
      potions: {
        total: 4,
        items: [
          { key: 'manaTonic', label: 'mana tonic', quantity: 4 },
          { key: 'wastedPotion', label: 'wasted potion', quantity: 0 },
        ],
      },
      coin: {
        npcTrade: 12,
        playerTrade: 8.5,
        royalties: {
          total: 2.5,
          items: [{ potionKey: 'manaTonic', potionLabel: 'mana tonic', coin: 2.5 }],
        },
      },
    },
    ...overrides,
  };
}

function createGameplayFacadeFake(snapshot = createStatsSnapshot()) {
  const listeners = new Set();
  let currentSnapshot = snapshot;

  return {
    getSnapshot: vi.fn(() => currentSnapshot),
    setSnapshot(nextSnapshot) {
      currentSnapshot = nextSnapshot;

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

function getTab(stats, id) {
  return stats.tabs.find((tab) => tab.id === id);
}

describe('WorkshopStatsManager', () => {
  it('creates stats tabs for generated seeds, herbs, brewed potions, and coin sources', () => {
    const stats = createWorkshopStatsSnapshot(createStatsSnapshot());

    expect(stats.tabs.map((tab) => tab.id)).toEqual(['seeds', 'herbs', 'potions', 'coin']);
    expect(getTab(stats, 'seeds').rows.map((row) => [row.label, row.status])).toEqual([
      ['total seeds generated', '3'],
      ['sage seed', '2'],
      ['mint seed', '1'],
    ]);
    expect(getTab(stats, 'herbs').rows.map((row) => [row.label, row.status])).toEqual([
      ['total herbs grown', '5'],
      ['sage', '5'],
      ['mint', '0'],
    ]);
    expect(getTab(stats, 'potions').rows.map((row) => [row.label, row.status])).toEqual([
      ['total potions brewed', '4'],
      ['mana tonic', '4'],
      ['wasted potion', '0'],
    ]);
    expect(getTab(stats, 'coin').rows.map((row) => [row.label, row.status])).toEqual([
      ['npc trade', '12 coin'],
      ['player trade', '9 coin'],
      ['royalties', '3 coin'],
      ['mana tonic royalties', '3 coin'],
    ]);
    expect(getTab(stats, 'seeds').rows[1]).toMatchObject({
      itemKey: 'sageSeed',
      itemKind: 'seed',
      resource: 'seed',
    });
    expect(getTab(stats, 'herbs').rows[1]).toMatchObject({
      itemKey: 'sageHerb',
      itemKind: 'herb',
      resource: 'herb',
    });
    expect(getTab(stats, 'potions').rows[1]).toMatchObject({
      itemKey: 'manaTonic',
      itemKind: 'potion',
      resource: 'potion',
    });
    expect(getTab(stats, 'coin').rows[0]).toMatchObject({
      resource: 'coin',
    });
  });

  it('defaults missing stats to zero rows without throwing', () => {
    const stats = createWorkshopStatsSnapshot({});

    expect(getTab(stats, 'seeds').rows).toEqual([
      {
        label: 'total seeds generated',
        status: '0',
        state: 'total',
      },
    ]);
    expect(getTab(stats, 'coin').rows.map((row) => row.status)).toEqual([
      '0 coin',
      '0 coin',
      '0 coin',
    ]);
  });

  it('renders a compact tabbed stats popup with colored item icons and coin values', () => {
    const gameplayFacade = createGameplayFacadeFake();
    const manager = new WorkshopStatsManager({ gameplayFacade });
    const parent = document.createElement('div');

    manager.mount(parent);
    manager.show();

    const popup = parent.querySelector('.workshop-page__stats-popup');
    const title = parent.querySelector('.workshop-page__stats-dialog .style-box__title');
    const rows = [...parent.querySelectorAll('.workshop-page__stats-row')];
    const tabs = [...parent.querySelectorAll('.workshop-page__stats-tab-button')];

    expect(popup?.hidden).toBe(false);
    expect(parent.querySelector('.workshop-page__stats-close')?.textContent).toBe('close');
    expect(title?.textContent).toBe('stats');
    expect(tabs.map((tab) => tab.textContent)).toEqual(['seeds', 'herbs', 'potions', 'coin']);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(rows[0].querySelector('.workshop-page__stats-number')).toBeNull();
    expect(rows[0].querySelector('.workshop-page__stats-name')?.textContent).toBe(
      'total seeds generated',
    );
    expect(rows[0].querySelector('.workshop-page__stats-status')?.textContent).toBe('3');
    expect(rows[1].getAttribute('data-resource-color')).toBe('seed');
    expect(rows[1].querySelector('.workshop-page__stats-name')?.textContent).toBe('sage seed');
    expect(
      rows[1].querySelector('.workshop-page__stats-name')?.classList.contains('style-seed-label'),
    ).toBe(true);
    expect(
      rows[1].querySelector('.workshop-page__stats-name .style-seed-label__icon'),
    ).not.toBeNull();

    tabs[1].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const herbRows = [...parent.querySelectorAll('.workshop-page__stats-row')];
    expect(herbRows[1].getAttribute('data-resource-color')).toBe('herb');
    expect(
      herbRows[1].querySelector('.workshop-page__stats-name .style-herb-label__icon')?.dataset
        .assetAtlasFrame,
    ).toBe('herb:sageHerb');

    tabs[2].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const potionRows = [...parent.querySelectorAll('.workshop-page__stats-row')];
    expect(
      potionRows[1].querySelector('.workshop-page__stats-name .style-potion-label__icon')?.dataset
        .assetAtlasFrame,
    ).toBe('potion:manaTonic');

    tabs[3].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(tabs[3].getAttribute('aria-selected')).toBe('true');
    expect(parent.textContent).toContain('player trade');
    expect(parent.textContent).toContain('mana tonic royalties');
    expect(
      parent.querySelector('.workshop-page__stats-status .style-resource-label--coin'),
    ).not.toBeNull();

    manager.unmount();
  });
});
