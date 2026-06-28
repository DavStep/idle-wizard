// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';
import { describe, expect, it } from 'vitest';

import { WorkshopDiscoveriesManager } from './WorkshopDiscoveriesManager.js';

const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');

function createGameplayFacadeFake(snapshot) {
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listener(snapshot);
      return () => {};
    },
  };
}

function createPotion({
  key,
  label,
  discovered = true,
  discoveredByUsername = 'Ada',
  royaltyCoin = 12.5,
  manaCost = 34,
  brewDurationMs = 75_000,
  ingredients = [],
}) {
  return {
    itemTypeId: 2000,
    key,
    label,
    kind: 'potion',
    quantity: 0,
    discoveryType: 'unknown',
    unknown: true,
    known: discovered,
    discovered,
    researched: discovered,
    unlocked: discovered,
    discoveredByUsername: discovered ? discoveredByUsername : null,
    discoveredByIdentity: null,
    discoveredAtMs: discovered ? Date.UTC(2026, 0, 2) : null,
    royaltyCoin,
    manaCost,
    brewDurationMs,
    ingredients,
  };
}

function createHerb({ itemTypeId, key, label, quantity = 1 }) {
  return {
    itemTypeId,
    key,
    label,
    kind: 'herb',
    quantity,
  };
}

function createSnapshot() {
  const mint = createHerb({
    itemTypeId: 1002,
    key: 'mintHerb',
    label: 'mint',
    quantity: 1,
  });
  const glowcap = createHerb({
    itemTypeId: 1006,
    key: 'glowcapHerb',
    label: 'glowcap',
    quantity: 1,
  });

  return {
    inventory: [
      {
        ...mint,
        quantity: 4,
      },
    ],
    brewing: {
      herbs: [],
    },
    discoveries: {
      seeds: [],
      herbs: [],
      potions: [
        createPotion({
          key: 'ashenMemory',
          label: 'ashen memory',
          discovered: false,
          ingredients: [
            createHerb({
              itemTypeId: 1001,
              key: 'sageHerb',
              label: 'sage',
              quantity: 5,
            }),
          ],
        }),
        createPotion({
          key: 'silverleafQuiet',
          label: 'silverleaf quiet',
          ingredients: [mint, glowcap],
        }),
        createPotion({
          key: 'rootboundResolve',
          label: 'rootbound resolve',
          discoveredByUsername: 'StepDav',
          royaltyCoin: 7,
          manaCost: 41,
          brewDurationMs: 90_000,
          ingredients: [glowcap],
        }),
      ],
    },
  };
}

function getPagePotionNames(parent) {
  return [...parent.querySelectorAll('.workshop-page__discovery-recipe-page')].map(
    (page) =>
      [...page.querySelectorAll('.workshop-page__discovery-potion-row')].map(
        (row) => row.querySelector('.workshop-page__discovery-potion-name')?.textContent,
      ),
  );
}

describe('WorkshopDiscoveriesManager', () => {
  it('keeps potion discoveries in the same fixed book spread as recipes', () => {
    const dialogRule = baseCss.match(
      /\.style-dialog\.workshop-page__discoveries-dialog\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const panelRule = baseCss.match(
      /\.workshop-page__discoveries-panel\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(dialogRule).toContain('display: flex;');
    expect(dialogRule).toContain('flex-direction: column;');
    expect(dialogRule).toContain('width: 306px;');
    expect(dialogRule).toContain(
      'height: var(--workshop-page-discoveries-dialog-content-height);',
    );
    expect(panelRule).toContain('width: var(--style-discoveries-book-dialog-width);');
    expect(baseCss).toContain('.workshop-page__discovery-recipe-book[hidden]');
  });

  it('pages potion discoveries like the recipes dialog without recipe actions', () => {
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new WorkshopDiscoveriesManager({
      gameplayFacade: createGameplayFacadeFake(createSnapshot()),
    });

    manager.mount(parent);
    manager.show();

    expect(parent.querySelector('.workshop-page__discovery-recipe-book')).not.toBeNull();
    expect(parent.querySelector('.brewing-page__recipe-select-button')).toBeNull();
    expect(getPagePotionNames(parent)).toEqual([
      ['unknown potion'],
      ['silverleaf quiet'],
    ]);
    expect(parent.querySelector('.workshop-page__discovery-recipe-page-label')?.textContent).toBe(
      'pages 1-2/3',
    );
    expect(parent.textContent).not.toContain('ashen memory');
    expect(parent.textContent).toContain('- 5 ??????');
    expect(parent.textContent).toContain('owned ?');
    expect(parent.textContent).toContain('royalties unowned');
    expect(parent.textContent).toContain('discovered by Ada');
    expect(parent.textContent).toContain('owned 4');

    parent
      .querySelector('.workshop-page__discovery-recipe-page-button:last-child')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const book = parent.querySelector('.workshop-page__discovery-recipe-book');
    const ghosts = [...parent.querySelectorAll('.brewing-page__recipe-turn-ghost')];

    expect(book?.classList.contains('is-turning')).toBe(true);
    expect(book?.dataset.turnDirection).toBe('forward');
    expect(ghosts).toHaveLength(2);
    expect(ghosts[0].getAttribute('aria-hidden')).toBe('true');
    expect(ghosts[0].inert).toBe(true);
    expect(ghosts[0].textContent).toContain('unknown potion');
    expect(getPagePotionNames(parent)).toEqual([['rootbound resolve'], []]);
    expect(parent.querySelector('.workshop-page__discovery-recipe-page-label')?.textContent).toBe(
      'page 3/3',
    );

    manager.unmount();
    parent.remove();
  });
});
