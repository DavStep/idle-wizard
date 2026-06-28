// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';
import { describe, expect, it, vi } from 'vitest';

import {
  GardenHerbInventoryManager,
  GardenSeedInventoryManager,
} from './GardenHerbInventoryManager.js';

const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');

function createGameplayFacadeFake(snapshot = null) {
  const currentSnapshot = snapshot ?? {
    garden: {
      seeds: [
        {
          itemTypeId: 2,
          key: 'mintSeed',
          label: 'mint seed',
          kind: 'seed',
          quantity: 2,
        },
      ],
    },
  };

  return {
    getSnapshot: () => currentSnapshot,
    subscribe: (listener) => {
      listener(currentSnapshot);
      return () => {};
    },
  };
}

function createSevenHerbSnapshot() {
  return {
    garden: {
      herbs: [
        {
          itemTypeId: 1,
          key: 'sageHerb',
          label: 'sage',
          kind: 'herb',
          quantity: 1,
          researched: true,
        },
        {
          itemTypeId: 2,
          key: 'mintHerb',
          label: 'mint',
          kind: 'herb',
          quantity: 2,
          researched: true,
        },
        {
          itemTypeId: 3,
          key: 'nettleHerb',
          label: 'nettle',
          kind: 'herb',
          quantity: 3,
          researched: true,
        },
        {
          itemTypeId: 4,
          key: 'lavenderHerb',
          label: 'lavender',
          kind: 'herb',
          quantity: 4,
          researched: true,
        },
        {
          itemTypeId: 5,
          key: 'frostmossHerb',
          label: 'frostmoss',
          kind: 'herb',
          quantity: 5,
          researched: true,
        },
        {
          itemTypeId: 6,
          key: 'mandrakeHerb',
          label: 'mandrake',
          kind: 'herb',
          quantity: 6,
          researched: true,
        },
        {
          itemTypeId: 7,
          key: 'nightshadeHerb',
          label: 'nightshade',
          kind: 'herb',
          quantity: 7,
          researched: true,
        },
      ],
    },
  };
}

describe('GardenSeedInventoryManager', () => {
  it('renders owned seed rows as pointer drag sources without native drag', () => {
    const parent = document.createElement('section');
    const onSeedDragStart = vi.fn();
    const manager = new GardenSeedInventoryManager({
      gameplayFacade: createGameplayFacadeFake(),
      onSeedDragStart,
    });

    manager.mount(parent);

    const row = parent.querySelector('.garden-page__seed-inventory-row');
    const pointerDown = new window.MouseEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      button: 0,
      clientX: 10,
      clientY: 20,
    });
    Object.defineProperty(pointerDown, 'pointerId', { value: 1 });

    expect(row?.draggable).toBe(false);
    expect(row?.classList.contains('is-draggable')).toBe(true);
    expect(row?.dataset.pageSwipeBlock).toBe('true');
    expect(row?.getAttribute('aria-label')).toBe('mint seed, owned 2');

    row.dispatchEvent(pointerDown);

    expect(onSeedDragStart).toHaveBeenCalledTimes(1);
    expect(onSeedDragStart.mock.calls[0][1]).toMatchObject({
      itemTypeId: 2,
      key: 'mintSeed',
      label: 'mint seed',
    });
  });

  it('keeps seed drag visuals lifted and reduced-motion safe', () => {
    const dragRule = baseCss.match(
      /\.garden-page__item-drag-ghost,\n\.garden-page__seed-drag-ghost\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const iconRule = baseCss.match(
      /\.garden-page__item-drag-ghost-icon\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(dragRule).toContain('width: 72px;');
    expect(dragRule).toContain('height: 72px;');
    expect(dragRule).not.toContain('background:');
    expect(dragRule).not.toContain('border:');
    expect(iconRule).toContain('width: 72px;');
    expect(iconRule).toContain('height: 72px;');
    expect(baseCss).toContain('@keyframes garden-page-plot-receive-seed');
    expect(baseCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.garden-page__plot-row\.is-receiving-seed \.garden-page__plot-box-frame[\s\S]*animation:\s*none;/,
    );
  });
});

