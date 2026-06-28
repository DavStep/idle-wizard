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
        '.workshop-page__summon-info-rows .workshop-page__summon-info-seed-row',
      ),
    ];
    const weightChoices = [
      ...parent.querySelectorAll('.workshop-page__summon-info-weight-choice'),
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
    expect(parent.querySelector('.workshop-page__summon-info-selected-name')?.textContent).toBe(
      'sage seed',
    );
    expect(
      parent
        .querySelector('.workshop-page__summon-info-selected-name')
        ?.getAttribute('data-resource-color'),
    ).toBe('seed');
    expect(
      parent
        .querySelector('.workshop-page__summon-info-selected-name .style-seed-label__icon')
        ?.dataset.assetAtlasFrame,
    ).toBe('seed:regular');
    expect(parent.querySelector('.workshop-page__summon-info-editor')?.textContent).toContain(
      'chance25%',
    );
    expect(weightChoices.map((choice) => choice.textContent)).toEqual([
      'none',
      'low',
      'medium',
      'high',
    ]);
    expect(weightChoices.map((choice) => choice.getAttribute('aria-pressed'))).toEqual([
      'false',
      'false',
      'true',
      'false',
    ]);
    expect(weightChoices.map((choice) => choice.getAttribute('data-drop-weight-color'))).toEqual([
      'none',
      'low',
      'medium',
      'high',
    ]);
    expect(
      parent
        .querySelector(
          '.workshop-page__summon-info-weight-choice[data-preference="medium"] .workshop-page__summon-info-weight-check-icon',
        )
        ?.dataset.assetAtlasFrame,
    ).toBe('status:checkDefault');
    expect(rows.map((row) => row.getAttribute('aria-pressed'))).toEqual([
      'true',
      'false',
    ]);
    expect(rows.map((row) => row.classList.contains('is-selected'))).toEqual([
      true,
      false,
    ]);
    expect(
      rows.map(
        (row) =>
          `${row.querySelector('.row_key')?.textContent}:${
            row.querySelector('.workshop-page__summon-info-weight-value')?.textContent
          }:${row.querySelector('.workshop-page__summon-info-chance')?.textContent}`,
      ),
    ).toEqual(['sage seed:medium:25%', 'mint seed:medium:75%']);
    expect(
      rows.map((row) =>
        row
          .querySelector('.workshop-page__summon-info-weight-value')
          ?.getAttribute('data-drop-weight-color'),
      ),
    ).toEqual(['medium', 'medium']);
    expect(
      rows.map((row) =>
        row
          .querySelector('.workshop-page__summon-info-chance')
          ?.getAttribute('data-drop-rate-color'),
      ),
    ).toEqual(['low', 'high']);

    parent
      .querySelector('.workshop-page__summon-info-close')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popup?.hidden).toBe(true);

    manager.unmount();
  });

  it('formats drop chance percentages in the scroll list', () => {
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
    expect(chances.map((chance) => chance.getAttribute('data-drop-rate-color'))).toEqual([
      'none',
      'low',
      'medium',
      'high',
    ]);

    manager.unmount();
  });

  it('shows the fixed weight choices for the selected seed', () => {
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
      ...parent.querySelectorAll('.workshop-page__summon-info-weight-choice'),
    ];

    expect(weights.map((weight) => weight.textContent)).toEqual([
      'none',
      'low',
      'medium',
      'high',
    ]);
    expect(weights.map((weight) => weight.getAttribute('aria-pressed'))).toEqual([
      'true',
      'false',
      'false',
      'false',
    ]);

    manager.unmount();
  });

  it('selects a seed row and updates the fixed editor', () => {
    const gameplayFacade = createGameplayFacadeFake({
      seedSummoning: {
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
            dropPreference: 'low',
            dropChance: 0.75,
          },
        ],
      },
    });
    const manager = new WorkshopSummonInfoManager({ gameplayFacade });
    const parent = document.createElement('div');

    manager.mount(parent);
    manager.show();

    const rows = [
      ...parent.querySelectorAll(
        '.workshop-page__summon-info-rows .workshop-page__summon-info-seed-row',
      ),
    ];
    rows[1].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(parent.querySelector('.workshop-page__summon-info-selected-name')?.textContent).toBe(
      'mint seed',
    );
    expect(parent.querySelector('.workshop-page__summon-info-editor')?.textContent).toContain(
      'chance75%',
    );
    expect(
      [...parent.querySelectorAll('.workshop-page__summon-info-weight-choice')].map(
        (choice) => choice.getAttribute('aria-pressed'),
      ),
    ).toEqual(['false', 'true', 'false', 'false']);
    expect(
      [
        ...parent.querySelectorAll(
          '.workshop-page__summon-info-rows .workshop-page__summon-info-seed-row',
        ),
      ].map((row) => row.getAttribute('aria-pressed')),
    ).toEqual(['false', 'true']);

    manager.unmount();
  });

  it('defines fixed editor and scroll rail styles', async () => {
    const css = await readFile(path.join(cwd(), 'src/styles/base.css'), 'utf8');

    expect(css).toContain('--workshop-summon-info-row-height');
    expect(css).toContain('.workshop-page__summon-info-editor');
    expect(css).toContain('.workshop-page__summon-info-weight-label');
    expect(css).toContain('.workshop-page__summon-info-weight-choices');
    expect(css).toContain('display: flex;');
    expect(css).toContain('gap: 12px;');
    expect(css).toContain('min-height: 18px;');
    expect(css).toContain('border: 0;');
    expect(css).toContain('.workshop-page__summon-info-weight-check-icon');
    expect(css).toContain('.workshop-page__summon-info-progress');
    expect(css).toContain('workshop-summon-info-selected-surface');
    expect(css).toContain('[data-drop-weight-color="none"]');
    expect(css).toContain('[data-drop-rate-color="high"]');
    expect(css).toContain('height: 400px;');
    expect(css).toContain('overflow: hidden auto;');
    expect(css).not.toContain('workshop-page__summon-info-weight-dropdown');
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

  it('updates seed drop preferences from fixed choices', () => {
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

    parent
      .querySelector('.workshop-page__summon-info-weight-choice[data-preference="high"]')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(gameplayFacade.getSnapshot().seedSummoning.dropChances[0]).toMatchObject({
      key: 'sageSeed',
      dropPreference: 'high',
    });
    expect(
      parent
        .querySelector('.workshop-page__summon-info-weight-choice[data-preference="high"]')
        ?.getAttribute('aria-pressed'),
    ).toBe('true');
    expect(
      parent
        .querySelector('.workshop-page__summon-info-rows .workshop-page__summon-info-weight-value')
        ?.textContent,
    ).toBe('high');
    expect(
      parent
        .querySelector('.workshop-page__summon-info-rows .workshop-page__summon-info-row')
        ?.classList.contains('is-selection-updated'),
    ).toBe(true);

    manager.unmount();
  });

  it('keeps the last active seed from being disabled', () => {
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
          {
            itemTypeId: 2,
            key: 'mintSeed',
            label: 'mint seed',
            kind: 'seed',
            dropPreference: 'none',
            dropChance: 0,
          },
        ],
      },
    });
    const manager = new WorkshopSummonInfoManager({ gameplayFacade });
    const parent = document.createElement('div');

    manager.mount(parent);
    manager.show();

    expect(
      parent.querySelector('.workshop-page__summon-info-weight-choice[data-preference="none"]')
        ?.disabled,
    ).toBe(true);
    expect(
      parent
        .querySelector('.workshop-page__summon-info-weight-choice[data-preference="none"]')
        ?.getAttribute('aria-disabled'),
    ).toBe('true');

    parent
      .querySelector('.workshop-page__summon-info-weight-choice[data-preference="low"]')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(
      parent.querySelector('.workshop-page__summon-info-weight-choice[data-preference="none"]')
        ?.disabled,
    ).toBe(true);
    expect(gameplayFacade.getSnapshot().seedSummoning.dropChances[0]).toMatchObject({
      key: 'sageSeed',
      dropPreference: 'low',
    });

    manager.unmount();
  });

  it('allows none when another seed stays active', () => {
    const gameplayFacade = createGameplayFacadeFake({
      seedSummoning: {
        dropChances: [
          {
            itemTypeId: 1,
            key: 'sageSeed',
            label: 'sage seed',
            kind: 'seed',
            dropPreference: 'medium',
            dropChance: 0.5,
          },
          {
            itemTypeId: 2,
            key: 'mintSeed',
            label: 'mint seed',
            kind: 'seed',
            dropPreference: 'low',
            dropChance: 0.5,
          },
        ],
      },
    });
    const manager = new WorkshopSummonInfoManager({ gameplayFacade });
    const parent = document.createElement('div');

    manager.mount(parent);
    manager.show();

    parent
      .querySelector('.workshop-page__summon-info-weight-choice[data-preference="none"]')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(gameplayFacade.getSnapshot().seedSummoning.dropChances[0]).toMatchObject({
      key: 'sageSeed',
      dropPreference: 'none',
    });
    expect(
      parent
        .querySelector('.workshop-page__summon-info-weight-choice[data-preference="none"]')
        ?.getAttribute('aria-pressed'),
    ).toBe('true');
    expect(
      parent
        .querySelector('.workshop-page__summon-info-rows .workshop-page__summon-info-row')
        ?.classList.contains('is-selection-updated'),
    ).toBe(true);

    manager.unmount();
  });

  it('shows a compact status if gameplay rejects the preference', () => {
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
          {
            itemTypeId: 2,
            key: 'mintSeed',
            label: 'mint seed',
            kind: 'seed',
            dropPreference: 'low',
            dropChance: 0,
          },
        ],
      },
    });
    gameplayFacade.setSeedDropPreference = () => ({
      ok: false,
      reason: 'last_active_seed',
    });
    const manager = new WorkshopSummonInfoManager({ gameplayFacade });
    const parent = document.createElement('div');

    manager.mount(parent);
    manager.show();

    parent
      .querySelector('.workshop-page__summon-info-weight-choice[data-preference="none"]')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(parent.querySelector('.workshop-page__summon-info-status')?.hidden).toBe(false);
    expect(parent.querySelector('.workshop-page__summon-info-status')?.textContent).toBe(
      'one seed must stay active',
    );

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
    expect(parent.querySelector('.workshop-page__summon-info-editor')?.hidden).toBe(true);

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
