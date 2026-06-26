// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';
import { describe, expect, it, vi } from 'vitest';

import { BrewingRecipeBookManager } from './BrewingRecipeBookManager.js';

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

function createSnapshot() {
  return {
    brewing: {
      herbs: [
        {
          itemTypeId: 1001,
          key: 'sageHerb',
          label: 'sage',
          kind: 'herb',
          quantity: 1,
        },
      ],
      recipes: [
        {
          key: 'minorHealingPotion',
          label: 'minor healing potion',
          unlocked: true,
          manaCost: 10,
          brewDurationMs: 10_000,
          ingredients: [
            {
              itemTypeId: 1001,
              key: 'sageHerb',
              label: 'sage',
              quantity: 1,
            },
          ],
        },
      ],
    },
  };
}

describe('BrewingRecipeBookManager', () => {
  it('keeps the recipe book as a fixed two-page spread', () => {
    const dialogRule = baseCss.match(
      /\.style-dialog\.brewing-page__recipes-dialog\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const bookRule = baseCss.match(
      /\.brewing-page__recipe-book\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const pageRule = baseCss.match(
      /\n\.brewing-page__recipe-page\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const ghostRule = baseCss.match(
      /\.brewing-page__recipe-turn-ghost\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const infoTextRule = baseCss.match(
      /\.brewing-page__recipe-info-text\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const discoveryRowRule = baseCss.match(
      /\.brewing-page__recipe-discovery-row\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const discoveryNameRule = baseCss.match(
      /\.brewing-page__recipe-discovery-name\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const silhouetteRule = baseCss.match(
      /\.brewing-page__recipe-potion-icon\.is-silhouette\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const ingredientsRule = baseCss.match(
      /\.brewing-page__recipe-ingredients\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const metaRule = baseCss.match(
      /\.brewing-page__recipe-meta\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(dialogRule).toBeDefined();
    expect(dialogRule).toContain('--brewing-page-recipes-dialog-content-height: 360px;');
    expect(dialogRule).toMatch(/\bdisplay:\s*flex;/);
    expect(dialogRule).toMatch(/\bflex-direction:\s*column;/);
    expect(dialogRule).toMatch(
      /\bheight:\s*var\(--brewing-page-recipes-dialog-content-height\);/,
    );

    expect(bookRule).toBeDefined();
    expect(bookRule).toMatch(/\bdisplay:\s*grid;/);
    expect(bookRule).toContain('grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);');
    expect(bookRule).toMatch(/\bflex:\s*1 1 auto;/);
    expect(bookRule).toMatch(/\bmin-height:\s*0;/);

    expect(pageRule).toBeDefined();
    expect(pageRule).toMatch(/\boverflow:\s*hidden auto;/);

    expect(ghostRule).toBeDefined();
    expect(ghostRule).toMatch(/\bposition:\s*absolute;/);
    expect(ghostRule).toMatch(/\bpointer-events:\s*none;/);
    expect(ghostRule).toMatch(/\bbackground:\s*var\(--style-surface\);/);
    expect(baseCss).toContain('@keyframes brewing-recipe-page-enter-forward');
    expect(baseCss).toContain('@keyframes brewing-recipe-page-exit-forward');
    expect(baseCss).not.toContain('.brewing-page__recipe-page-number');

    expect(infoTextRule).toBeDefined();
    expect(infoTextRule).toContain(
      'min-height: calc(var(--style-box-border-label-line-height) * 4);',
    );
    expect(discoveryRowRule).toBeDefined();
    expect(discoveryRowRule).toMatch(/\bdisplay:\s*block;/);
    expect(discoveryNameRule).toContain('color: inherit;');
    expect(silhouetteRule).toContain('color: var(--style-disabled);');
    expect(ingredientsRule).toBeDefined();
    expect(ingredientsRule).toContain('margin-top: 6px;');
    expect(metaRule).toBeDefined();
    expect(metaRule).toContain('margin-top: 6px;');
  });

  it('keeps cauldron controls out of the recipe popup', () => {
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingRecipeBookManager({
      gameplayFacade: createGameplayFacadeFake(createSnapshot()),
      getSelectedRecipeKey: () => null,
      onSelectRecipe: () => {},
    });

    manager.mount(parent);

    expect(parent.querySelector('.brewing-page__cauldron-dialog-current')).toBeNull();
    expect(parent.querySelector('.brewing-page__cauldron-dialog-action')).toBeNull();
    expect(parent.querySelector('.brewing-page__quantity-summary')).toBeNull();
    expect(parent.querySelector('.brewing-page__auto-summary')).toBeNull();

    manager.unmount();
    parent.remove();
  });

  it('shows discovered unknown recipe discoverer in a separate player-info row', () => {
    const snapshot = {
      brewing: {
        herbs: [
          {
            itemTypeId: 1004,
            key: 'lavenderHerb',
            label: 'lavender',
            kind: 'herb',
            quantity: 2,
          },
        ],
        recipes: [
          {
            key: 'ashenMemory',
            label: 'ashen memory',
            unlocked: true,
            discovered: true,
            discoveredByUsername: 'Ada',
            discoveredByIdentity: 'identity-a',
            discoveryType: 'unknown',
            unknown: true,
            manaCost: 36,
            brewDurationMs: 80_000,
            ingredients: [
              {
                itemTypeId: 1004,
                key: 'lavenderHerb',
                label: 'lavender',
                quantity: 1,
              },
            ],
          },
        ],
      },
    };
    const parent = document.createElement('div');
    const onOpenPlayerInfo = vi.fn();
    document.body.append(parent);
    const manager = new BrewingRecipeBookManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
      getSelectedRecipeKey: () => null,
      onSelectRecipe: () => {},
      onOpenPlayerInfo,
    });

    manager.mount(parent);

    const description = parent.querySelector('.brewing-page__recipe-info-text');
    const discoveryRow = parent.querySelector('.brewing-page__recipe-discovery-row');
    const discoverer = discoveryRow?.querySelector('.brewing-page__recipe-discovery-name');
    const row = parent.querySelector('.brewing-page__recipe-row');

    expect(row?.classList.contains('is-unknown')).toBe(false);
    expect(description?.textContent).toContain('discovered by Ada');
    expect(description?.contains(discoveryRow)).toBe(true);
    expect(discoveryRow?.textContent).toBe('- discovered by Ada');
    expect(discoveryRow?.dataset.resourceColor).toBe('crystal');
    expect(discoverer?.textContent).toBe('Ada');
    expect(discoverer?.className).toBe(
      'room-player-info-link brewing-page__recipe-discovery-name',
    );

    discoverer?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(onOpenPlayerInfo).toHaveBeenCalledWith({
      identity: 'identity-a',
      username: 'Ada',
    });

    manager.unmount();
    parent.remove();
  });

  it('shows selected recipe action as selected', () => {
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingRecipeBookManager({
      gameplayFacade: createGameplayFacadeFake(createSnapshot()),
      getSelectedRecipeKey: () => 'minorHealingPotion',
      onSelectRecipe: () => {},
    });

    manager.mount(parent);

    const row = parent.querySelector('.brewing-page__recipe-row');
    const action = row.querySelector('.brewing-page__recipe-select-button');

    expect(row.tagName).toBe('DIV');
    expect(action.classList.contains('style-button')).toBe(true);
    expect(action.textContent).toBe('selected');
    expect(action.getAttribute('aria-pressed')).toBe('true');
    expect(action.getAttribute('aria-label')).toBe(
      'unselect minor healing potion recipe',
    );
    expect(row.getAttribute('aria-pressed')).toBe('true');

    manager.unmount();
    parent.remove();
  });

  it('keeps the big potion icon separate from the plain potion name', () => {
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingRecipeBookManager({
      gameplayFacade: createGameplayFacadeFake(createSnapshot()),
      getSelectedRecipeKey: () => null,
      onSelectRecipe: () => {},
    });

    manager.mount(parent);

    const row = parent.querySelector('.brewing-page__recipe-row');
    const icon = row.querySelector('.brewing-page__recipe-potion-icon');
    const name = row.querySelector('.brewing-page__recipe-name');
    const description = row.querySelector('.brewing-page__recipe-info-text');
    const ingredients = row.querySelector('.brewing-page__recipe-ingredients');

    expect(icon).not.toBeNull();
    expect(description).not.toBeNull();
    expect(ingredients).not.toBeNull();
    expect(name?.textContent).toBe('minor healing potion');
    expect(name?.classList.contains('style-potion-label')).toBe(false);
    expect(name?.querySelector('.style-potion-label__icon')).toBeNull();
    expect(
      description.compareDocumentPosition(ingredients) &
        window.Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    manager.unmount();
    parent.remove();
  });

  it('marks the recipe popup close button as the tutorial close target', () => {
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingRecipeBookManager({
      gameplayFacade: createGameplayFacadeFake(createSnapshot()),
      getSelectedRecipeKey: () => null,
      onSelectRecipe: () => {},
    });

    manager.mount(parent);

    expect(parent.querySelector('.brewing-page__recipes-close')?.dataset.tutorialId).toBe(
      'brewing:recipes:close',
    );

    manager.unmount();
    parent.remove();
  });

  it('shows recipe learning progress in the popup title while selection stays externally scoped', () => {
    const snapshot = createSnapshot();
    snapshot.brewing.recipes.push({
      key: 'calmingDraught',
      label: 'calming draught',
      unlocked: false,
      manaCost: 18,
      brewDurationMs: 30_000,
      ingredients: [
        {
          itemTypeId: 1001,
          key: 'sageHerb',
          label: 'sage',
          quantity: 1,
        },
      ],
    });
    const parent = document.createElement('div');
    document.body.append(parent);
    let cauldronIndex = 1;
    const manager = new BrewingRecipeBookManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
      getSelectedRecipeKey: () => null,
      getCurrentCauldronIndex: () => cauldronIndex,
      onSelectRecipe: () => {},
    });

    manager.mount(parent);
    manager.show();

    expect(parent.querySelector('.style-box__title')?.textContent).toBe(
      'recipes: learned 1/2',
    );
    expect(parent.querySelector('.brewing-page__recipes-dialog')?.getAttribute('aria-label')).toBe(
      'recipes: learned 1/2',
    );

    cauldronIndex = 2;
    manager.render(snapshot);

    expect(parent.querySelector('.style-box__title')?.textContent).toBe(
      'recipes: learned 1/2',
    );

    manager.unmount();
    parent.remove();
  });

  it('selects a recipe when the recipe action is clicked', () => {
    const parent = document.createElement('div');
    document.body.append(parent);
    let selectedRecipeKey = null;
    const manager = new BrewingRecipeBookManager({
      gameplayFacade: createGameplayFacadeFake(createSnapshot()),
      getSelectedRecipeKey: () => selectedRecipeKey,
      onSelectRecipe: (recipe) => {
        selectedRecipeKey = recipe.key;
      },
    });

    manager.mount(parent);

    parent
      .querySelector('.brewing-page__recipe-select-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(selectedRecipeKey).toBe('minorHealingPotion');
    expect(parent.querySelector('.brewing-page__recipe-row').getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(parent.querySelector('.brewing-page__recipe-select-button').textContent).toBe(
      'selected',
    );

    manager.unmount();
    parent.remove();
  });

  it('shows locked and unknown recipes without making them selectable', () => {
    const snapshot = {
      brewing: {
        herbs: [
          {
            itemTypeId: 1001,
            key: 'sageHerb',
            label: 'sage',
            kind: 'herb',
            quantity: 5,
          },
          {
            itemTypeId: 1004,
            key: 'lavenderHerb',
            label: 'lavender',
            kind: 'herb',
            quantity: 5,
          },
        ],
        recipes: [
          {
            key: 'minorHealingPotion',
            label: 'minor healing potion',
            unlocked: false,
            manaCost: 14,
            brewDurationMs: 35_000,
            ingredients: [
              {
                itemTypeId: 1001,
                key: 'sageHerb',
                label: 'sage',
                quantity: 2,
              },
            ],
          },
          {
            key: 'ashenMemory',
            label: 'ashen memory',
            unlocked: false,
            discovered: false,
            unknown: true,
            known: false,
            discoveryType: 'unknown',
            manaCost: 36,
            brewDurationMs: 80_000,
            ingredients: [
              {
                itemTypeId: 1004,
                key: 'lavenderHerb',
                label: 'lavender',
                quantity: 1,
              },
            ],
          },
        ],
      },
    };
    const parent = document.createElement('div');
    const onSelectRecipe = vi.fn();
    document.body.append(parent);
    const manager = new BrewingRecipeBookManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
      getSelectedRecipeKey: () => null,
      onSelectRecipe,
    });

    manager.mount(parent);

    const rows = [...parent.querySelectorAll('.brewing-page__recipe-row')];
    const [lockedRow, unknownRow] = rows;

    expect(rows.map((row) => row.querySelector('.brewing-page__recipe-name')?.textContent)).toEqual([
      'minor healing potion',
      'unknown potion',
    ]);
    expect(lockedRow.classList.contains('is-locked')).toBe(true);
    expect(lockedRow.classList.contains('is-unknown')).toBe(false);
    expect(lockedRow.querySelector('.brewing-page__recipe-select-button')?.textContent).toBe(
      'research',
    );
    expect(lockedRow.querySelector('.brewing-page__recipe-select-button')?.disabled).toBe(true);
    expect(lockedRow.textContent).toContain('- 2 sage');
    expect(lockedRow.textContent).toContain('14 mana required');
    expect(lockedRow.textContent).toContain('time: 35s');

    expect(unknownRow.classList.contains('is-locked')).toBe(true);
    expect(unknownRow.classList.contains('is-unknown')).toBe(true);
    expect(unknownRow.dataset.tutorialId).toBeUndefined();
    expect(unknownRow.querySelector('.brewing-page__recipe-name')?.getAttribute('aria-label')).toBe(
      'unknown',
    );
    expect(unknownRow.querySelector('.brewing-page__recipe-select-button')?.textContent).toBe(
      'unknown',
    );
    expect(unknownRow.querySelector('.brewing-page__recipe-select-button')?.disabled).toBe(true);
    expect(
      unknownRow.querySelector('.brewing-page__recipe-potion-icon')?.dataset.assetAtlasFrame,
    ).toBe('potion:ashenMemory');
    expect(
      unknownRow
        .querySelector('.brewing-page__recipe-potion-icon')
        ?.classList.contains('is-silhouette'),
    ).toBe(true);
    expect(unknownRow.textContent).toContain('- 1 ??????');
    expect(unknownRow.textContent).toContain('owned ?');
    expect(unknownRow.textContent).toContain('? mana required');
    expect(unknownRow.textContent).toContain('time: ?s');
    expect(unknownRow.textContent).not.toContain('ashen memory');
    expect(unknownRow.textContent).not.toContain('lavender');

    lockedRow
      .querySelector('.brewing-page__recipe-select-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    unknownRow
      .querySelector('.brewing-page__recipe-select-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(onSelectRecipe).not.toHaveBeenCalled();

    manager.unmount();
    parent.remove();
  });

  it('keeps the recipe action wide and lifted from the page bottom', () => {
    const pageRowRule = baseCss.match(
      /\.brewing-page__recipe-page\s*>\s*\.brewing-page__recipe-row\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const ghostRowRule = baseCss.match(
      /\.brewing-page__recipe-turn-ghost\s*>\s*\.brewing-page__recipe-row\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const selectRule = baseCss.match(
      /\.brewing-page__recipe-select-button\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(pageRowRule).toContain('flex: 1 1 auto;');
    expect(ghostRowRule).toContain('flex: 1 1 auto;');
    expect(selectRule).toContain('align-self: center;');
    expect(selectRule).toContain('box-sizing: border-box;');
    expect(selectRule).toContain('width: 112px;');
    expect(selectRule).toContain('margin-top: auto;');
    expect(selectRule).toContain('margin-bottom: 8px;');
    expect(selectRule).toContain('text-align: center;');
    expect(selectRule).toContain('border: var(--style-border);');
    expect(selectRule).not.toContain('border-top:');
    expect(selectRule).toContain('white-space: nowrap;');
  });

  it('unselects a selected recipe when the recipe action is clicked', () => {
    const parent = document.createElement('div');
    document.body.append(parent);
    let selectedRecipeKey = 'minorHealingPotion';
    const manager = new BrewingRecipeBookManager({
      gameplayFacade: createGameplayFacadeFake(createSnapshot()),
      getSelectedRecipeKey: () => selectedRecipeKey,
      onSelectRecipe: (recipe) => {
        selectedRecipeKey = recipe?.key ?? null;
      },
    });

    manager.mount(parent);

    parent
      .querySelector('.brewing-page__recipe-select-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(selectedRecipeKey).toBeNull();
    expect(parent.querySelector('.brewing-page__recipe-row').getAttribute('aria-pressed')).toBe(
      'false',
    );
    expect(parent.querySelector('.brewing-page__recipe-select-button').textContent).toBe(
      'select',
    );

    manager.unmount();
    parent.remove();
  });

  it('does not render auto brew controls in the recipe popup', () => {
    const snapshot = createSnapshot();
    snapshot.research = {
      completedResearchIds: ['automation:autoBrewCauldron:2'],
    };
    snapshot.brewing.cauldrons = [
      {
        cauldronIndex: 0,
        cauldronNumber: 1,
        autoBrewEnabled: true,
        autoBrewRecipeKey: 'manaTonic',
      },
      {
        cauldronIndex: 1,
        cauldronNumber: 2,
        autoBrewEnabled: false,
        autoBrewRecipeKey: null,
      },
    ];
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingRecipeBookManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
      getSelectedRecipeKey: () => 'minorHealingPotion',
      getCurrentCauldronIndex: () => 1,
      onSelectRecipe: () => {},
    });

    manager.mount(parent);

    expect(parent.querySelector('.brewing-page__auto-summary')).toBeNull();
    expect(parent.querySelector('.brewing-page__auto-state-button')).toBeNull();
    expect(snapshot.brewing.cauldrons[0]).toMatchObject({
      autoBrewEnabled: true,
      autoBrewRecipeKey: 'manaTonic',
    });
    expect(snapshot.brewing.cauldrons[1]).toMatchObject({
      autoBrewEnabled: false,
      autoBrewRecipeKey: null,
    });

    manager.unmount();
    parent.remove();
  });

  it('shows required and owned ingredient quantities in recipe rows', () => {
    const snapshot = {
      brewing: {
        herbs: [
          {
            itemTypeId: 1001,
            key: 'sageHerb',
            label: 'sage',
            kind: 'herb',
            quantity: 1,
          },
          {
            itemTypeId: 1005,
            key: 'briarHerb',
            label: 'briar',
            kind: 'herb',
            quantity: 7,
          },
        ],
        recipes: [
          {
            key: 'briarWard',
            label: 'briar ward',
            unlocked: true,
            manaCost: 24,
            brewDurationMs: 60_000,
            ingredients: [
              {
                itemTypeId: 1005,
                key: 'briarHerb',
                label: 'briar',
                quantity: 2,
              },
              {
                itemTypeId: 1001,
                key: 'sageHerb',
                label: 'sage',
                quantity: 2,
              },
            ],
          },
        ],
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingRecipeBookManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
      getSelectedRecipeKey: () => null,
      onSelectRecipe: () => {},
    });

    manager.mount(parent);

    const ingredients = [...parent.querySelectorAll('.brewing-page__recipe-ingredient-row')].map(
      (row) => ({
        required: row.querySelector('.brewing-page__recipe-ingredient-required')?.textContent,
        owned: row.querySelector('.brewing-page__recipe-ingredient-owned')?.textContent,
        unavailable: row
          .querySelector('.brewing-page__recipe-ingredient-required')
          ?.classList.contains('is-unavailable'),
      }),
    );

    expect(ingredients).toEqual([
      { required: '- 2 briar', owned: 'owned 7', unavailable: false },
      { required: '- 2 sage', owned: 'owned 1', unavailable: true },
    ]);
    const required = parent.querySelector('.brewing-page__recipe-ingredient-required');

    expect(required?.childNodes[0]?.textContent).toBe('- 2 ');
    expect(required?.childNodes[1]?.classList.contains('style-herb-label')).toBe(true);
    expect(required?.querySelector('.style-herb-label__icon')).not.toBeNull();

    snapshot.brewing.herbs[1].quantity = 8;
    manager.render(snapshot);

    expect(
      parent
        .querySelector('.brewing-page__recipe-ingredient-row')
        ?.querySelector('.brewing-page__recipe-ingredient-owned')?.textContent,
    ).toBe('owned 8');

    manager.unmount();
    parent.remove();
  });

  it('shows one recipe on each book page and turns to the next spread', () => {
    const snapshot = {
      brewing: {
        herbs: [
          {
            itemTypeId: 1001,
            key: 'sageHerb',
            label: 'sage',
            kind: 'herb',
            quantity: 4,
          },
          {
            itemTypeId: 1002,
            key: 'mintHerb',
            label: 'mint',
            kind: 'herb',
            quantity: 3,
          },
        ],
        recipes: [
          {
            key: 'manaTonic',
            label: 'mana tonic',
            unlocked: true,
            manaCost: 12,
            brewDurationMs: 10_000,
            ingredients: [
              {
                itemTypeId: 1001,
                key: 'sageHerb',
                label: 'sage',
                quantity: 3,
              },
            ],
          },
          {
            key: 'minorHealingPotion',
            label: 'minor healing potion',
            unlocked: true,
            manaCost: 15,
            brewDurationMs: 20_000,
            ingredients: [
              {
                itemTypeId: 1002,
                key: 'mintHerb',
                label: 'mint',
                quantity: 2,
              },
            ],
          },
          {
            key: 'nettleVigor',
            label: 'nettle vigor',
            unlocked: true,
            manaCost: 16,
            brewDurationMs: 25_000,
            ingredients: [
              {
                itemTypeId: 1001,
                key: 'sageHerb',
                label: 'sage',
                quantity: 1,
              },
            ],
          },
          {
            key: 'calmingDraught',
            label: 'calming draught',
            unlocked: true,
            manaCost: 18,
            brewDurationMs: 30_000,
            ingredients: [
              {
                itemTypeId: 1002,
                key: 'mintHerb',
                label: 'mint',
                quantity: 1,
              },
            ],
          },
          {
            key: 'briarWard',
            label: 'briar ward',
            unlocked: true,
            manaCost: 24,
            brewDurationMs: 60_000,
            ingredients: [
              {
                itemTypeId: 1001,
                key: 'sageHerb',
                label: 'sage',
                quantity: 1,
              },
            ],
          },
        ],
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingRecipeBookManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
      getSelectedRecipeKey: () => null,
      onSelectRecipe: () => {},
    });

    manager.mount(parent);

    expect(parent.querySelector('.brewing-page__recipe-page-number')).toBeNull();
    expect(
      [...parent.querySelectorAll('.brewing-page__recipe-page')].map((page) =>
        [...page.querySelectorAll('.brewing-page__recipe-row')].map((row) =>
          row.querySelector('.brewing-page__recipe-name')?.textContent,
        ),
      ),
    ).toEqual([
      ['mana tonic'],
      ['minor healing potion'],
    ]);
    expect(parent.querySelector('.brewing-page__recipe-page-label')?.textContent).toBe(
      'pages 1-2/5',
    );

    parent
      .querySelector('.brewing-page__recipe-page-button:last-child')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(
      [...parent.querySelectorAll('.brewing-page__recipe-page')].map((page) =>
        [...page.querySelectorAll('.brewing-page__recipe-row')].map((row) =>
          row.querySelector('.brewing-page__recipe-name')?.textContent,
        ),
      ),
    ).toEqual([
      ['nettle vigor'],
      ['calming draught'],
    ]);
    expect(parent.querySelector('.brewing-page__recipe-page-label')?.textContent).toBe(
      'pages 3-4/5',
    );

    manager.unmount();
    parent.remove();
  });

  it('keeps the outgoing spread inert while the next pages enter', () => {
    const snapshot = {
      brewing: {
        herbs: [],
        recipes: [
          {
            key: 'manaTonic',
            label: 'mana tonic',
            unlocked: true,
            manaCost: 12,
            brewDurationMs: 10_000,
            ingredients: [],
          },
          {
            key: 'minorHealingPotion',
            label: 'minor healing potion',
            unlocked: true,
            manaCost: 15,
            brewDurationMs: 20_000,
            ingredients: [],
          },
          {
            key: 'nettleVigor',
            label: 'nettle vigor',
            unlocked: true,
            manaCost: 16,
            brewDurationMs: 25_000,
            ingredients: [],
          },
        ],
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingRecipeBookManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
      getSelectedRecipeKey: () => null,
      onSelectRecipe: () => {},
    });

    manager.mount(parent);
    manager.show();

    parent
      .querySelector('.brewing-page__recipe-page-button:last-child')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const book = parent.querySelector('.brewing-page__recipe-book');
    const ghosts = [...parent.querySelectorAll('.brewing-page__recipe-turn-ghost')];

    expect(book?.classList.contains('is-turning')).toBe(true);
    expect(book?.dataset.turnDirection).toBe('forward');
    expect(ghosts).toHaveLength(2);
    expect(ghosts[0].getAttribute('aria-hidden')).toBe('true');
    expect(ghosts[0].inert).toBe(true);
    expect(ghosts[0].textContent).toContain('mana tonic');
    expect(ghosts[0].querySelector('[data-tutorial-id]')).toBeNull();
    expect(ghosts[0].querySelector('button')?.getAttribute('tabindex')).toBe('-1');
    expect(
      [...parent.querySelectorAll('.brewing-page__recipe-page')].map((page) =>
        [...page.querySelectorAll('.brewing-page__recipe-row')].map((row) =>
          row.querySelector('.brewing-page__recipe-name')?.textContent,
        ),
      ),
    ).toEqual([['nettle vigor'], []]);

    manager.clearBookTurnClass();

    expect(parent.querySelector('.brewing-page__recipe-turn-ghost')).toBeNull();
    expect(book?.classList.contains('is-turning')).toBe(false);

    manager.unmount();
    parent.remove();
  });

  it('uses current cauldron brew quantity for recipe info without quantity controls', () => {
    const snapshot = {
      brewing: {
        herbs: [
          {
            itemTypeId: 1001,
            key: 'sageHerb',
            label: 'sage',
            kind: 'herb',
            quantity: 9,
          },
          {
            itemTypeId: 1003,
            key: 'nettleHerb',
            label: 'nettle',
            kind: 'herb',
            quantity: 3,
          },
        ],
        cauldrons: [
          {
            cauldronIndex: 0,
            cauldronNumber: 1,
            level: 3,
            maxBrewQuantity: 3,
            brewQuantity: 3,
          },
        ],
        recipes: [
          {
            key: 'sageNettle',
            label: 'sage nettle',
            unlocked: true,
            manaCost: 12,
            brewDurationMs: 30_000,
            ingredients: [
              {
                itemTypeId: 1001,
                key: 'sageHerb',
                label: 'sage',
                quantity: 3,
              },
              {
                itemTypeId: 1003,
                key: 'nettleHerb',
                label: 'nettle',
                quantity: 1,
              },
            ],
          },
        ],
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingRecipeBookManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
      getSelectedRecipeKey: () => null,
      getCurrentCauldronIndex: () => 0,
      onSelectRecipe: () => {},
    });

    manager.mount(parent);

    expect(parent.querySelector('.brewing-page__quantity-summary')).toBeNull();
    expect(parent.querySelector('.brewing-page__quantity-button')).toBeNull();
    expect(parent.querySelector('.brewing-page__recipe-cost')?.textContent).toBe(
      '36 mana required',
    );
    expect(
      [...parent.querySelectorAll('.brewing-page__recipe-ingredient-row')].map((row) => ({
        required: row.querySelector('.brewing-page__recipe-ingredient-required')?.textContent,
        owned: row.querySelector('.brewing-page__recipe-ingredient-owned')?.textContent,
      })),
    ).toEqual([
      { required: '- 3 x 3 sage', owned: 'owned 9' },
      { required: '- 3 x 1 nettle', owned: 'owned 3' },
    ]);

    snapshot.brewing.cauldrons[0].brewQuantity = 1;
    manager.render(snapshot);

    expect(parent.querySelector('.brewing-page__recipe-cost')?.textContent).toBe(
      '12 mana required',
    );

    manager.unmount();
    parent.remove();
  });
});
