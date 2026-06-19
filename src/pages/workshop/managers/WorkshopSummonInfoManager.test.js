// @vitest-environment jsdom

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { cwd } from 'node:process';

import { describe, expect, it } from 'vitest';

import { WorkshopSummonInfoManager } from './WorkshopSummonInfoManager.js';

function createGameplayFacadeFake(snapshot) {
  const listeners = new Set();

  const facade = {
    getSnapshot: () => snapshot,
    publish: () => {
      for (const listener of listeners) {
        listener(snapshot);
      }
    },
    subscribe: (listener) => {
      listeners.add(listener);
      listener(snapshot);
      return () => listeners.delete(listener);
    },
    toggleSeedSummoningAutoEnabled: () => {
      const autoSummoning = (snapshot.seedSummoning.autoSummoning ??= {});
      autoSummoning.enabled = autoSummoning.enabled === false;
      facade.publish();
      return { ok: true, enabled: autoSummoning.enabled };
    },
    setSeedSummoningManaReserve: (value) => {
      const autoSummoning = (snapshot.seedSummoning.autoSummoning ??= {});
      const manaReserve = Math.max(0, Math.floor(Number(value)) || 0);
      autoSummoning.manaReserve = manaReserve;
      facade.publish();
      return { ok: true, manaReserve };
    },
    setSeedDropPreference: (seedKey, preference) => {
      const row = snapshot.seedSummoning.dropChances.find((seed) => seed.key === seedKey);

      if (!row) {
        return { ok: false, reason: 'unknown_seed' };
      }

      row.dropPreference = preference;
      facade.publish();
      return { ok: true, seedKey, preference };
    },
  };

  return facade;
}