describe('GardenHerbInventoryManager', () => {
  it('expands and collapses herb rows from the bottom border toggle', () => {
    const parent = document.createElement('section');
    const manager = new GardenHerbInventoryManager({
      gameplayFacade: createGameplayFacadeFake(createSevenHerbSnapshot()),
    });

    manager.mount(parent);

    const visibleRows = () =>
      [...parent.querySelectorAll('.garden-page__herb-row')].filter(
        (row) => !row.hidden,
      );
    const toggle = parent.querySelector('.garden-page__herbs-toggle');

    expect(parent.querySelector('.garden-page__herbs-count')?.textContent).toBe('6/7');
    expect(toggle?.textContent).toBe('expand');
    expect(visibleRows()).toHaveLength(6);

    toggle?.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(parent.querySelector('.garden-page__herbs-count')?.textContent).toBe('7/7');
    expect(toggle?.textContent).toBe('collapse');
    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    expect(visibleRows()).toHaveLength(7);

    toggle?.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(parent.querySelector('.garden-page__herbs-count')?.textContent).toBe('6/7');
    expect(toggle?.textContent).toBe('expand');
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(visibleRows()).toHaveLength(6);
  });

  it('keeps the expanded herb box inside the page scroll viewport', () => {
    const parent = document.createElement('section');
    parent.className = 'style-page-scroll';
    parent.style.scrollPaddingTop = '12px';
    parent.style.paddingBottom = '6px';
    parent.scrollBy = vi.fn();
    Object.defineProperty(parent, 'clientHeight', {
      configurable: true,
      value: 100,
    });
    parent.getBoundingClientRect = () => ({
      top: 0,
      right: 100,
      bottom: 200,
      left: 0,
      width: 100,
      height: 200,
      x: 0,
      y: 0,
      toJSON: () => {},
    });
    const manager = new GardenHerbInventoryManager({
      gameplayFacade: createGameplayFacadeFake(createSevenHerbSnapshot()),
    });

    manager.mount(parent);
    manager.root.getBoundingClientRect = () => ({
      top: 140,
      right: 100,
      bottom: 260,
      left: 0,
      width: 100,
      height: 120,
      x: 0,
      y: 140,
      toJSON: () => {},
    });

    parent
      .querySelector('.garden-page__herbs-toggle')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(parent.scrollBy).toHaveBeenCalledWith({
      top: 36,
      behavior: 'auto',
    });
  });

  it('keeps inventory hidden rows authoritative after grid row styling', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const rowsRule = baseCss.match(
      /\.garden-page__inventory-rows,\n\.garden-page__herb-rows,\n\.garden-page__seed-inventory-rows\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const gridRuleIndex = baseCss.indexOf(
      '.garden-page__inventory-row,\n.garden-page__herb-row,\n.garden-page__seed-inventory-row',
    );
    const hiddenRuleIndex = baseCss.indexOf(
      '.garden-page__inventory-row[hidden],\n.garden-page__herb-row[hidden],\n.garden-page__seed-inventory-row[hidden]',
    );
    const hiddenRule = baseCss.slice(hiddenRuleIndex, baseCss.indexOf('}', hiddenRuleIndex));

    expect(rowsRule).toContain('display: grid;');
    expect(rowsRule).toContain('grid-template-columns: repeat(2, minmax(0, 1fr));');
    expect(rowsRule).toContain(
      'min-height: calc(var(--style-row-min-height) * 3);',
    );
    expect(gridRuleIndex).toBeGreaterThan(-1);
    expect(hiddenRuleIndex).toBeGreaterThan(gridRuleIndex);
    expect(hiddenRule).toContain('display: none;');
  });
});