describe('WorkshopSummonInfoManager', () => {
  it('shows unlocked seed drop chances', () => {
    const gameplayFacade = createGameplayFacadeFake({
      seedSummoning: {
        autoSummoning: {
          unlocked: true,
          enabled: true,
          manaReserve: 25,
          maxManaReserve: 5_000,
        },
        dropChances: [
          {
            itemTypeId: 1,
            key: 'sageSeed',
            label: 'sage seed',
            kind: 'seed',
            dropPreference: 'medium',
            dropChance: 0.25,
          },
          {
            itemTypeId: 2,
            key: 'mintSeed',
            label: 'mint seed',
            kind: 'seed',
            dropPreference: 'medium',
            dropChance: 0.75,
          },
        ],
      },
    });
    const manager = new WorkshopSummonInfoManager({ gameplayFacade });
    const parent = document.createElement('div');

    manager.mount(parent);
    manager.show();

    const popup = parent.querySelector('.workshop-page__summon-info-popup');
    const rows = [
      ...parent.querySelectorAll(
        '.workshop-page__summon-info-rows .workshop-page__summon-info-row',
      ),
    ];

    expect(popup?.hidden).toBe(false);
    expect(parent.querySelector('.style-box__title')?.textContent).toBe(
      'summoning seeds',
    );
    expect(parent.querySelector('.workshop-page__summon-info-action')?.textContent).toBe(
      'enabled',
    );
    expect(
      [
        ...parent.querySelectorAll('.workshop-page__summon-info-auto .row_key'),
      ].map((row) => row.textContent),
    ).toEqual(['auto summon', 'keep mana above']);
    expect(parent.querySelector('.workshop-page__summon-info-reserve-input')?.value).toBe(
      '25',
    );
    expect(
      [
        ...parent.querySelectorAll(
          '.workshop-page__summon-info-header .row_key, .workshop-page__summon-info-header .workshop-page__summon-info-weight-header, .workshop-page__summon-info-header .workshop-page__summon-info-chance',
        ),
      ].map((column) => column.textContent),
    ).toEqual(['name', 'weight', 'chance']);
    expect(
      rows.map(
        (row) =>
          `${row.querySelector('.row_key')?.textContent}:${
            row.querySelector('.workshop-page__summon-info-weight-button')?.textContent
          }:${row.querySelector('.workshop-page__summon-info-chance')?.textContent}`,
      ),
    ).toEqual(['sage seed:medium:25%', 'mint seed:medium:75%']);

    parent
      .querySelector('.workshop-page__summon-info-close')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popup?.hidden).toBe(true);

    manager.unmount();
  });

  it('marks drop chance percentages with rate color buckets', () => {
    const gameplayFacade = createGameplayFacadeFake({
      seedSummoning: {
        dropChances: [
          {
            itemTypeId: 1,
            key: 'sageSeed',
            label: 'sage seed',
            kind: 'seed',
            dropPreference: 'none',
            dropChance: 0,
          },
          {
            itemTypeId: 2,
            key: 'mintSeed',
            label: 'mint seed',
            kind: 'seed',
            dropPreference: 'low',
            dropChance: 0.25,
          },
          {
            itemTypeId: 3,
            key: 'nettleSeed',
            label: 'nettle seed',
            kind: 'seed',
            dropPreference: 'medium',
            dropChance: 0.5,
          },
          {
            itemTypeId: 4,
            key: 'lavenderSeed',
            label: 'lavender seed',
            kind: 'seed',
            dropPreference: 'high',
            dropChance: 0.75,
          },
        ],
      },
    });
    const manager = new WorkshopSummonInfoManager({ gameplayFacade });
    const parent = document.createElement('div');

    manager.mount(parent);
    manager.show();

    const chances = [
      ...parent.querySelectorAll(
        '.workshop-page__summon-info-rows .workshop-page__summon-info-chance',
      ),
    ];

    expect(chances.map((chance) => chance.textContent)).toEqual([
      '0%',
      '25%',
      '50%',
      '75%',
    ]);
    expect(chances.map((chance) => chance.dataset.dropRateColor)).toEqual([
      'none',
      'low',
      'medium',
      'high',
    ]);

    manager.unmount();
  });

  it('marks drop weight preferences with color buckets', () => {
    const gameplayFacade = createGameplayFacadeFake({
      seedSummoning: {
        dropChances: [
          {
            itemTypeId: 1,
            key: 'sageSeed',
            label: 'sage seed',
            kind: 'seed',
            dropPreference: 'none',
            dropChance: 0,
          },
          {
            itemTypeId: 2,
            key: 'mintSeed',
            label: 'mint seed',
            kind: 'seed',
            dropPreference: 'low',
            dropChance: 0.25,
          },
          {
            itemTypeId: 3,
            key: 'nettleSeed',
            label: 'nettle seed',
            kind: 'seed',
            dropPreference: 'medium',
            dropChance: 0.5,
          },
          {
            itemTypeId: 4,
            key: 'lavenderSeed',
            label: 'lavender seed',
            kind: 'seed',
            dropPreference: 'high',
            dropChance: 0.75,
          },
        ],
      },
    });
    const manager = new WorkshopSummonInfoManager({ gameplayFacade });
    const parent = document.createElement('div');

    manager.mount(parent);
    manager.show();

    const weights = [
      ...parent.querySelectorAll('.workshop-page__summon-info-weight-button'),
    ];

    expect(weights.map((weight) => weight.textContent)).toEqual([
      'none',
      'low',
      'medium',
      'high',
    ]);
    expect(weights.map((weight) => weight.dataset.dropWeightColor)).toEqual([
      'none',
      'low',
      'medium',
      'high',
    ]);

    manager.unmount();
  });

  it('routes drop chance color buckets through color-mode resource variables', async () => {
    const css = await readFile(path.join(cwd(), 'src/styles/base.css'), 'utf8');

    expect(css).toContain(
      '.workshop-page__summon-info-chance[data-drop-rate-color="none"]',
    );
    expect(css).toContain('color: var(--style-resource-ruby);');
    expect(css).toContain('color: var(--style-resource-seed);');
    expect(css).toContain('color: var(--style-resource-gold);');
    expect(css).toContain('color: var(--style-resource-herb);');
  });

  it('routes drop weight color buckets through color-mode resource variables', async () => {
    const css = await readFile(path.join(cwd(), 'src/styles/base.css'), 'utf8');

    expect(css).toContain(
      '.workshop-page__summon-info-weight-button[data-drop-weight-color="none"]',
    );
    expect(css).toContain(
      '.workshop-page__summon-info-weight-option[data-drop-weight-color="high"]',
    );
    expect(css).toContain('color: var(--style-resource-ruby);');
    expect(css).toContain('color: var(--style-resource-seed);');
    expect(css).toContain('color: var(--style-resource-gold);');
    expect(css).toContain('color: var(--style-resource-herb);');
  });

  it('updates auto summon controls', () => {
    const gameplayFacade = createGameplayFacadeFake({
      seedSummoning: {
        autoSummoning: {
          unlocked: true,
          enabled: true,
          manaReserve: 0,
          maxManaReserve: 5_000,
        },
        dropChances: [],
      },
    });
    const manager = new WorkshopSummonInfoManager({ gameplayFacade });
    const parent = document.createElement('div');

    manager.mount(parent);
    manager.show();

    const toggle = parent.querySelector('.workshop-page__summon-info-action');
    const input = parent.querySelector('.workshop-page__summon-info-reserve-input');

    toggle.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(toggle.textContent).toBe('disabled');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');

    input.value = '40';
    input.dispatchEvent(new window.Event('change', { bubbles: true }));

    expect(gameplayFacade.getSnapshot().seedSummoning.autoSummoning.manaReserve).toBe(40);
    expect(input.value).toBe('40');

    manager.unmount();
  });

  it('updates seed drop preferences from dropdowns', () => {
    const gameplayFacade = createGameplayFacadeFake({
      seedSummoning: {
        dropChances: [
          {
            itemTypeId: 1,
            key: 'sageSeed',
            label: 'sage seed',
            kind: 'seed',
            dropPreference: 'medium',
            dropChance: 1,
          },
        ],
      },
    });
    const manager = new WorkshopSummonInfoManager({ gameplayFacade });
    const parent = document.createElement('div');

    manager.mount(parent);
    manager.show();

    const button = parent.querySelector('.workshop-page__summon-info-weight-button');

    button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(
      [
        ...parent.querySelectorAll('.workshop-page__summon-info-weight-option'),
      ].map((option) => [
        option.textContent,
        option.getAttribute('aria-selected'),
      ]),
    ).toEqual([
      ['none', 'false'],
      ['low', 'false'],
      ['high', 'false'],
    ]);

    parent
      .querySelector('.workshop-page__summon-info-weight-option[data-preference="high"]')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(gameplayFacade.getSnapshot().seedSummoning.dropChances[0]).toMatchObject({
      key: 'sageSeed',
      dropPreference: 'high',
    });
    expect(parent.querySelector('.workshop-page__summon-info-weight-button')?.textContent).toBe(
      'high',
    );
    expect(
      parent
        .querySelector('.workshop-page__summon-info-rows .workshop-page__summon-info-row')
        ?.classList.contains('is-selection-updated'),
    ).toBe(true);

    manager.unmount();
  });

  it('shows an empty state when no seeds are unlocked', () => {
    const gameplayFacade = createGameplayFacadeFake({
      seedSummoning: {
        dropChances: [],
      },
    });
    const manager = new WorkshopSummonInfoManager({ gameplayFacade });
    const parent = document.createElement('div');

    manager.mount(parent);
    manager.show();

    expect(parent.querySelector('.workshop-page__summon-info-empty')?.textContent).toBe(
      'no seeds researched',
    );
    expect(parent.querySelector('.workshop-page__summon-info-header')?.hidden).toBe(true);
    expect(parent.querySelector('.workshop-page__summon-info-auto')?.hidden).toBe(true);

    manager.unmount();
  });

  it('hides auto controls before auto seed spawn research is unlocked', () => {
    const gameplayFacade = createGameplayFacadeFake({
      seedSummoning: {
        autoSummoning: {
          unlocked: false,
          enabled: true,
          manaReserve: 25,
          maxManaReserve: 5_000,
        },
        dropChances: [
          {
            itemTypeId: 1,
            key: 'sageSeed',
            label: 'sage seed',
            kind: 'seed',
            dropPreference: 'medium',
            dropChance: 1,
          },
        ],
      },
    });
    const manager = new WorkshopSummonInfoManager({ gameplayFacade });
    const parent = document.createElement('div');

    manager.mount(parent);
    manager.show();

    expect(parent.querySelector('.workshop-page__summon-info-auto')?.hidden).toBe(true);
    expect(
      parent.querySelector('.workshop-page__summon-info-reserve-input')?.getAttribute(
        'aria-label',
      ),
    ).toBe('minimum mana auto summon leaves unused');
    expect(parent.textContent).toContain('sage seed');

    manager.unmount();
  });
});
