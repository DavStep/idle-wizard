// @vitest-environment jsdom

import { existsSync, readFileSync } from 'node:fs';
import { cwd } from 'node:process';

import { describe, expect, it, vi } from 'vitest';

import { BrewingCauldronManager } from './BrewingCauldronManager.js';

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

function createHerb(index) {
  return {
    itemTypeId: 1000 + index,
    key: `herb${index}`,
    label: `herb ${index}`,
    kind: 'herb',
    quantity: index,
    availableQuantity: index,
    researched: true,
  };
}

function dispatchPointer(target, type, { pointerId = 1, button = 0, clientX = 0, clientY = 0 } = {}) {
  const event = new window.MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button,
    clientX,
    clientY,
  });
  Object.defineProperty(event, 'pointerId', {
    configurable: true,
    value: pointerId,
  });
  target.dispatchEvent(event);
  return event;
}

function createTouchEvent(type, touchCount) {
  const event = new window.Event(type, {
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(event, 'touches', {
    value: Array.from({ length: touchCount }, (_, index) => ({ identifier: index })),
  });
  return event;
}

function setElementRect(element, { left = 0, top = 0, width = 1, height = 1 } = {}) {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
    }),
  });
}

describe('BrewingCauldronManager', () => {
  it('opens the cauldron dialog when a world cauldron is pressed', () => {
    const snapshot = {
      brewing: {
        herbs: [],
        ingredients: [],
        recipes: [],
        maxIngredients: 5,
        manaCost: 12,
        activeBrew: null,
        selectedRecipe: null,
        match: null,
        canAddIngredient: true,
        canBrew: false,
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const onOpenSelectRecipe = vi.fn();
    const manager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
      onOpenSelectRecipe,
    });

    manager.mount(parent);

    parent
      .querySelector('.brewing-page__cauldron')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(onOpenSelectRecipe).toHaveBeenCalledWith(0);

    manager.unmount();
    parent.remove();
  });

  it('does not open recipes from brew action clicks or retargeted action taps', () => {
    const snapshot = {
      brewing: {
        herbs: [
          {
            itemTypeId: 1001,
            key: 'sageHerb',
            label: 'sage',
            kind: 'herb',
            quantity: 3,
            availableQuantity: 0,
          },
        ],
        ingredients: [
          { slotIndex: 0, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
          { slotIndex: 1, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
          { slotIndex: 2, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
        ],
        recipes: [
          {
            key: 'manaTonic',
            label: 'mana tonic',
            unlocked: true,
            ingredients: [
              {
                itemTypeId: 1001,
                key: 'sageHerb',
                label: 'sage',
                quantity: 3,
              },
            ],
          },
        ],
        maxIngredients: 5,
        manaCost: 5,
        activeBrew: null,
        match: {
          key: 'manaTonic',
          label: 'mana tonic',
          unlocked: true,
        },
        canAddIngredient: true,
        canBrew: true,
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const brewCauldron = vi.fn(() => ({ ok: true }));
    const onOpenSelectRecipe = vi.fn();
    const manager = new BrewingCauldronManager({
      gameplayFacade: {
        ...createGameplayFacadeFake(snapshot),
        brewCauldron,
      },
      getSelectedRecipeKey: () => 'manaTonic',
      onOpenSelectRecipe,
    });

    manager.mount(parent);

    const cauldron = parent.querySelector('.brewing-page__cauldron');
    const actions = parent.querySelector('.brewing-page__actions');
    const action = parent.querySelector('.brewing-page__action-button[data-action="brew"]');

    actions.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
    action.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
    cauldron.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(brewCauldron).toHaveBeenCalledTimes(1);
    expect(brewCauldron).toHaveBeenCalledWith(0);
    expect(onOpenSelectRecipe).not.toHaveBeenCalled();

    manager.unmount();
    parent.remove();
  });

  it('opens an empty cauldron from a captured world tap', () => {
    const snapshot = {
      brewing: {
        herbs: [],
        ingredients: [],
        recipes: [],
        maxIngredients: 5,
        manaCost: 12,
        activeBrew: null,
        selectedRecipe: null,
        match: null,
        canAddIngredient: true,
        canBrew: false,
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const onOpenSelectRecipe = vi.fn();
    const manager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
      onOpenSelectRecipe,
    });

    manager.mount(parent);

    const shell = parent.querySelector('.brewing-page__world-shell');
    const cauldron = parent.querySelector('.brewing-page__cauldron');
    const empty = cauldron.querySelector('.brewing-page__cauldron-empty');

    dispatchPointer(empty, 'pointerdown', {
      pointerId: 1,
      clientX: 80,
      clientY: 90,
    });
    dispatchPointer(shell, 'pointerup', {
      pointerId: 1,
      clientX: 80,
      clientY: 90,
    });
    cauldron.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(onOpenSelectRecipe).toHaveBeenCalledTimes(1);
    expect(onOpenSelectRecipe).toHaveBeenCalledWith(0);

    manager.unmount();
    parent.remove();
  });

  it('opens an empty cauldron from a captured world tap with small drift', () => {
    const snapshot = {
      brewing: {
        herbs: [],
        ingredients: [],
        recipes: [],
        maxIngredients: 5,
        manaCost: 12,
        activeBrew: null,
        selectedRecipe: null,
        match: null,
        canAddIngredient: true,
        canBrew: false,
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const onOpenSelectRecipe = vi.fn();
    const manager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
      onOpenSelectRecipe,
    });

    manager.mount(parent);

    const shell = parent.querySelector('.brewing-page__world-shell');
    const cauldron = parent.querySelector('.brewing-page__cauldron');
    const empty = cauldron.querySelector('.brewing-page__cauldron-empty');

    dispatchPointer(empty, 'pointerdown', {
      pointerId: 1,
      clientX: 80,
      clientY: 90,
    });
    dispatchPointer(shell, 'pointermove', {
      pointerId: 1,
      clientX: 86,
      clientY: 90,
    });
    dispatchPointer(shell, 'pointerup', {
      pointerId: 1,
      clientX: 86,
      clientY: 90,
    });
    cauldron.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(onOpenSelectRecipe).toHaveBeenCalledTimes(1);
    expect(onOpenSelectRecipe).toHaveBeenCalledWith(0);

    manager.unmount();
    parent.remove();
  });

  it('pans the world when dragging from a cauldron and suppresses the follow-up click', () => {
    const snapshot = {
      brewing: {
        herbs: [],
        ingredients: [],
        recipes: [],
        maxIngredients: 5,
        manaCost: 12,
        activeBrew: null,
        selectedRecipe: null,
        match: null,
        canAddIngredient: true,
        canBrew: false,
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const onOpenSelectRecipe = vi.fn();
    const manager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
      onOpenSelectRecipe,
    });

    manager.mount(parent);

    const shell = parent.querySelector('.brewing-page__world-shell');
    const cauldron = parent.querySelector('.brewing-page__cauldron');
    Object.defineProperty(shell, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ left: 0, top: 0, width: 200, height: 200 }),
    });

    dispatchPointer(cauldron, 'pointerdown', {
      pointerId: 1,
      clientX: 100,
      clientY: 100,
    });
    dispatchPointer(shell, 'pointermove', {
      pointerId: 1,
      clientX: 50,
      clientY: 40,
    });
    dispatchPointer(shell, 'pointerup', {
      pointerId: 1,
      clientX: 50,
      clientY: 40,
    });
    cauldron.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));

    const world = parent.querySelector('.brewing-page__world');
    expect(world.style.getPropertyValue('--brewing-page-world-pan-x')).toBe('-50px');
    expect(world.style.getPropertyValue('--brewing-page-world-pan-y')).toBe('-60px');
    expect(onOpenSelectRecipe).not.toHaveBeenCalled();

    manager.unmount();
    parent.remove();
  });

  it('pinch-zooms the world when the first pointer starts on a cauldron', () => {
    const snapshot = {
      brewing: {
        herbs: [],
        ingredients: [],
        recipes: [],
        maxIngredients: 5,
        manaCost: 12,
        activeBrew: null,
        selectedRecipe: null,
        match: null,
        canAddIngredient: true,
        canBrew: false,
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
    });

    manager.mount(parent);

    const shell = parent.querySelector('.brewing-page__world-shell');
    const cauldron = parent.querySelector('.brewing-page__cauldron');
    Object.defineProperty(shell, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ left: 0, top: 0, width: 200, height: 200 }),
    });

    dispatchPointer(cauldron, 'pointerdown', {
      pointerId: 1,
      clientX: 80,
      clientY: 100,
    });
    dispatchPointer(shell, 'pointerdown', {
      pointerId: 2,
      clientX: 140,
      clientY: 100,
    });
    dispatchPointer(shell, 'pointermove', {
      pointerId: 2,
      clientX: 176,
      clientY: 100,
    });

    const world = parent.querySelector('.brewing-page__world');
    const zoom = Number.parseFloat(world.style.getPropertyValue('--brewing-page-world-zoom'));
    expect(zoom).toBeGreaterThan(1);

    dispatchPointer(shell, 'pointerup', {
      pointerId: 2,
      clientX: 176,
      clientY: 100,
    });
    dispatchPointer(shell, 'pointerup', {
      pointerId: 1,
      clientX: 80,
      clientY: 100,
    });

    expect(world.style.getPropertyValue('--brewing-page-world-zoom')).toBe('1.16');

    manager.unmount();
    parent.remove();
  });

  it('blocks native page zoom while the brewing world owns a pinch', () => {
    const snapshot = {
      brewing: {
        herbs: [],
        ingredients: [],
        recipes: [],
        maxIngredients: 5,
        manaCost: 12,
        activeBrew: null,
        selectedRecipe: null,
        match: null,
        canAddIngredient: true,
        canBrew: false,
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
    });

    manager.mount(parent);

    const shell = parent.querySelector('.brewing-page__world-shell');
    const cauldron = parent.querySelector('.brewing-page__cauldron');
    const firstPointerDown = dispatchPointer(cauldron, 'pointerdown', {
      pointerId: 1,
      clientX: 80,
      clientY: 100,
    });
    const secondPointerDown = dispatchPointer(shell, 'pointerdown', {
      pointerId: 2,
      clientX: 140,
      clientY: 100,
    });
    const multiTouchStart = createTouchEvent('touchstart', 2);
    const singleTouchStart = createTouchEvent('touchstart', 1);
    const multiTouchMove = createTouchEvent('touchmove', 2);
    const documentMultiTouchMove = createTouchEvent('touchmove', 2);
    const gestureStart = new window.Event('gesturestart', {
      bubbles: true,
      cancelable: true,
    });

    shell.dispatchEvent(singleTouchStart);
    shell.dispatchEvent(multiTouchStart);
    shell.dispatchEvent(multiTouchMove);
    shell.dispatchEvent(gestureStart);
    document.dispatchEvent(documentMultiTouchMove);

    expect(firstPointerDown.defaultPrevented).toBe(false);
    expect(secondPointerDown.defaultPrevented).toBe(true);
    expect(singleTouchStart.defaultPrevented).toBe(false);
    expect(multiTouchStart.defaultPrevented).toBe(true);
    expect(multiTouchMove.defaultPrevented).toBe(true);
    expect(gestureStart.defaultPrevented).toBe(true);
    expect(documentMultiTouchMove.defaultPrevented).toBe(true);

    manager.unmount();
    parent.remove();
  });

  it('keeps world pan and zoom across page unmount and remount', () => {
    const snapshot = {
      brewing: {
        herbs: [],
        ingredients: [],
        recipes: [],
        maxIngredients: 5,
        manaCost: 12,
        activeBrew: null,
        selectedRecipe: null,
        match: null,
        canAddIngredient: true,
        canBrew: false,
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
    });

    manager.mount(parent);
    manager.setWorldViewport(-80, -120, 0.82);
    manager.unmount();
    parent.remove();

    const nextParent = document.createElement('div');
    document.body.append(nextParent);
    manager.mount(nextParent);

    const world = nextParent.querySelector('.brewing-page__world');
    expect(world.style.getPropertyValue('--brewing-page-world-pan-x')).toBe('-80px');
    expect(world.style.getPropertyValue('--brewing-page-world-pan-y')).toBe('-120px');
    expect(world.style.getPropertyValue('--brewing-page-world-zoom')).toBe('0.82');

    manager.unmount();
    nextParent.remove();
  });

  it('rubber-bands world panning outside the borders and snaps back on release', () => {
    const snapshot = {
      brewing: {
        herbs: [],
        ingredients: [],
        recipes: [],
        maxIngredients: 5,
        manaCost: 12,
        activeBrew: null,
        selectedRecipe: null,
        match: null,
        canAddIngredient: true,
        canBrew: false,
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
    });

    manager.mount(parent);

    const shell = parent.querySelector('.brewing-page__world-shell');
    Object.defineProperty(shell, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ width: 200, height: 200 }),
    });

    shell.dispatchEvent(
      new window.MouseEvent('pointerdown', {
        bubbles: true,
        button: 0,
        clientX: 100,
        clientY: 100,
      }),
    );
    shell.dispatchEvent(
      new window.MouseEvent('pointermove', {
        bubbles: true,
        clientX: -500,
        clientY: -2000,
      }),
    );

    const world = parent.querySelector('.brewing-page__world');
    const rubberPanX = Number.parseFloat(
      world.style.getPropertyValue('--brewing-page-world-pan-x'),
    );
    const rubberPanY = Number.parseFloat(
      world.style.getPropertyValue('--brewing-page-world-pan-y'),
    );

    expect(rubberPanX).toBeLessThan(-470);
    expect(rubberPanX).toBeGreaterThan(-524);
    expect(rubberPanY).toBeLessThan(-1760);
    expect(rubberPanY).toBeGreaterThan(-1814);

    shell.dispatchEvent(
      new window.MouseEvent('pointerup', {
        bubbles: true,
        clientX: -500,
        clientY: -2000,
      }),
    );

    expect(world.style.getPropertyValue('--brewing-page-world-pan-x')).toBe('-470px');
    expect(world.style.getPropertyValue('--brewing-page-world-pan-y')).toBe('-1760px');
    expect(world.style.getPropertyValue('--brewing-page-world-zoom')).toBe('1');
    expect(world.classList.contains('is-settling')).toBe(true);

    manager.unmount();
    parent.remove();
  });

  it('rubber-bands world zoom outside the caps and snaps back on release', () => {
    const snapshot = {
      brewing: {
        herbs: [],
        ingredients: [],
        recipes: [],
        maxIngredients: 5,
        manaCost: 12,
        activeBrew: null,
        selectedRecipe: null,
        match: null,
        canAddIngredient: true,
        canBrew: false,
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
    });

    manager.mount(parent);

    const shell = parent.querySelector('.brewing-page__world-shell');
    Object.defineProperty(shell, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ left: 0, top: 0, width: 200, height: 200 }),
    });

    manager.setWorldZoomAroundPoint(0.3, 100, 100, { rubber: true });

    const world = parent.querySelector('.brewing-page__world');
    const rubberZoom = Number.parseFloat(
      world.style.getPropertyValue('--brewing-page-world-zoom'),
    );

    expect(rubberZoom).toBeLessThan(0.56);
    expect(rubberZoom).toBeGreaterThan(0.44);

    manager.settleWorldViewport();

    expect(world.style.getPropertyValue('--brewing-page-world-zoom')).toBe('0.56');
    expect(world.classList.contains('is-settling')).toBe(true);

    manager.unmount();
    parent.remove();
  });

  it('does not zoom the world from wheel input', () => {
    const snapshot = {
      brewing: {
        herbs: [],
        ingredients: [],
        recipes: [],
        maxIngredients: 5,
        manaCost: 12,
        activeBrew: null,
        selectedRecipe: null,
        match: null,
        canAddIngredient: true,
        canBrew: false,
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
    });

    manager.mount(parent);

    const shell = parent.querySelector('.brewing-page__world-shell');
    const world = parent.querySelector('.brewing-page__world');
    const wheelEvent = new window.WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      clientX: 100,
      clientY: 100,
      deltaY: -120,
    });

    shell.dispatchEvent(wheelEvent);

    expect(world.style.getPropertyValue('--brewing-page-world-zoom')).toBe('1');
    expect(wheelEvent.defaultPrevented).toBe(false);

    manager.unmount();
    parent.remove();
  });

  it('keeps the world shell edge-to-edge while the hidden herb box opens above bottom controls', () => {
    const worldViewRule = baseCss.match(
      /\.brewing-page__world-view\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const shellRule = baseCss.match(
      /\.brewing-page__world-shell\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const boundaryRule = baseCss.match(
      /\.brewing-page__world-boundary\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const herbsRule = baseCss.match(
      /\.style-box\.brewing-page__herbs\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const herbRowsRule = baseCss.match(
      /\.brewing-page__herb-rows\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const webWideWorldRule = baseCss.match(
      /\.game-stage\[data-viewport-mode="web-wide"\]\s*:where\(\s*\.brewing-page__world-view,\s*\.garden-page__plot-world\s*\)\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const webWideShellRule = baseCss.match(
      /\.game-stage\[data-viewport-mode="web-wide"\]\s*:where\(\s*\.brewing-page__world-shell,\s*\.garden-page__world-shell\s*\)\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(baseCss).toContain('--brewing-page-herbs-box-clearance: 0px;');
    expect(worldViewRule).toContain('--brewing-page-world-bottom-offset: 0px;');
    expect(worldViewRule).toContain('top: 0;');
    expect(worldViewRule).toContain('right: 0;');
    expect(worldViewRule).toContain('left: 0;');
    expect(baseCss).toContain('--style-source-ui-gutter-x: calc(');
    expect(baseCss).toContain('var(--app-stage-width, var(--style-source-ui-screen-width))');
    expect(baseCss).toContain(
      '--app-source-ui-screen-width,\n                  var(--style-source-ui-screen-width)',
    );
    expect(shellRule).toContain(
      'top: calc(var(--style-room-content-top) - var(--style-room-content-edge));',
    );
    expect(shellRule).toContain('bottom: calc(');
    expect(shellRule).toContain('var(--brewing-page-world-bottom-offset)');
    expect(shellRule).toContain('var(--brewing-page-herbs-box-clearance)');
    expect(shellRule).toContain('z-index: 0;');
    expect(shellRule).toContain('overflow: visible;');
    expect(boundaryRule).toContain('display: none;');
    expect(boundaryRule).toContain('border: 0;');
    expect(herbsRule).toContain('position: absolute;');
    expect(herbsRule).toContain('top: auto;');
    expect(herbsRule).toContain('right: var(--style-room-chrome-edge);');
    expect(herbsRule).toContain('bottom: calc(');
    expect(herbsRule).toContain('80.25px + var(--brewing-page-guide-controls-gap)');
    expect(herbsRule).toContain('var(--room-inventory-panel-y-offset)');
    expect(herbsRule).toContain('left: var(--style-room-chrome-edge);');
    expect(herbsRule).toContain('width: auto;');
    expect(herbsRule).toContain('max-width: none;');
    expect(herbsRule).toContain('z-index: 2;');
    expect(herbRowsRule).toContain('display: grid;');
    expect(herbRowsRule).toContain('grid-template-columns: repeat(2, minmax(0, 1fr));');
    expect(herbRowsRule).toContain(
      'min-height: calc(var(--style-row-min-height) * 3);',
    );
    expect(webWideWorldRule).toContain('overflow: visible;');
    expect(webWideShellRule).toContain('right: calc(var(--style-source-ui-gutter-x) * -1);');
    expect(webWideShellRule).toContain('left: calc(var(--style-source-ui-gutter-x) * -1);');
  });

  it('keeps active brew text singular and the timer rail full width', () => {
    const activeBubbleRule = baseCss.match(
      /\.brewing-page__cauldron\.has-active-brew\s+\.brewing-page__cauldron-bubble\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const previewRule = baseCss.match(
      /\.brewing-page__cauldron-preview\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const activeProgressRule = baseCss.match(
      /\.brewing-page__active-progress\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const activeTextRule = baseCss.match(
      /\.brewing-page__active-brew-text\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const emptyItemsRule = baseCss.match(
      /\.brewing-page__cauldron-items\.is-empty\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const previewLabelHiddenRule = baseCss.match(
      /\.brewing-page__cauldron-preview-label\[hidden\]\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const previewLabelRule = baseCss.match(
      /\.brewing-page__cauldron-preview-label\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const previewSummaryRule = baseCss.match(
      /\.brewing-page__cauldron-preview-summary\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const previewSummaryHiddenRule = baseCss.match(
      /\.brewing-page__cauldron-preview-summary\[hidden\]\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const previewIconRule = baseCss.match(
      /\.brewing-page__cauldron-preview-icon\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const potionBoxRule = baseCss.match(
      /\.brewing-page__cauldron-potion-box\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const cauldronContentRule = baseCss.match(
      /\.brewing-page__cauldron-content\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const potionBoxPreviewRule = baseCss.match(
      /\.brewing-page__cauldron-potion-box\s+\.brewing-page__cauldron-preview\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const potionBoxArtRule = baseCss.match(
      /\.brewing-page__cauldron-potion-box\s+\.brewing-page__cauldron-art\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const cauldronArtRule = baseCss.match(
      /\.brewing-page__cauldron-art\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const cauldronArtAssetRule = baseCss.match(
      /\.brewing-page__cauldron-art-image,\s*\.brewing-page__cauldron-art-liquid\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const cauldronLiquidHiddenRule = baseCss.match(
      /\.brewing-page__cauldron-art-liquid\[hidden\]\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(activeBubbleRule).toContain('display: none;');
    expect(previewRule).toContain('position: static;');
    expect(previewRule).toContain('justify-content: flex-start;');
    expect(previewRule).toContain('width: 100%;');
    expect(previewRule).toContain('padding-top: 0;');
    expect(cauldronContentRule).toContain('display: flex;');
    expect(cauldronContentRule).toContain(
      'gap: var(--brewing-page-cauldron-box-gap);',
    );
    expect(potionBoxRule).toContain('width: var(--brewing-page-cauldron-art-width);');
    expect(potionBoxRule).toContain('padding: 0;');
    expect(potionBoxPreviewRule).toContain('min-height: 100%;');
    expect(cauldronArtRule).toContain('width: var(--brewing-page-cauldron-art-width);');
    expect(cauldronArtRule).toContain('height: var(--brewing-page-cauldron-art-height);');
    expect(cauldronArtRule).toContain('pointer-events: none;');
    expect(potionBoxArtRule).toContain(
      'width: calc(var(--brewing-page-cauldron-art-width) - 20px);',
    );
    expect(potionBoxArtRule).toContain(
      'height: calc(var(--brewing-page-cauldron-art-height) - 35px);',
    );
    expect(baseCss).toContain('--brewing-page-cauldron-art-scale: 0.9;');
    expect(cauldronArtAssetRule).toContain(
      'transform: scale(var(--brewing-page-cauldron-art-scale));',
    );
    expect(cauldronArtAssetRule).toContain('transform-origin: center;');
    expect(baseCss).toContain(
      'background: var(--brewing-page-cauldron-liquid-color, #0a95f5);',
    );
    expect(baseCss).toContain(
      'mask-image: var(--brewing-page-cauldron-liquid-mask);',
    );
    expect(cauldronLiquidHiddenRule).toContain('display: none;');
    expect(emptyItemsRule).toContain('text-align: left;');
    expect(emptyItemsRule).toContain('pointer-events: none;');
    expect(previewLabelRule).toContain('display: inline-flex;');
    expect(previewLabelRule).toContain('align-items: center;');
    expect(previewLabelRule).toContain('justify-content: center;');
    expect(previewLabelRule).toContain('text-align: center;');
    expect(previewLabelRule).toContain('white-space: nowrap;');
    expect(previewSummaryRule).toContain('display: flex;');
    expect(previewSummaryRule).toContain('width: 150px;');
    expect(previewSummaryRule).toContain('max-width: 150px;');
    expect(previewSummaryHiddenRule).toContain('display: flex !important;');
    expect(previewSummaryHiddenRule).toContain('visibility: hidden;');
    expect(baseCss).toContain('.brewing-page__cauldron-preview-icon:not([hidden])');
    expect(baseCss).toContain('max-width: calc(100% - 50px);');
    expect(previewIconRule).toContain('width: 22px;');
    expect(previewIconRule).toContain('height: 22px;');
    expect(previewLabelHiddenRule).toContain('display: none;');
    expect(activeTextRule).toContain('white-space: nowrap;');
    expect(activeTextRule).toContain('text-overflow: ellipsis;');
    expect(activeProgressRule).toContain('width: 100%;');
  });

  it('keeps the cauldron world box expanded around cauldrons on every side', () => {
    const worldRule = baseCss.match(
      /\.brewing-page__world\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const snapshot = {
      brewing: {
        herbs: [],
        ingredients: [],
        recipes: [],
        maxIngredients: 5,
        manaCost: 12,
        activeBrew: null,
        selectedRecipe: null,
        match: null,
        canAddIngredient: true,
        canBrew: false,
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
    });

    manager.mount(parent);

    const cauldron = parent.querySelector('.brewing-page__cauldron');

    expect(worldRule).toContain('width: 670px;');
    expect(worldRule).toContain('height: 1960px;');
    expect(cauldron?.style.left).toBe('122px');
    expect(cauldron?.style.top).toBe('112px');

    manager.unmount();
    parent.remove();
  });

  it('places cauldrons in a spaced vertical stack', () => {
    const manager = new BrewingCauldronManager();

    expect(
      Array.from({ length: 6 }, (_, cauldronIndex) =>
        manager.getCauldronWorldPosition(cauldronIndex),
      ),
    ).toEqual([
      { x: 122, y: 112 },
      { x: 122, y: 284 },
      { x: 122, y: 456 },
      { x: 122, y: 628 },
      { x: 122, y: 800 },
      { x: 122, y: 972 },
    ]);
  });

  it('fits the first world view so cauldrons are not cut off horizontally', () => {
    const snapshot = {
      brewing: {
        herbs: [],
        cauldrons: [
          {
            cauldronIndex: 0,
            cauldronNumber: 1,
            ingredients: [],
            maxIngredients: 5,
            manaCost: 12,
            activeBrew: null,
            selectedRecipe: null,
            match: null,
            canAddIngredient: true,
            canBrew: false,
          },
          {
            cauldronIndex: 1,
            cauldronNumber: 2,
            unlocked: false,
            ingredients: [],
            maxIngredients: 5,
            manaCost: 12,
          },
        ],
        recipes: [],
        maxIngredients: 5,
        manaCost: 12,
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
    });

    manager.mount(parent);

    const shell = parent.querySelector('.brewing-page__world-shell');
    Object.defineProperty(shell, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ width: 360, height: 390 }),
    });

    manager.fitWorldViewportToCauldrons(snapshot.brewing.cauldrons);

    const first = manager.getCauldronWorldPosition(0);
    const second = manager.getCauldronWorldPosition(1);
    const firstLeft = manager.worldPan.x + first.x * manager.worldZoom;
    const secondRight = manager.worldPan.x + (second.x + 516) * manager.worldZoom;

    expect(firstLeft).toBeGreaterThanOrEqual(15.9);
    expect(secondRight).toBeLessThanOrEqual(344.1);
    expect(manager.worldZoom).toBeLessThan(1);

    manager.unmount();
    parent.remove();
  });

  it('centers cauldrons inside a web-wide shell without cropping the world', () => {
    const snapshot = {
      brewing: {
        herbs: [],
        cauldrons: [
          {
            cauldronIndex: 0,
            cauldronNumber: 1,
            ingredients: [],
            maxIngredients: 5,
            manaCost: 12,
            activeBrew: null,
            selectedRecipe: null,
            match: null,
            canAddIngredient: true,
            canBrew: false,
          },
          {
            cauldronIndex: 1,
            cauldronNumber: 2,
            unlocked: false,
            ingredients: [],
            maxIngredients: 5,
            manaCost: 12,
          },
        ],
        recipes: [],
        maxIngredients: 5,
        manaCost: 12,
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
    });

    manager.mount(parent);

    const shell = parent.querySelector('.brewing-page__world-shell');
    Object.defineProperty(shell, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ width: 1200, height: 390 }),
    });

    manager.fitWorldViewportToCauldrons(snapshot.brewing.cauldrons);

    const bounds = manager.getWorldPanBounds(1);
    const first = manager.getCauldronWorldPosition(0);
    const second = manager.getCauldronWorldPosition(1);
    const firstLeft = manager.worldPan.x + first.x * manager.worldZoom;
    const secondRight = manager.worldPan.x + (second.x + 516) * manager.worldZoom;

    expect(bounds.minX).toBe(0);
    expect(bounds.maxX).toBe(530);
    expect(manager.worldZoom).toBe(1);
    expect(firstLeft).toBeGreaterThan(300);
    expect(secondRight).toBeLessThan(900);
    expect(manager.worldPan.x).toBeGreaterThanOrEqual(bounds.minX);
    expect(manager.worldPan.x + 670).toBeLessThanOrEqual(1200);

    manager.unmount();
    parent.remove();
  });

  it('renders locked cauldrons like garden buy slots', () => {
    const snapshot = {
      coin: { current: 0 },
      brewing: {
        herbs: [],
        cauldrons: [
          {
            cauldronIndex: 0,
            cauldronNumber: 1,
            ingredients: [],
            maxIngredients: 5,
            manaCost: 12,
            activeBrew: null,
            selectedRecipe: null,
            match: null,
            canAddIngredient: true,
            canBrew: false,
          },
          {
            cauldronIndex: 1,
            cauldronNumber: 2,
            unlocked: false,
            ingredients: [],
            maxIngredients: 5,
            manaCost: 12,
            nextCauldronCost: 3,
            canBuyCauldron: false,
          },
        ],
        recipes: [],
        maxIngredients: 5,
        manaCost: 12,
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
    });

    manager.mount(parent);

    const locked = parent.querySelectorAll('.brewing-page__cauldron')[1];
    const action = locked.querySelector('.brewing-page__action-button');
    const actionCost = action?.querySelector('.brewing-page__action-button-cost');
    const actions = locked.querySelector('.brewing-page__actions');
    const recipeButton = locked.querySelector('.brewing-page__cauldron-select-recipe-text');
    const quantityOptions = locked.querySelector('.brewing-page__quantity-options');
    const quantityButton = locked.querySelector('.brewing-page__quantity-button');
    const autoButton = locked.querySelector('.brewing-page__auto-button');
    const lockedTitle = locked.querySelector(
      '.brewing-page__cauldron-recipe-box > .style-box__title',
    );
    const count = locked.querySelector('.brewing-page__cauldron-count');
    const content = locked.querySelector('.brewing-page__cauldron-content');
    const lockedBox = locked.querySelector('.brewing-page__cauldron-locked-box');
    const lockedFrame = locked.querySelector('.brewing-page__cauldron-locked-frame');
    const lockedLabel = locked.querySelector('.brewing-page__cauldron-locked-label');
    const baseLockedBoxRule = baseCss.match(
      /^\.brewing-page__cauldron-locked-box\s*\{(?<body>[^}]*)\}/m,
    )?.groups?.body;
    const lockedFrameRule = baseCss.match(
      /^\.brewing-page__cauldron-locked-frame\s*\{(?<body>[^}]*)\}/m,
    )?.groups?.body;
    const lockedLabelRule = baseCss.match(
      /\.brewing-page__cauldron-locked-label\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const lockedRecipeBoxRule = baseCss.match(
      /\.brewing-page__cauldron\.is-locked\s+\.brewing-page__cauldron-recipe-box\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const lockedRecipeBoxFrameRule = baseCss.match(
      /\.brewing-page__cauldron\.is-locked\s+\.brewing-page__cauldron-recipe-box\.style-box\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const lockedChromeRule = baseCss.match(
      /\.brewing-page__cauldron\.is-locked\s+\.brewing-page__cauldron-recipe-box\s+>\s+\.style-box__title,[\s\S]*?\.brewing-page__cauldron-count\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const hiddenSubBoxRule = baseCss.match(
      /\.brewing-page__cauldron-recipe-box\[hidden\],\s*\.brewing-page__cauldron-potion-box\[hidden\]\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const lockedActionsRule = baseCss.match(
      /\.brewing-page__cauldron\.is-locked\s+\.brewing-page__actions\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const hiddenCountRule = baseCss.match(
      /\.brewing-page__cauldron-count\[hidden\]\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const hiddenSideActionRule = baseCss.match(
      /\.style-button\.brewing-page__cauldron-select-recipe-text\[hidden\],\s*\.style-button\.brewing-page__quantity-button\[hidden\],\s*\.style-button\.brewing-page__auto-button\[hidden\]\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const coinCostRule = baseCss.match(
      /\.brewing-page__actions\s+\.style-button\.brewing-page__action-button\s+\.brewing-page__action-button-cost\[data-resource-color="coin"\],[\s\S]*?\.style-resource-label--coin\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const coinCostIconRule = baseCss.match(
      /\.brewing-page__action-button-cost\[data-resource-color="coin"\]\s+\.style-resource-label__icon\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const coinCostTextRule = baseCss.match(
      /\.brewing-page__action-button-cost\[data-resource-color="coin"\]\s+:where\(\.style-resource-label__text,\s*\.style-resource-label__spacer\)\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(locked.classList.contains('is-locked')).toBe(true);
    expect(locked.classList.contains('is-buyable')).toBe(false);
    expect(locked.getAttribute('aria-disabled')).toBe('true');
    expect(locked.getAttribute('aria-label')).toBe('buy cauldron 2');
    expect(baseLockedBoxRule).toContain('display: grid;');
    expect(baseLockedBoxRule).toContain('place-items: center;');
    expect(baseLockedBoxRule).toContain('text-align: center;');
    expect(baseLockedBoxRule).toContain('background: transparent;');
    expect(lockedRecipeBoxRule).toContain('background: transparent;');
    expect(lockedRecipeBoxFrameRule).toContain('padding: 0;');
    expect(lockedRecipeBoxFrameRule).toContain('background: transparent;');
    expect(lockedRecipeBoxFrameRule).toContain('border: 0;');
    expect(lockedRecipeBoxFrameRule).toContain('border-image: none;');
    expect(lockedChromeRule).toContain('display: none;');
    expect(lockedFrameRule).toContain('width: 100%;');
    expect(lockedFrameRule).toContain('height: 100%;');
    expect(lockedFrameRule).toContain('min-height: var(--brewing-page-cauldron-art-height);');
    expect(lockedFrameRule).toContain('border: var(--style-border);');
    expect(lockedFrameRule).toContain('border-style: dotted;');
    expect(lockedFrameRule).toContain(
      'color-mix(in srgb, var(--style-stroke) 45%, transparent)',
    );
    expect(lockedLabelRule).toContain('position: absolute;');
    expect(lockedLabelRule).toContain('text-overflow: ellipsis;');
    expect(lockedLabelRule).toContain('white-space: nowrap;');
    expect(lockedLabelRule).toContain('transform: translate(-50%, -50%);');
    expect(hiddenSubBoxRule).toContain('display: none;');
    expect(lockedActionsRule).toContain('display: block;');
    expect(hiddenCountRule).toContain('display: none;');
    expect(hiddenSideActionRule).toContain('display: none;');
    expect(coinCostRule).toContain('color: var(--style-resource-coin);');
    expect(coinCostIconRule).toContain('display: inline-block;');
    expect(coinCostTextRule).toContain('display: none;');
    expect(lockedBox?.hidden).toBe(false);
    expect(lockedBox?.querySelector('.style-box__title')).toBeNull();
    expect(lockedTitle?.hidden).toBe(true);
    expect(lockedTitle?.textContent).toBe('');
    expect(lockedFrame).not.toBeNull();
    expect(lockedLabel?.textContent).toBe('locked');
    expect(locked.querySelector('.brewing-page__cauldron-recipe-box')?.hidden).toBe(false);
    expect(content?.hidden).toBe(true);
    expect(locked.querySelector('.brewing-page__cauldron-potion-box')?.hidden).toBe(true);
    expect(count?.hidden).toBe(true);
    expect(locked.querySelector('.brewing-page__cauldron-bubble')?.hidden).toBe(true);
    expect(locked.querySelector('.brewing-page__cauldron-items')?.hidden).toBe(true);
    expect(locked.querySelector('.brewing-page__cauldron-preview-label')?.hidden).toBe(true);
    expect(actions?.hidden).toBe(false);
    expect(recipeButton?.hidden).toBe(true);
    expect(quantityOptions?.hidden).toBe(true);
    expect(quantityButton).toBeNull();
    expect(autoButton?.hidden).toBe(true);
    expect(action?.textContent).toBe('buy 3 coin');
    expect(actionCost?.dataset.resourceColor).toBe('coin');
    expect(
      actionCost?.querySelector('.style-resource-label--coin .style-resource-label__amount')
        ?.textContent,
    ).toBe('3');
    expect(
      actionCost?.querySelector('.style-resource-label--coin .style-resource-label__icon')
        ?.dataset.assetAtlasFrame,
    ).toBe('resource:coin');
    expect(action?.disabled).toBe(true);

    snapshot.coin.current = 3;
    snapshot.brewing.cauldrons[1].canBuyCauldron = true;
    manager.render(snapshot);

    expect(locked.classList.contains('is-buyable')).toBe(true);
    expect(locked.getAttribute('aria-disabled')).toBe('false');
    expect(locked.getAttribute('aria-label')).toBe('buy cauldron 2');
    expect(lockedLabel?.textContent).toBe('locked');
    expect(actions?.hidden).toBe(false);
    expect(count?.hidden).toBe(true);
    expect(action?.disabled).toBe(false);

    manager.unmount();
    parent.remove();
  });

  it('adds dragged herbs to the cauldron dropped under the pointer', () => {
    const addCalls = [];
    const snapshot = {
      brewing: {
        herbs: [
          {
            itemTypeId: 1001,
            key: 'sageHerb',
            label: 'sage',
            kind: 'herb',
            quantity: 3,
            availableQuantity: 3,
          },
        ],
        cauldrons: [
          {
            cauldronIndex: 0,
            cauldronNumber: 1,
            ingredients: [],
            maxIngredients: 5,
            manaCost: 12,
            activeBrew: null,
            selectedRecipe: null,
            match: null,
            canAddIngredient: true,
            canBrew: false,
          },
        ],
        recipes: [],
        maxIngredients: 5,
        manaCost: 12,
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingCauldronManager({
      gameplayFacade: {
        ...createGameplayFacadeFake(snapshot),
        addBrewingIngredient: (itemTypeId, cauldronIndex) => {
          addCalls.push([itemTypeId, cauldronIndex]);
          return { ok: true };
        },
      },
    });

    manager.mount(parent);

    const herbButton = parent.querySelector('.brewing-page__herb-button');
    const cauldron = parent.querySelector('.brewing-page__cauldron');
    const originalElementFromPoint = document.elementFromPoint;
    document.elementFromPoint = vi.fn(() => cauldron);

    herbButton.dispatchEvent(
      new window.MouseEvent('pointerdown', {
        bubbles: true,
        button: 0,
        clientX: 10,
        clientY: 10,
      }),
    );
    herbButton.dispatchEvent(
      new window.MouseEvent('pointermove', {
        bubbles: true,
        clientX: 40,
        clientY: 40,
      }),
    );

    const ghost = document.querySelector('.brewing-page__item-drag-ghost');
    const ghostIcon = ghost?.querySelector('.brewing-page__item-drag-ghost-icon');

    expect(ghost?.classList.contains('brewing-page__herb-drag-ghost')).toBe(true);
    expect(ghost?.dataset.itemKind).toBe('herb');
    expect(ghost?.dataset.itemKey).toBe('sageHerb');
    expect(ghost?.style.left).toBe('40px');
    expect(ghost?.style.top).toBe('40px');
    expect(ghost?.style.getPropertyValue('--brewing-page-item-drag-sway-x')).toBe(
      '-12px',
    );
    expect(ghost?.style.getPropertyValue('--brewing-page-item-drag-sway-y')).toBe(
      '-6px',
    );
    expect(
      ghost?.style.getPropertyValue('--brewing-page-item-drag-sway-rotation'),
    ).toBe('-12.1deg');
    expect(ghostIcon?.dataset.assetAtlasFrame).toBe('herb:sageHerb');

    herbButton.dispatchEvent(
      new window.MouseEvent('pointermove', {
        bubbles: true,
        clientX: 20,
        clientY: 40,
      }),
    );

    expect(ghost?.style.left).toBe('20px');
    expect(ghost?.style.getPropertyValue('--brewing-page-item-drag-sway-x')).toBe(
      '9px',
    );
    expect(
      ghost?.style.getPropertyValue('--brewing-page-item-drag-sway-rotation'),
    ).toBe('10.92deg');

    herbButton.dispatchEvent(
      new window.MouseEvent('pointerup', {
        bubbles: true,
        clientX: 20,
        clientY: 40,
      }),
    );

    expect(addCalls).toEqual([[1001, 0]]);
    expect(cauldron.classList.contains('is-receiving-ingredient')).toBe(true);
    expect(herbButton.closest('.brewing-page__herb-row')?.classList.contains('is-picked')).toBe(
      false,
    );
    expect(document.querySelector('.brewing-page__herb-drag-ghost')).toBeNull();

    document.elementFromPoint = originalElementFromPoint;
    manager.unmount();
    parent.remove();
  });

  it('previews the picked herb quantity and restores it when the drag is canceled', () => {
    const snapshot = {
      brewing: {
        herbs: [
          {
            itemTypeId: 1001,
            key: 'sageHerb',
            label: 'sage',
            kind: 'herb',
            quantity: 44,
            availableQuantity: 44,
          },
        ],
        cauldrons: [
          {
            cauldronIndex: 0,
            cauldronNumber: 1,
            ingredients: [],
            maxIngredients: 5,
            manaCost: 12,
            activeBrew: null,
            selectedRecipe: null,
            match: null,
            canAddIngredient: true,
            canBrew: false,
          },
        ],
        recipes: [],
        maxIngredients: 5,
        manaCost: 12,
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
    });

    manager.mount(parent);

    const herbButton = parent.querySelector('.brewing-page__herb-button');
    const herbRow = parent.querySelector('.brewing-page__herb-row');
    const quantity = parent.querySelector('.brewing-page__herb-quantity');

    dispatchPointer(herbButton, 'pointerdown', {
      pointerId: 1,
      clientX: 10,
      clientY: 10,
    });

    expect(herbRow?.classList.contains('is-picked')).toBe(true);
    expect(quantity?.classList.contains('is-previewing-pick')).toBe(true);
    expect(quantity?.textContent).toBe('43');

    dispatchPointer(herbButton, 'pointerup', {
      pointerId: 1,
      clientX: 10,
      clientY: 10,
    });

    expect(herbRow?.classList.contains('is-picked')).toBe(false);
    expect(quantity?.classList.contains('is-previewing-pick')).toBe(false);
    expect(quantity?.textContent).toBe('44');

    manager.unmount();
    parent.remove();
  });

  it('snaps a canceled dragged herb back to the herbs box', () => {
    const snapshot = {
      brewing: {
        herbs: [
          {
            itemTypeId: 1001,
            key: 'sageHerb',
            label: 'sage',
            kind: 'herb',
            quantity: 3,
            availableQuantity: 3,
          },
        ],
        cauldrons: [
          {
            cauldronIndex: 0,
            cauldronNumber: 1,
            ingredients: [],
            maxIngredients: 5,
            manaCost: 12,
            activeBrew: null,
            selectedRecipe: null,
            match: null,
            canAddIngredient: true,
            canBrew: false,
          },
        ],
        recipes: [],
        maxIngredients: 5,
        manaCost: 12,
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
    });
    const originalElementFromPoint = document.elementFromPoint;
    document.elementFromPoint = vi.fn(() => parent.querySelector('.brewing-page__herbs'));

    manager.mount(parent);
    manager.setHerbsVisible(true);

    const herbButton = parent.querySelector('.brewing-page__herb-button');
    const herbRow = parent.querySelector('.brewing-page__herb-row');

    dispatchPointer(herbButton, 'pointerdown', {
      pointerId: 1,
      clientX: 10,
      clientY: 10,
    });
    dispatchPointer(herbButton, 'pointermove', {
      pointerId: 1,
      clientX: 40,
      clientY: 40,
    });
    dispatchPointer(herbButton, 'pointerup', {
      pointerId: 1,
      clientX: 40,
      clientY: 40,
    });

    expect(herbRow?.classList.contains('is-returning')).toBe(true);
    expect(herbRow?.classList.contains('is-picked')).toBe(false);
    expect(document.querySelector('.brewing-page__herb-drag-ghost')).toBeNull();

    document.elementFromPoint = originalElementFromPoint;
    manager.unmount();
    parent.remove();
  });

  it('uses lifted item icons for seed, herb, and potion drag ghosts', () => {
    const dragRule = baseCss.match(
      /\.brewing-page__item-drag-ghost,\s*\.brewing-page__herb-drag-ghost\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const iconRule = baseCss.match(
      /\.brewing-page__item-drag-ghost-icon\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const manager = new BrewingCauldronManager();

    expect(dragRule).toContain('width: 72px;');
    expect(dragRule).toContain('height: 72px;');
    expect(dragRule).toContain('padding: 0;');
    expect(dragRule).not.toContain('background:');
    expect(dragRule).not.toContain('border:');
    expect(dragRule).toContain('transform: translate(-50%, calc(-100% - 24px));');
    expect(iconRule).toContain('width: 72px;');
    expect(iconRule).toContain('height: 72px;');
    expect(iconRule).toContain('var(--brewing-page-item-drag-sway-x, 0px)');
    expect(iconRule).toContain('transform-origin: 50% 76%;');
    expect(iconRule).toContain('transition: transform 110ms var(--style-motion-ease-soft);');
    expect(baseCss).toContain('@keyframes brewing-page-herb-picked-nudge');
    expect(baseCss).toContain('@keyframes brewing-page-cauldron-receive-herb');
    expect(baseCss).toContain('scale(0.99, 1.01)');
    expect(baseCss).toContain('.brewing-page__item-drag-ghost.is-settling');
    expect(manager.getItemDragFrameName({ itemKind: 'seed', itemKey: 'sageSeed' })).toBe(
      'seed:regular',
    );
    const seedIcon = manager.createItemDragIcon({
      itemKind: 'seed',
      itemKey: 'sageSeed',
      itemLabel: 'sage seed',
    });
    expect(seedIcon?.classList.contains('style-seed-pack-composite')).toBe(true);
    expect(seedIcon?.dataset.assetAtlasFrame).toBe('seed:regular');
    expect(seedIcon?.dataset.seedPackItemFrame).toBe('herb:sageHerb');
    expect(manager.getItemDragFrameName({ itemKind: 'herb', itemKey: 'sageHerb' })).toBe(
      'herb:sageHerb',
    );
    expect(manager.getItemDragFrameName({ itemKind: 'potion', itemKey: 'manaTonic' })).toBe(
      'potion:manaTonic',
    );
  });

  it('flies selected recipe herbs into the cauldron when brew starts', async () => {
    const snapshot = {
      brewing: {
        herbs: [
          {
            itemTypeId: 1001,
            key: 'sageHerb',
            label: 'sage',
            kind: 'herb',
            quantity: 3,
            availableQuantity: 0,
          },
        ],
        ingredients: [
          { slotIndex: 0, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
          { slotIndex: 1, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
          { slotIndex: 2, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
        ],
        recipes: [
          {
            key: 'manaTonic',
            label: 'mana tonic',
            unlocked: true,
            ingredients: [
              {
                itemTypeId: 1001,
                key: 'sageHerb',
                label: 'sage',
                quantity: 3,
              },
            ],
          },
        ],
        maxIngredients: 5,
        manaCost: 12,
        activeBrew: null,
        match: {
          key: 'manaTonic',
          label: 'mana tonic',
          unlocked: true,
        },
        canAddIngredient: true,
        canBrew: true,
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const brewCauldron = vi.fn(() => ({ ok: true }));
    const manager = new BrewingCauldronManager({
      gameplayFacade: {
        ...createGameplayFacadeFake(snapshot),
        brewCauldron,
      },
      getSelectedRecipeKey: () => 'manaTonic',
    });
    const originalAnimate = window.Element.prototype.animate;
    const animateCalls = [];
    let finishDrop;

    Object.defineProperty(window.Element.prototype, 'animate', {
      configurable: true,
      value(keyframes, options) {
        animateCalls.push({ element: this, keyframes, options });
        return {
          finished: new Promise((resolve) => {
            finishDrop = resolve;
          }),
        };
      },
    });

    try {
      manager.mount(parent);

      const guideRow = parent.querySelector('.brewing-page__cauldron-guide-step');
      const cauldronArt = parent.querySelector('.brewing-page__cauldron-art');
      const action = parent.querySelector('.brewing-page__action-button[data-action="brew"]');
      const cauldron = parent.querySelector('.brewing-page__cauldron');

      setElementRect(guideRow, { left: 20, top: 30, width: 120, height: 20 });
      setElementRect(cauldronArt, { left: 200, top: 90, width: 96, height: 78 });

      action.click();

      const ghost = document.querySelector('.brewing-page__brew-ingredient-ghost');

      expect(brewCauldron).toHaveBeenCalledWith(0);
      expect(ghost?.dataset.itemKind).toBe('herb');
      expect(ghost?.dataset.itemKey).toBe('sageHerb');
      expect(ghost?.style.left).toBe('20px');
      expect(ghost?.style.top).toBe('30px');
      expect(animateCalls).toHaveLength(1);
      expect(animateCalls[0].options.duration).toBe(240);
      expect(animateCalls[0].options.easing).toBe('cubic-bezier(0.25, 1, 0.5, 1)');

      finishDrop();
      await Promise.resolve();

      expect(cauldron?.classList.contains('is-receiving-ingredient')).toBe(true);
      expect(document.querySelector('.brewing-page__brew-ingredient-ghost')).toBeNull();
    } finally {
      if (originalAnimate) {
        Object.defineProperty(window.Element.prototype, 'animate', {
          configurable: true,
          value: originalAnimate,
        });
      } else {
        delete window.Element.prototype.animate;
      }
      manager.unmount();
      parent.remove();
    }
  });

  it('settles herb drag rotation with a small counter swing', () => {
    vi.useFakeTimers();

    try {
      const manager = new BrewingCauldronManager();
      const ghost = document.createElement('div');
      manager.herbDrag = {
        ghost,
        swayResetTimeout: null,
        swayRestTimeout: null,
      };

      manager.scheduleItemDragSwaySettle(manager.herbDrag, 10);
      vi.advanceTimersByTime(110);

      expect(
        ghost.style.getPropertyValue('--brewing-page-item-drag-sway-rotation'),
      ).toBe('-2.8deg');

      vi.advanceTimersByTime(90);

      expect(
        ghost.style.getPropertyValue('--brewing-page-item-drag-sway-rotation'),
      ).toBe('0deg');

      manager.clearItemDragSwayTimers(manager.herbDrag);
      manager.herbDrag = null;
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps herb click add as a fallback when not dragging', () => {
    const addCalls = [];
    const snapshot = {
      brewing: {
        herbs: [
          {
            itemTypeId: 1001,
            key: 'sageHerb',
            label: 'sage',
            kind: 'herb',
            quantity: 3,
            availableQuantity: 3,
          },
        ],
        ingredients: [],
        recipes: [],
        maxIngredients: 5,
        manaCost: 12,
        activeBrew: null,
        selectedRecipe: null,
        match: null,
        canAddIngredient: true,
        canBrew: false,
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingCauldronManager({
      gameplayFacade: {
        ...createGameplayFacadeFake(snapshot),
        addBrewingIngredient: (itemTypeId, cauldronIndex) => {
          addCalls.push([itemTypeId, cauldronIndex]);
          return { ok: true };
        },
      },
    });

    manager.mount(parent);

    const herbButton = parent.querySelector('.brewing-page__herb-button');

    expect(herbButton.draggable).toBe(false);

    herbButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(addCalls).toEqual([[1001, 0]]);

    manager.unmount();
    parent.remove();
  });

  it('clears the selected recipe before manually adding an outside herb', () => {
    const addBrewingIngredient = vi.fn(() => ({ ok: true }));
    const onClearSelectedRecipe = vi.fn();
    const snapshot = {
      brewing: {
        herbs: [
          {
            itemTypeId: 1001,
            key: 'sageHerb',
            label: 'sage',
            kind: 'herb',
            quantity: 3,
            availableQuantity: 3,
          },
          {
            itemTypeId: 1003,
            key: 'nettleHerb',
            label: 'nettle',
            kind: 'herb',
            quantity: 2,
            availableQuantity: 2,
          },
        ],
        ingredients: [],
        recipes: [
          {
            key: 'manaTonic',
            label: 'mana tonic',
            unlocked: true,
            ingredients: [
              {
                itemTypeId: 1001,
                key: 'sageHerb',
                label: 'sage',
                quantity: 3,
              },
            ],
          },
        ],
        maxIngredients: 5,
        manaCost: 12,
        activeBrew: null,
        match: null,
        canAddIngredient: true,
        canBrew: false,
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingCauldronManager({
      gameplayFacade: {
        ...createGameplayFacadeFake(snapshot),
        addBrewingIngredient,
      },
      getSelectedRecipeKey: () => 'manaTonic',
      onClearSelectedRecipe,
    });

    manager.mount(parent);

    const nettleButton = [...parent.querySelectorAll('.brewing-page__herb-button')].find(
      (button) => button.textContent.includes('nettle'),
    );

    expect(nettleButton?.disabled).toBe(false);

    nettleButton?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(onClearSelectedRecipe).toHaveBeenCalledWith(0);
    expect(addBrewingIngredient).toHaveBeenCalledWith(1003, 0);
    expect(parent.querySelector('.brewing-page__message')?.textContent).toBe('');

    manager.unmount();
    parent.remove();
  });

  it('clears the selected recipe before manually adding an extra fulfilled herb', () => {
    const addBrewingIngredient = vi.fn(() => ({ ok: true }));
    const onClearSelectedRecipe = vi.fn();
    const snapshot = {
      brewing: {
        herbs: [
          {
            itemTypeId: 1001,
            key: 'sageHerb',
            label: 'sage',
            kind: 'herb',
            quantity: 4,
            availableQuantity: 1,
          },
        ],
        ingredients: [
          { slotIndex: 0, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
          { slotIndex: 1, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
          { slotIndex: 2, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
        ],
        recipes: [
          {
            key: 'manaTonic',
            label: 'mana tonic',
            unlocked: true,
            ingredients: [
              {
                itemTypeId: 1001,
                key: 'sageHerb',
                label: 'sage',
                quantity: 3,
              },
            ],
          },
        ],
        maxIngredients: 5,
        manaCost: 12,
        activeBrew: null,
        match: null,
        canAddIngredient: true,
        canBrew: false,
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingCauldronManager({
      gameplayFacade: {
        ...createGameplayFacadeFake(snapshot),
        addBrewingIngredient,
      },
      getSelectedRecipeKey: () => 'manaTonic',
      onClearSelectedRecipe,
    });

    manager.mount(parent);

    const sageButton = parent.querySelector('.brewing-page__herb-button');

    expect(sageButton?.disabled).toBe(false);

    sageButton?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(onClearSelectedRecipe).toHaveBeenCalledWith(0);
    expect(addBrewingIngredient).toHaveBeenCalledWith(1001, 0);
    expect(parent.querySelector('.brewing-page__message')?.textContent).toBe('');

    manager.unmount();
    parent.remove();
  });

  it('shows three two-herb rows while collapsed and expands all herbs over the world', () => {
    const snapshot = {
      brewing: {
        herbs: Array.from({ length: 7 }, (_, index) => createHerb(index + 1)),
        ingredients: [],
        recipes: [],
        maxIngredients: 5,
        manaCost: 12,
        activeBrew: null,
        selectedRecipe: null,
        match: null,
        canAddIngredient: true,
        canBrew: false,
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
    });

    manager.mount(parent);

    const visibleRows = () =>
      [...parent.querySelectorAll('.brewing-page__herb-row')].filter(
        (row) => !row.hidden,
      );
    const toggle = parent.querySelector('.brewing-page__herbs-toggle');
    const herbs = parent.querySelector('.brewing-page__herbs');

    expect(parent.querySelector('.brewing-page__herbs-count')).toBeNull();
    expect(herbs?.hidden).toBe(true);
    manager.setHerbsVisible(true);

    expect(herbs?.hidden).toBe(false);
    expect(visibleRows()).toHaveLength(6);
    expect(toggle?.textContent).toBe('expand');
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(herbs?.classList.contains('is-collapsed')).toBe(true);

    toggle?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(visibleRows()).toHaveLength(7);
    expect(toggle?.textContent).toBe('collapse');
    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    expect(toggle?.getAttribute('aria-label')).toBe('collapse herbs');
    expect(herbs?.classList.contains('is-expanded')).toBe(true);

    manager.unmount();
    parent.remove();
  });

  it('anchors herb notification dots to the herb name instead of the quantity edge', () => {
    const herbLabelRule = baseCss.match(
      /\.brewing-page__herb-label\[data-notification="true"\]\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const herbDotRule = baseCss.match(
      /\.brewing-page__herb-label\[data-notification="true"\]::before\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(baseCss).not.toContain(
      '.brewing-page__herb-rows:has([data-notification="true"])',
    );
    expect(herbLabelRule).toContain('position: relative;');
    expect(herbDotRule).toContain('right: calc(-1 * var(--style-notification-size));');
    expect(herbDotRule).not.toContain('--brewing-page-notification-row-min-height');
  });

  it('puts active herb notification state on the herb label', () => {
    const snapshot = {
      brewing: {
        herbs: [
          {
            itemTypeId: 1001,
            key: 'sageHerb',
            label: 'sage',
            kind: 'herb',
            quantity: 3,
            availableQuantity: 3,
          },
        ],
        ingredients: [],
        recipes: [],
        maxIngredients: 5,
        manaCost: 12,
        activeBrew: null,
        selectedRecipe: null,
        match: null,
        canAddIngredient: true,
        canBrew: false,
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
    });

    manager.mount(parent);

    const button = parent.querySelector('.brewing-page__herb-button');
    const label = parent.querySelector('.brewing-page__herb-label');

    expect(button?.dataset.notification).toBeUndefined();
    expect(label?.dataset.notification).toBe('true');

    manager.unmount();
    parent.remove();
  });

  it('keeps cauldron ingredient quantity prefixes before herb icons', () => {
    const snapshot = {
      brewing: {
        herbs: [
          {
            itemTypeId: 1001,
            key: 'sageHerb',
            label: 'sage',
            kind: 'herb',
            quantity: 3,
            availableQuantity: 0,
          },
        ],
        ingredients: [
          { slotIndex: 0, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
          { slotIndex: 1, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
          { slotIndex: 2, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
        ],
        recipes: [],
        maxIngredients: 5,
        manaCost: 12,
        activeBrew: null,
        selectedRecipe: null,
        match: null,
        canAddIngredient: true,
        canBrew: false,
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
    });

    manager.mount(parent);

    const row = parent.querySelector('.brewing-page__ingredient-row');
    const count = row?.querySelector('.brewing-page__ingredient-count');
    const label = row?.querySelector('.brewing-page__ingredient-label');
    const icon = label?.childNodes[0];

    expect(row?.textContent).toBe('3 sage');
    expect(count?.textContent).toBe('3 ');
    expect(count?.dataset.resourceColor).toBe('herb');
    expect(label?.textContent).toBe('sage');
    expect(label?.dataset.resourceColor).toBe('herb');
    expect(label?.classList.contains('style-herb-label')).toBe(true);
    expect(label?.querySelector('.style-herb-label__icon')?.dataset.assetAtlasFrame).toBe(
      'herb:sageHerb',
    );

    manager.render(snapshot);

    expect(label?.childNodes[0]).toBe(icon);

    manager.unmount();
    parent.remove();
  });

  it('counts only current-cauldron herbs plus available herbs when showing missing recipe ingredients', () => {
    const manager = new BrewingCauldronManager();
    const recipe = {
      key: 'manaTonic',
      label: 'mana tonic',
      ingredients: [
        {
          itemTypeId: 1001,
          key: 'sageHerb',
          label: 'sage',
          quantity: 3,
        },
      ],
    };
    const brewing = {
      ingredients: [
        {
          slotIndex: 0,
          itemTypeId: 1001,
          key: 'sageHerb',
          label: 'sage',
          kind: 'herb',
        },
      ],
      herbs: [
        {
          itemTypeId: 1001,
          key: 'sageHerb',
          label: 'sage',
          kind: 'herb',
          quantity: 3,
          availableQuantity: 1,
        },
      ],
    };

    expect(manager.getMissingIngredientQuantities(recipe, brewing)).toEqual(
      new Map([[1001, 1]]),
    );
  });

  it('multiplies missing recipe ingredients by selected brew quantity', () => {
    const manager = new BrewingCauldronManager();
    const recipe = {
      key: 'twoHerbPotion',
      label: 'two herb potion',
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
    };
    const brewing = {
      brewQuantity: 3,
      ingredients: [
        {
          slotIndex: 0,
          itemTypeId: 1001,
          key: 'sageHerb',
          label: 'sage',
          kind: 'herb',
        },
      ],
      herbs: [
        {
          itemTypeId: 1001,
          key: 'sageHerb',
          label: 'sage',
          kind: 'herb',
          quantity: 6,
          availableQuantity: 5,
        },
        {
          itemTypeId: 1003,
          key: 'nettleHerb',
          label: 'nettle',
          kind: 'herb',
          quantity: 1,
          availableQuantity: 1,
        },
      ],
    };

    expect(manager.getMissingIngredientQuantities(recipe, brewing)).toEqual(
      new Map([
        [1001, 3],
        [1003, 2],
      ]),
    );
  });

  it('marks staged sage remove rows as tutorial targets', () => {
    const snapshot = {
      brewing: {
        herbs: [
          {
            itemTypeId: 1001,
            key: 'sageHerb',
            label: 'sage',
            kind: 'herb',
            quantity: 4,
            availableQuantity: 0,
          },
        ],
        ingredients: [
          { slotIndex: 0, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
          { slotIndex: 1, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
          { slotIndex: 2, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
          { slotIndex: 3, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
        ],
        recipes: [],
        maxIngredients: 5,
        manaCost: 5,
        activeBrew: null,
        selectedRecipe: null,
        match: null,
        canAddIngredient: true,
        canBrew: true,
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
    });

    manager.mount(parent);

    const removeTarget = parent.querySelector('[data-tutorial-id="brewing:remove:sageHerb"]');

    expect(removeTarget?.classList.contains('brewing-page__ingredient-row')).toBe(true);
    expect(removeTarget?.textContent).toBe('4 sage');

    manager.unmount();
    parent.remove();
  });

  it('marks overfilled selected-recipe sage rows as tutorial targets', () => {
    const snapshot = {
      brewing: {
        herbs: [
          {
            itemTypeId: 1001,
            key: 'sageHerb',
            label: 'sage',
            kind: 'herb',
            quantity: 4,
            availableQuantity: 0,
          },
        ],
        ingredients: [
          { slotIndex: 0, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
          { slotIndex: 1, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
          { slotIndex: 2, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
          { slotIndex: 3, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
        ],
        recipes: [
          {
            key: 'manaTonic',
            label: 'mana tonic',
            unlocked: true,
            ingredients: [
              {
                itemTypeId: 1001,
                key: 'sageHerb',
                label: 'sage',
                quantity: 3,
              },
            ],
          },
        ],
        maxIngredients: 5,
        manaCost: 5,
        activeBrew: null,
        match: null,
        canAddIngredient: true,
        canBrew: true,
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
      getSelectedRecipeKey: () => 'manaTonic',
    });

    manager.mount(parent);

    const removeTargets = [
      ...parent.querySelectorAll('[data-tutorial-id="brewing:remove:sageHerb"]'),
    ];

    expect(removeTargets).toHaveLength(1);
    expect(removeTargets[0].classList.contains('brewing-page__cauldron-guide-step')).toBe(
      true,
    );
    expect(removeTargets[0].textContent).toBe('sage4/3');
    expect(removeTargets[0].classList.contains('is-fulfilled')).toBe(true);

    manager.unmount();
    parent.remove();
  });

  it('labels the recipe opener as recipes before and after a recipe is selected', () => {
    const snapshot = {
      brewing: {
        herbs: [],
        ingredients: [],
        recipes: [
          {
            key: 'manaTonic',
            label: 'mana tonic',
            unlocked: true,
            ingredients: [
              {
                itemTypeId: 1001,
                key: 'sageHerb',
                label: 'sage',
                quantity: 3,
              },
            ],
          },
        ],
        maxIngredients: 5,
        manaCost: 12,
        activeBrew: null,
        match: null,
        canAddIngredient: true,
        canBrew: false,
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    let selectedRecipeKey = null;
    const manager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
      getSelectedRecipeKey: () => selectedRecipeKey,
    });

    manager.mount(parent);

    const button = parent.querySelector('.brewing-page__cauldron-select-recipe-text');

    expect(button?.textContent).toBe('recipes');
    expect(button?.getAttribute('aria-label')).toBe('open recipes for cauldron 1');

    selectedRecipeKey = 'manaTonic';
    manager.render(snapshot);

    expect(button?.textContent).toBe('recipes');
    expect(button?.getAttribute('aria-label')).toBe('open recipes for cauldron 1');

    selectedRecipeKey = null;
    manager.render(snapshot);

    expect(button?.textContent).toBe('recipes');
    expect(button?.getAttribute('aria-label')).toBe('open recipes for cauldron 1');

    manager.unmount();
    parent.remove();
  });

  it('shows cauldron stars in the cauldron title after emerald upgrades', () => {
    const snapshot = {
      brewing: {
        herbs: [],
        ingredients: [],
        recipes: [],
        maxIngredients: 5,
        manaCost: 12,
        level: 1,
        activeBrew: null,
        selectedRecipe: null,
        match: null,
        canAddIngredient: true,
        canBrew: false,
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
    });

    manager.mount(parent);

    const title = parent.querySelector(
      '.brewing-page__cauldron-recipe-box > .style-box__title',
    );
    expect(title?.textContent).toBe('cauldron 1 ☆☆☆');
    expect(title?.getAttribute('aria-label')).toBe('cauldron 1 0 stars');
    expect(
      title?.querySelectorAll('.style-star-level__slot[data-star-filled="true"]'),
    ).toHaveLength(0);
    expect(title?.querySelectorAll('.style-star-level__image--empty')).toHaveLength(3);

    snapshot.brewing.level = 3;
    manager.render(snapshot);

    const star = title?.querySelector('.style-star-level');

    expect(title?.textContent).toBe('cauldron 1 ★★');
    expect(title?.getAttribute('aria-label')).toBe('cauldron 1 yellow star 2');
    expect(star?.dataset.starTone).toBe('yellow');

    manager.unmount();
    parent.remove();
  });

  it('shows the selected recipe potion preview in an empty cauldron', () => {
    const snapshot = {
      brewing: {
        herbs: [],
        ingredients: [],
        recipes: [
          {
            key: 'manaTonic',
            label: 'mana tonic',
            unlocked: true,
            ingredients: [
              {
                itemTypeId: 1001,
                key: 'sageHerb',
                label: 'sage',
                quantity: 3,
              },
            ],
          },
        ],
        maxIngredients: 5,
        manaCost: 12,
        activeBrew: null,
        match: null,
        canAddIngredient: true,
        canBrew: false,
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
      getSelectedRecipeKey: () => 'manaTonic',
    });

    manager.mount(parent);

    const cauldron = parent.querySelector('.brewing-page__cauldron');
    const boxes = cauldron?.querySelector('.brewing-page__cauldron-boxes');
    const content = cauldron?.querySelector('.brewing-page__cauldron-content');
    const potionBox = parent.querySelector('.brewing-page__cauldron-potion-box');
    const cauldronArt = parent.querySelector('.brewing-page__cauldron-art');
    const cauldronImage = parent.querySelector('.brewing-page__cauldron-art-image');
    const cauldronLiquid = parent.querySelector('.brewing-page__cauldron-art-liquid');
    const summary = parent.querySelector('.brewing-page__cauldron-preview-summary');
    const label = parent.querySelector('.brewing-page__cauldron-preview-label');
    const icon = parent.querySelector('.brewing-page__cauldron-preview-icon');
    const status = parent.querySelector('.brewing-page__cauldron-status');

    expect(boxes?.firstElementChild?.classList.contains('brewing-page__cauldron-recipe-box')).toBe(
      true,
    );
    expect(boxes?.firstElementChild?.classList.contains('style-box')).toBe(true);
    expect(content?.firstElementChild).toBe(potionBox);
    expect(potionBox?.closest('.brewing-page__cauldron-recipe-box')).toBe(
      boxes?.firstElementChild,
    );
    expect(cauldronArt).not.toBeNull();
    expect(cauldronImage?.getAttribute('src')).toContain('cauldron-empty');
    expect(cauldron?.classList.contains('has-cauldron-liquid')).toBe(false);
    expect(cauldronLiquid?.hidden).toBe(true);
    expect(summary?.hidden).toBe(false);
    expect(label?.hidden).toBe(false);
    expect(label?.textContent).toBe('mana tonic');
    expect(label?.dataset.resourceColor).toBeUndefined();
    expect(label?.classList.contains('style-potion-label')).toBe(false);
    expect(label?.querySelector('.style-potion-label__icon')).toBeNull();
    expect(icon?.hidden).toBe(false);
    expect(icon?.dataset.assetAtlasFrame).toBe('potion:manaTonic');
    expect(status?.hidden).toBe(true);
    expect(status?.textContent).toBe('');

    manager.unmount();
    parent.remove();
  });

  it('uses unknown and wasted potion liquid colors for keyless active brew previews', () => {
    const cases = [
      { label: 'unknown potion', liquidKey: 'unknownPotion', color: '#5d4aa2' },
      { label: 'wasted potion', liquidKey: 'wastedPotion', color: '#7a6443' },
      { label: 'potion', liquidKey: 'generic', color: '#0a95f5' },
    ];

    for (const testCase of cases) {
      const snapshot = {
        brewing: {
          herbs: [],
          ingredients: [],
          recipes: [],
          maxIngredients: 5,
          manaCost: 12,
          activeBrew: {
            key: null,
            label: testCase.label,
            phase: 'brewing',
            canCollect: false,
            remainingMs: 4_000,
            totalMs: 4_000,
            progress: 0,
          },
          match: null,
          canAddIngredient: false,
          canBrew: false,
        },
      };
      const parent = document.createElement('div');
      document.body.append(parent);
      const manager = new BrewingCauldronManager({
        gameplayFacade: createGameplayFacadeFake(snapshot),
      });

      manager.mount(parent);

      const cauldron = parent.querySelector('.brewing-page__cauldron');
      const cauldronLiquid = parent.querySelector('.brewing-page__cauldron-art-liquid');

      expect(cauldron?.classList.contains('has-cauldron-liquid')).toBe(true);
      expect(cauldronLiquid?.hidden).toBe(false);
      expect(cauldronLiquid?.dataset.potionLiquidKey).toBe(testCase.liquidKey);
      expect(cauldronLiquid?.style.getPropertyValue('--brewing-page-cauldron-liquid-color')).toBe(
        testCase.color,
      );

      manager.unmount();
      parent.remove();
    }
  });

  it('keeps the selected recipe name out of the cauldron top line', () => {
    const snapshot = {
      brewing: {
        herbs: [],
        ingredients: [],
        recipes: [
          {
            key: 'manaTonic',
            label: 'mana tonic',
            unlocked: true,
            ingredients: [
              {
                itemTypeId: 1001,
                key: 'sageHerb',
                label: 'sage',
                quantity: 3,
              },
            ],
          },
        ],
        maxIngredients: 5,
        manaCost: 12,
        activeBrew: null,
        match: null,
        canAddIngredient: true,
        canBrew: false,
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
      getSelectedRecipeKey: () => 'manaTonic',
    });

    manager.mount(parent);

    const guide = parent.querySelector('.brewing-page__cauldron-guide');
    const items = parent.querySelector('.brewing-page__cauldron-items');
    const status = parent.querySelector('.brewing-page__cauldron-status');

    expect(parent.querySelector('.brewing-page__cauldron-recipe-title')).toBeNull();
    expect(
      parent.querySelector(
        '.brewing-page__cauldron-recipe-box > .style-box__title',
      )?.textContent,
    ).toBe('cauldron 1 ☆☆☆');
    expect(guide?.querySelector('.brewing-page__cauldron-recipe-row')).toBeNull();
    expect(guide?.hidden).toBe(false);
    expect(guide?.textContent).not.toContain('recipe');
    expect(guide?.textContent).toBe('sage0/3');
    expect(status?.hidden).toBe(true);
    expect(status?.textContent).toBe('');
    expect(items?.hidden).toBe(true);

    manager.unmount();
    parent.remove();
  });

  it('shows selected recipe requirements as stable stash and required rows in the cauldron guide', () => {
    const snapshot = {
      brewing: {
        herbs: [
          {
            itemTypeId: 1001,
            key: 'sageHerb',
            label: 'sage',
            kind: 'herb',
            quantity: 9,
            availableQuantity: 9,
          },
          {
            itemTypeId: 1003,
            key: 'nettleHerb',
            label: 'nettle',
            kind: 'herb',
            quantity: 3,
            availableQuantity: 3,
          },
        ],
        ingredients: [],
        recipes: [
          {
            key: 'sageNettle',
            label: 'sage nettle',
            unlocked: true,
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
        maxIngredients: 5,
        manaCost: 36,
        brewQuantity: 3,
        maxBrewQuantity: 3,
        activeBrew: null,
        match: null,
        canAddIngredient: true,
        canBrew: false,
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
      getSelectedRecipeKey: () => 'sageNettle',
    });

    manager.mount(parent);

    const guide = parent.querySelector('.brewing-page__cauldron-guide');
    const items = parent.querySelector('.brewing-page__cauldron-items');
    const rows = [...parent.querySelectorAll('.brewing-page__cauldron-guide-step')];

    expect(guide?.hidden).toBe(false);
    expect(items?.hidden).toBe(true);
    expect(rows.map((row) => row.textContent)).toEqual([
      'sage9/9',
      'nettle3/3',
    ]);
    expect(rows.map((row) => row.classList.contains('is-fulfilled'))).toEqual([
      true,
      true,
    ]);

    manager.unmount();
    parent.remove();
  });

  it('shows selected recipe requirements as stash and required amounts', () => {
    const snapshot = {
      brewing: {
        herbs: [
          {
            itemTypeId: 1001,
            key: 'sageHerb',
            label: 'sage',
            kind: 'herb',
            quantity: 4,
            availableQuantity: 1,
          },
          {
            itemTypeId: 1003,
            key: 'nettleHerb',
            label: 'nettle',
            kind: 'herb',
            quantity: 2,
            availableQuantity: 1,
          },
        ],
        ingredients: [
          { slotIndex: 0, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
          { slotIndex: 1, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
          { slotIndex: 2, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
          { slotIndex: 3, itemTypeId: 1003, key: 'nettleHerb', label: 'nettle', kind: 'herb' },
        ],
        recipes: [
          {
            key: 'sageNettle',
            label: 'sage nettle',
            unlocked: true,
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
                quantity: 2,
              },
            ],
          },
        ],
        maxIngredients: 5,
        manaCost: 12,
        activeBrew: null,
        match: null,
        canAddIngredient: true,
        canBrew: false,
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
      getSelectedRecipeKey: () => 'sageNettle',
    });

    manager.mount(parent);

    const rows = [...parent.querySelectorAll('.brewing-page__cauldron-guide-step')];

    expect(
      rows.map((row) => ({
        count: row.querySelector('.brewing-page__ingredient-count')?.textContent,
        label: row.querySelector('.brewing-page__ingredient-label')?.textContent,
        value: row.querySelector('.row_val')?.textContent,
        fulfilled: row.classList.contains('is-fulfilled'),
        removeTarget: row.dataset.tutorialId,
      })),
    ).toEqual([
      {
        count: '',
        label: 'sage',
        value: '4/3',
        fulfilled: true,
        removeTarget: 'brewing:remove:sageHerb',
      },
      {
        count: '',
        label: 'nettle',
        value: '2/2',
        fulfilled: true,
        removeTarget: 'brewing:remove:nettleHerb',
      },
    ]);

    manager.unmount();
    parent.remove();
  });

  it('shows selected brew quantity on one cycle button beside the brew action', () => {
    const snapshot = {
      brewing: {
        herbs: [],
        ingredients: [
          { slotIndex: 0, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
          { slotIndex: 1, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
          { slotIndex: 2, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
        ],
        recipes: [],
        maxIngredients: 5,
        manaCost: 36,
        brewQuantity: 3,
        maxBrewQuantity: 3,
        activeBrew: null,
        match: {
          key: 'manaTonic',
          label: 'mana tonic',
          unlocked: true,
        },
        canAddIngredient: true,
        canBrew: true,
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
    });

    manager.mount(parent);

    expect(parent.querySelector('.brewing-page__action-button-label')?.textContent.trim()).toBe(
      'brew',
    );
    expect(parent.querySelector('.brewing-page__action-button-cost')?.textContent).toBe(
      '36 mana',
    );
    const quantityButton = parent.querySelector('.brewing-page__quantity-button');
    const actionRow = parent.querySelector('.brewing-page__action-row');
    const recipeButton = parent.querySelector('.brewing-page__cauldron-select-recipe-text');
    const actionButton = parent.querySelector('.brewing-page__action-button');
    const quantityOptions = parent.querySelector('.brewing-page__quantity-options');
    const actions = parent.querySelector('.brewing-page__actions');
    const cauldronBox = parent.querySelector('.brewing-page__cauldron-recipe-box');
    const actionsRule = baseCss.match(
      /\.brewing-page__actions\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const actionRowRule = baseCss.match(
      /^\.brewing-page__action-row\s*\{(?<body>[^}]*)\}/m,
    )?.groups?.body;
    const actionButtonRule = baseCss.match(
      /\.style-button\.brewing-page__action-button,\s*\.style-button\.brewing-page__cauldron-select-recipe-text\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const quantityOptionsRule = baseCss.match(
      /\.brewing-page__quantity-options\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const quantityButtonRule = baseCss.match(
      /\.style-button\.brewing-page__quantity-button,\s*\.style-button\.brewing-page__auto-button\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const midnightActionButtonRule = baseCss.match(
      /:root\[data-style-theme="midnight"\]\s+\.brewing-page__actions\s+\.style-button\.brewing-page__action-button,[\s\S]*?\.style-button\.brewing-page__auto-button\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect([...parent.querySelectorAll('.brewing-page__quantity-button')]).toHaveLength(1);
    expect(
      existsSync(`${cwd()}/public/ui/player-card-button-brown-fill-9slice.png`),
    ).toBe(true);
    expect(
      existsSync(`${cwd()}/public/ui/player-card-button-brown-dark-fill-9slice.png`),
    ).toBe(true);
    expect(quantityButton?.classList.contains('style-button')).toBe(true);
    expect(quantityButton?.textContent).toBe('x3');
    expect(quantityButton?.dataset.brewQuantity).toBe('3');
    expect(quantityButton?.dataset.nextBrewQuantity).toBe('1');
    expect(quantityButton?.getAttribute('aria-label')).toBe('brewing x3; press for x1');
    expect(actionButton?.previousElementSibling).toBe(recipeButton);
    expect(quantityOptions?.previousElementSibling).toBe(actionButton);
    expect(quantityOptions?.parentElement).toBe(actionRow);
    expect(actions?.closest('.brewing-page__cauldron-recipe-box')).toBeNull();
    expect(cauldronBox?.parentElement?.nextElementSibling).toBe(actions);
    expect(actionsRule).toContain('position: relative;');
    expect(actionsRule).toContain('z-index: 2;');
    expect(actionsRule).toContain(
      'width: var(--brewing-page-cauldron-action-button-width);',
    );
    expect(actionsRule).toContain('margin-top: 0;');
    expect(actionsRule).toContain(
      'flex: 0 0 var(--brewing-page-cauldron-action-button-width);',
    );
    expect(actionRowRule).toContain('flex-direction: column;');
    expect(actionRowRule).toContain('align-items: stretch;');
    expect(actionRowRule).toContain(
      'gap: var(--brewing-page-cauldron-action-column-gap);',
    );
    expect(actionRowRule).toContain('height: auto;');
    expect(actionButtonRule).toContain(
      'width: var(--brewing-page-cauldron-action-button-width);',
    );
    expect(actionButtonRule).toContain(
      'height: var(--brewing-page-cauldron-action-button-height);',
    );
    expect(actionButtonRule).toContain(
      'color: var(--brewing-page-cauldron-action-button-text);',
    );
    expect(actionButtonRule).toContain('background: transparent;');
    expect(actionButtonRule).toContain('border-color: transparent;');
    expect(actionButtonRule).toContain(
      'border-image-source: var(--brewing-page-cauldron-action-button-frame);',
    );
    expect(actionButtonRule).toContain(
      'border-image-slice: var(--brewing-page-cauldron-action-button-slice);',
    );
    expect(actionButtonRule).toContain(
      '--brewing-page-cauldron-action-button-border-image-width',
    );
    expect(actionButtonRule).toContain('border-image-repeat: stretch;');
    expect(actionButtonRule).toContain('white-space: nowrap;');
    expect(quantityOptionsRule).toContain('display: flex;');
    expect(quantityOptionsRule).toContain('align-items: stretch;');
    expect(quantityOptionsRule).toContain('width: 100%;');
    expect(quantityButtonRule).toContain(
      'height: var(--brewing-page-cauldron-action-button-height);',
    );
    expect(quantityButtonRule).toContain(
      'width: var(--brewing-page-cauldron-action-button-width);',
    );
    expect(quantityButtonRule).toContain(
      'color: var(--brewing-page-cauldron-action-button-text);',
    );
    expect(quantityButtonRule).toContain('background: transparent;');
    expect(quantityButtonRule).toContain('border-color: transparent;');
    expect(quantityButtonRule).toContain(
      'border-image-source: var(--brewing-page-cauldron-action-button-frame);',
    );
    expect(quantityButtonRule).toContain(
      'border-image-slice: var(--brewing-page-cauldron-action-button-slice);',
    );
    expect(quantityButtonRule).toContain(
      '--brewing-page-cauldron-action-button-border-image-width',
    );
    expect(quantityButtonRule).toContain('border-image-repeat: stretch;');
    expect(quantityButtonRule).toContain('display: inline-flex;');
    expect(quantityButtonRule).toContain('align-items: center;');
    expect(quantityButtonRule).toContain('justify-content: center;');
    expect(quantityButtonRule).toContain('margin: 0;');
    expect(midnightActionButtonRule).toContain('background: transparent;');
    expect(midnightActionButtonRule).toContain('border-color: transparent;');
    expect(midnightActionButtonRule).toContain(
      'border-image-source: var(--brewing-page-cauldron-action-button-frame);',
    );
    expect(midnightActionButtonRule).toContain(
      'border-image-slice: var(--brewing-page-cauldron-action-button-slice);',
    );
    expect(midnightActionButtonRule).toContain(
      '--brewing-page-cauldron-action-button-border-image-width',
    );
    expect(midnightActionButtonRule).toContain('border-image-repeat: stretch;');
    expect(baseCss).toContain(
      'border-image-source: var(--brewing-page-cauldron-action-button-disabled-frame);',
    );
    expect(quantityButtonRule).toContain('border: var(--style-border);');
    expect(actionButton?.getAttribute('aria-label')).toBe(
      'brew 3 mana tonic, costs 36 mana',
    );

    manager.unmount();
    parent.remove();
  });

  it('cycles brew quantity through researched states and wraps to x1', () => {
    const snapshot = {
      brewing: {
        herbs: [],
        ingredients: [
          { slotIndex: 0, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
        ],
        recipes: [],
        maxIngredients: 5,
        manaCost: 12,
        brewQuantity: 1,
        maxBrewQuantity: 3,
        activeBrew: null,
        match: {
          key: 'manaTonic',
          label: 'mana tonic',
          unlocked: true,
        },
        canAddIngredient: true,
        canBrew: true,
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const selectedQuantities = [];
    const manager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
      onSelectBrewQuantity: (quantity, cauldronIndex) => {
        selectedQuantities.push({ quantity, cauldronIndex });
        snapshot.brewing.brewQuantity = quantity;
      },
    });

    manager.mount(parent);

    const quantityButton = parent.querySelector('.brewing-page__quantity-button');

    expect(quantityButton?.textContent).toBe('x1');

    quantityButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(quantityButton?.textContent).toBe('x2');

    quantityButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(quantityButton?.textContent).toBe('x3');

    quantityButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(quantityButton?.textContent).toBe('x1');
    expect(selectedQuantities).toEqual([
      { quantity: 2, cauldronIndex: 0 },
      { quantity: 3, cauldronIndex: 0 },
      { quantity: 1, cauldronIndex: 0 },
    ]);

    manager.unmount();
    parent.remove();
  });

  it('shows auto/manual mode button next to brew quantity when auto brew is available', () => {
    const snapshot = {
      research: {
        completedResearchIds: ['automation:autoBrewCauldron:1'],
      },
      brewing: {
        herbs: [],
        ingredients: [
          { slotIndex: 0, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
          { slotIndex: 1, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
          { slotIndex: 2, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
        ],
        recipes: [],
        maxIngredients: 5,
        manaCost: 36,
        brewQuantity: 3,
        maxBrewQuantity: 3,
        autoBrewEnabled: false,
        autoBrewRecipeKey: 'manaTonic',
        activeBrew: null,
        match: {
          key: 'manaTonic',
          label: 'mana tonic',
          unlocked: true,
        },
        canAddIngredient: true,
        canBrew: true,
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const toggles = [];
    const manager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
      onToggleAutoBrew: (cauldronIndex) => {
        toggles.push(cauldronIndex);
        snapshot.brewing.autoBrewEnabled = !snapshot.brewing.autoBrewEnabled;
        return {
          ok: true,
          autoBrewEnabled: snapshot.brewing.autoBrewEnabled,
          cauldronIndex,
        };
      },
    });

    manager.mount(parent);

    const actionRow = parent.querySelector('.brewing-page__action-row');
    const autoButton = parent.querySelector('.brewing-page__auto-button');

    expect(autoButton?.hidden).toBe(false);
    expect(autoButton?.previousElementSibling).toBe(
      parent.querySelector('.brewing-page__quantity-options'),
    );
    expect(autoButton?.parentElement).toBe(actionRow);
    expect(autoButton?.textContent).toBe('manual');
    expect(autoButton?.dataset.autoBrewEnabled).toBe('false');
    expect(autoButton?.getAttribute('aria-pressed')).toBe('false');
    expect(autoButton?.getAttribute('aria-label')).toBe('manual brewing; press for auto');

    autoButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(toggles).toEqual([0]);
    expect(autoButton?.textContent).toBe('auto');
    expect(autoButton?.dataset.autoBrewEnabled).toBe('true');
    expect(autoButton?.getAttribute('aria-pressed')).toBe('true');
    expect(autoButton?.getAttribute('aria-label')).toBe('auto brewing; press for manual');

    manager.unmount();
    parent.remove();
  });

  it('shows disabled and locked controls when no recipe or herbs are selected', () => {
    const snapshot = {
      brewing: {
        herbs: [],
        ingredients: [],
        recipes: [
          {
            key: 'manaTonic',
            label: 'mana tonic',
            unlocked: true,
            ingredients: [
              { itemTypeId: 1001, key: 'sageHerb', label: 'sage', quantity: 1 },
            ],
          },
        ],
        maxIngredients: 5,
        manaCost: 12,
        activeBrew: null,
        selectedRecipe: null,
        match: null,
        canAddIngredient: true,
        canBrew: false,
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
      getSelectedRecipeKey: () => null,
    });

    manager.mount(parent);

    const actions = parent.querySelector('.brewing-page__actions');
    const action = parent.querySelector('.brewing-page__action-button');
    const bubble = parent.querySelector('.brewing-page__cauldron-bubble');
    const cauldronArt = parent.querySelector('.brewing-page__cauldron-art');
    const cauldronLiquid = parent.querySelector('.brewing-page__cauldron-art-liquid');
    const previewSummary = parent.querySelector('.brewing-page__cauldron-preview-summary');
    const previewLabel = parent.querySelector('.brewing-page__cauldron-preview-label');
    const previewIcon = parent.querySelector('.brewing-page__cauldron-preview-icon');
    const empty = parent.querySelector('.brewing-page__cauldron-empty');
    const items = parent.querySelector('.brewing-page__cauldron-items');
    const recipeButton = parent.querySelector('.brewing-page__cauldron-select-recipe-text');
    const quantityButton = parent.querySelector('.brewing-page__quantity-button');
    const autoButton = parent.querySelector('.brewing-page__auto-button');

    expect(actions?.hidden).toBe(false);
    expect(action?.textContent).toBe('brew 12 mana');
    expect(action?.disabled).toBe(true);
    expect(action?.classList.contains('is-locked')).toBe(false);
    expect(action?.getAttribute('aria-disabled')).toBe('true');
    expect(action?.hasAttribute('data-tutorial-id')).toBe(false);
    expect(bubble?.textContent).toBe('');
    expect(cauldronArt).not.toBeNull();
    expect(cauldronLiquid?.hidden).toBe(true);
    expect(cauldronLiquid?.dataset.potionLiquidKey).toBeUndefined();
    expect(previewSummary?.hidden).toBe(true);
    expect(previewLabel?.hidden).toBe(true);
    expect(previewLabel?.textContent).toBe('');
    expect(previewIcon?.hidden).toBe(true);
    expect(previewIcon?.dataset.assetAtlasFrame).toBeUndefined();
    expect(empty?.hidden).toBe(false);
    expect(empty?.textContent).toBe('empty');
    expect(items?.classList.contains('is-empty')).toBe(true);
    expect(recipeButton?.hidden).toBe(false);
    expect(recipeButton?.textContent).toBe('recipes');
    expect(recipeButton?.disabled).toBe(false);
    expect(quantityButton?.hidden).toBe(false);
    expect(quantityButton?.textContent).toBe('x1');
    expect(quantityButton?.disabled).toBe(true);
    expect(quantityButton?.classList.contains('is-locked')).toBe(true);
    expect(autoButton?.hidden).toBe(false);
    expect(autoButton?.textContent).toBe('auto');
    expect(autoButton?.disabled).toBe(true);
    expect(autoButton?.classList.contains('is-locked')).toBe(true);

    manager.unmount();
    parent.remove();
  });

  it('shows the potion result label with the brew action beside the cauldron box', () => {
    const snapshot = {
      brewing: {
        herbs: [],
        ingredients: [
          { slotIndex: 0, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
        ],
        recipes: [],
        maxIngredients: 5,
        manaCost: 5,
        activeBrew: null,
        selectedRecipe: null,
        match: null,
        canAddIngredient: true,
        canBrew: true,
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
    });

    manager.mount(parent);

    const preview = parent.querySelector('.brewing-page__cauldron-preview');
    const label = parent.querySelector('.brewing-page__cauldron-preview-label');
    let icon = parent.querySelector('.brewing-page__cauldron-preview-icon');
    const cauldronLiquid = parent.querySelector('.brewing-page__cauldron-art-liquid');
    const action = parent.querySelector('.brewing-page__action-button');
    const actions = parent.querySelector('.brewing-page__actions');
    const recipeBox = parent.querySelector('.brewing-page__cauldron-recipe-box');

    expect(label?.hidden).toBe(false);
    expect(label?.textContent).toBe('wasted potion');
    expect(label?.dataset.resourceColor).toBeUndefined();
    expect(icon?.hidden).toBe(false);
    expect(icon?.dataset.assetAtlasFrame).toBe('potion:wastedPotion');
    expect(cauldronLiquid?.hidden).toBe(true);
    expect(cauldronLiquid?.dataset.potionLiquidKey).toBeUndefined();
    expect(action?.closest('.brewing-page__cauldron-preview')).toBeNull();
    expect(actions?.closest('.brewing-page__cauldron-recipe-box')).toBeNull();
    expect(recipeBox?.parentElement?.nextElementSibling).toBe(actions);
    expect(action?.closest('.brewing-page__cauldron')).toBe(preview?.closest('.brewing-page__cauldron'));
    expect(action?.textContent).toBe('brew 5 mana');

    snapshot.brewing.match = {
      label: 'unknown potion',
      discoverable: true,
      unlocked: false,
    };
    snapshot.brewing.manaCost = 5;
    manager.render(snapshot);

    expect(label?.hidden).toBe(false);
    expect(label?.textContent).toBe('unknown potion');
    expect(label?.classList.contains('is-unknown')).toBe(true);
    icon = parent.querySelector('.brewing-page__cauldron-preview-icon');
    expect(icon?.hidden).toBe(false);
    expect(icon?.dataset.assetAtlasFrame).toBe('potion:unknownPotion');
    expect(cauldronLiquid?.hidden).toBe(true);
    expect(cauldronLiquid?.dataset.potionLiquidKey).toBeUndefined();
    expect(action?.getAttribute('aria-label')).toBe('brew unknown potion, costs 5 mana');

    snapshot.brewing.match = {
      key: 'manaTonic',
      label: 'mana tonic',
      discoverable: false,
      unlocked: true,
    };
    snapshot.brewing.manaCost = 12;
    manager.render(snapshot);

    expect(label?.hidden).toBe(false);
    expect(label?.textContent).toBe('mana tonic');
    expect(label?.dataset.resourceColor).toBeUndefined();
    expect(label?.dataset.itemIconKey).toBeUndefined();
    icon = parent.querySelector('.brewing-page__cauldron-preview-icon');
    expect(icon?.hidden).toBe(false);
    expect(icon?.dataset.assetAtlasFrame).toBe('potion:manaTonic');
    expect(cauldronLiquid?.hidden).toBe(true);
    expect(cauldronLiquid?.dataset.potionLiquidKey).toBeUndefined();
    expect(action?.textContent).toBe('brew 12 mana');

    manager.unmount();
    parent.remove();
  });

  it('keeps selected recipe guide rows out of an inner scroll pane', () => {
    const guideSequenceRule = baseCss.match(
      /\.brewing-page__cauldron-guide-sequence\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(guideSequenceRule).toContain(
      'min-height: var(--brewing-page-cauldron-scroll-height);',
    );
    expect(guideSequenceRule).toContain('overflow: visible;');
    expect(guideSequenceRule).not.toContain('overflow: hidden auto;');
  });

  it('keeps three cauldron rows by default and grows for taller selected recipes', () => {
    const cauldronRule = baseCss.match(
      /\.brewing-page__cauldron\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(baseCss).toContain('--brewing-page-cauldron-base-row-count: 3;');
    expect(cauldronRule).toContain(
      'var(--style-row-min-height) * var(--brewing-page-cauldron-list-row-count)',
    );
    expect(cauldronRule).toContain(
      'var(--style-row-min-height) * var(--brewing-page-cauldron-row-count)',
    );
    expect(cauldronRule).toContain(
      '--brewing-page-cauldron-block-height: var(',
    );
    expect(cauldronRule).toContain('display: flex;');
    expect(cauldronRule).toContain('width: var(--brewing-page-cauldron-node-width);');

    const baseSnapshot = {
      brewing: {
        herbs: [],
        ingredients: [],
        recipes: [],
        maxIngredients: 5,
        manaCost: 12,
        activeBrew: null,
        selectedRecipe: null,
        match: null,
        canAddIngredient: true,
        canBrew: false,
      },
    };
    const baseParent = document.createElement('div');
    document.body.append(baseParent);
    const baseManager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(baseSnapshot),
    });

    baseManager.mount(baseParent);

    expect(
      baseParent
        .querySelector('.brewing-page__cauldron')
        ?.style.getPropertyValue('--brewing-page-cauldron-row-count'),
    ).toBe('3');

    baseManager.unmount();
    baseParent.remove();

    const recipeSnapshot = {
      brewing: {
        herbs: [],
        ingredients: [],
        recipes: [
          {
            key: 'manyRows',
            label: 'many rows',
            unlocked: true,
            ingredients: [
              { itemTypeId: 1001, key: 'sageHerb', label: 'sage', quantity: 1 },
              { itemTypeId: 1002, key: 'mintHerb', label: 'mint', quantity: 1 },
              { itemTypeId: 1003, key: 'nettleHerb', label: 'nettle', quantity: 1 },
              { itemTypeId: 1004, key: 'briarHerb', label: 'briar', quantity: 1 },
            ],
          },
        ],
        maxIngredients: 5,
        manaCost: 12,
        activeBrew: null,
        selectedRecipe: null,
        match: null,
        canAddIngredient: true,
        canBrew: false,
      },
    };
    const recipeParent = document.createElement('div');
    document.body.append(recipeParent);
    const recipeManager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(recipeSnapshot),
      getSelectedRecipeKey: () => 'manyRows',
    });

    recipeManager.mount(recipeParent);

    expect(
      recipeParent
        .querySelector('.brewing-page__cauldron')
        ?.style.getPropertyValue('--brewing-page-cauldron-row-count'),
    ).toBe('4');
    expect(
      recipeParent
        .querySelector('.brewing-page__cauldron')
        ?.style.getPropertyValue('--brewing-page-cauldron-list-row-count'),
    ).toBe('4');

    recipeManager.unmount();
    recipeParent.remove();

    const statusSnapshot = {
      brewing: {
        herbs: [],
        ingredients: [
          { slotIndex: 0, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
        ],
        recipes: [
          {
            key: 'statusRows',
            label: 'status rows',
            unlocked: true,
            ingredients: [
              { itemTypeId: 1001, key: 'sageHerb', label: 'sage', quantity: 1 },
              { itemTypeId: 1002, key: 'mintHerb', label: 'mint', quantity: 1 },
              { itemTypeId: 1003, key: 'nettleHerb', label: 'nettle', quantity: 1 },
            ],
          },
        ],
        maxIngredients: 5,
        manaCost: 12,
        activeBrew: null,
        selectedRecipe: null,
        match: null,
        canAddIngredient: true,
        canBrew: false,
      },
    };
    const statusParent = document.createElement('div');
    document.body.append(statusParent);
    const statusManager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(statusSnapshot),
      getSelectedRecipeKey: () => 'statusRows',
    });

    statusManager.mount(statusParent);

    const statusCauldron = statusParent.querySelector('.brewing-page__cauldron');
    expect(statusCauldron?.style.getPropertyValue('--brewing-page-cauldron-row-count')).toBe(
      '3',
    );
    expect(
      statusCauldron?.style.getPropertyValue('--brewing-page-cauldron-list-row-count'),
    ).toBe('3');

    statusManager.unmount();
    statusParent.remove();
  });

  it('grows cauldron rows for five distinct staged herb groups', () => {
    const ingredientKeys = ['sageHerb', 'mintHerb', 'nettleHerb', 'briarHerb', 'glowcapHerb'];
    const labels = ['sage', 'mint', 'nettle', 'briar', 'glowcap'];
    const snapshot = {
      brewing: {
        herbs: [],
        ingredients: ingredientKeys.map((key, index) => ({
          slotIndex: index,
          itemTypeId: 1001 + index,
          key,
          label: labels[index],
          kind: 'herb',
        })),
        recipes: [],
        maxIngredients: 5,
        manaCost: 12,
        activeBrew: null,
        selectedRecipe: null,
        match: null,
        canAddIngredient: false,
        canBrew: true,
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
    });

    manager.mount(parent);

    const cauldron = parent.querySelector('.brewing-page__cauldron');
    const items = parent.querySelector('.brewing-page__cauldron-items');
    const rows = [...parent.querySelectorAll('.brewing-page__ingredient-row')];

    expect(cauldron?.style.getPropertyValue('--brewing-page-cauldron-row-count')).toBe('5');
    expect(cauldron?.style.getPropertyValue('--brewing-page-cauldron-list-row-count')).toBe(
      '5',
    );
    expect(items?.hidden).toBe(false);
    expect(rows.filter((row) => !row.hidden).map((row) => row.textContent)).toEqual([
      '1 sage',
      '1 mint',
      '1 nettle',
      '1 briar',
      '1 glowcap',
    ]);

    manager.unmount();
    parent.remove();
  });

  it('keeps the in-frame action strip above the selected recipe guide layer', () => {
    const actionsRule = baseCss.match(
      /\.brewing-page__actions\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const guideRule = baseCss.match(
      /\.brewing-page__cauldron-guide\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(actionsRule).toContain('z-index: 2;');
    expect(guideRule).toContain('z-index: 1;');
  });

  it('offers fill recipe when a remembered recipe can be staged into an empty cauldron', () => {
    const manager = new BrewingCauldronManager();
    const brewing = {
      ingredients: [],
      herbs: [
        {
          itemTypeId: 1001,
          key: 'sageHerb',
          label: 'sage',
          kind: 'herb',
          quantity: 3,
          availableQuantity: 3,
        },
      ],
      selectedRecipe: {
        key: 'manaTonic',
        label: 'mana tonic',
        ingredients: [
          {
            itemTypeId: 1001,
            key: 'sageHerb',
            label: 'sage',
            quantity: 3,
          },
        ],
      },
      match: null,
      canBrew: false,
      manaCost: 12,
      activeBrew: null,
    };

    expect(manager.getPrimaryAction(brewing)).toMatchObject({
      id: 'fill',
      label: 'fill recipe',
      disabled: false,
      hasCost: false,
      ariaLabel: 'fill mana tonic recipe',
    });
  });

  it('does not offer fill recipe while the cauldron has an active brew', () => {
    const manager = new BrewingCauldronManager();
    const brewing = {
      ingredients: [],
      herbs: [
        {
          itemTypeId: 1001,
          key: 'sageHerb',
          label: 'sage',
          kind: 'herb',
          quantity: 3,
          availableQuantity: 3,
        },
      ],
      selectedRecipe: {
        key: 'manaTonic',
        label: 'mana tonic',
        ingredients: [
          {
            itemTypeId: 1001,
            key: 'sageHerb',
            label: 'sage',
            quantity: 3,
          },
        ],
      },
      match: null,
      canBrew: false,
      manaCost: 12,
      activeBrew: {
        key: 'manaTonic',
        label: 'mana tonic',
        phase: 'brewing',
        canStartBottling: false,
        canCollect: false,
      },
    };

    expect(manager.getPrimaryAction(brewing)).toMatchObject({
      id: 'brew',
      label: 'brew',
      disabled: true,
      hasCost: false,
    });
    expect(manager.canFillSelectedRecipe(brewing)).toBe(false);
  });

  it('reuses the fixed cauldron content slot while brewing is active', () => {
    const snapshot = {
      brewing: {
        herbs: [],
        ingredients: [],
        recipes: [],
        maxIngredients: 5,
        manaCost: 12,
        selectedRecipe: null,
        match: null,
        canAddIngredient: false,
        canBrew: false,
        activeBrew: {
          key: 'manaTonic',
          label: 'mana tonic',
          phase: 'brewing',
          canStartBottling: false,
          canCollect: false,
          remainingMs: 28_000,
          totalMs: 30_000,
          bottlingTotalMs: 2_000,
          progress: 0.1,
        },
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
    });
    const frameCallbacks = [];

    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: vi.fn((callback) => {
        frameCallbacks.push(callback);
        return frameCallbacks.length;
      }),
    });

    manager.mount(parent);

    const items = parent.querySelector('.brewing-page__cauldron-items');
    const bubble = parent.querySelector('.brewing-page__cauldron-bubble');
    const active = parent.querySelector('.brewing-page__active-brew');
    const activeProgressFill = parent.querySelector('.brewing-page__active-progress-fill');
    const cauldronLiquid = parent.querySelector('.brewing-page__cauldron-art-liquid');

    expect(items?.hidden).toBe(true);
    expect(parent.querySelector('.brewing-page__cauldron')?.classList.contains('has-active-brew')).toBe(
      true,
    );
    expect(bubble?.textContent).toBe('brewing 28s');
    expect(active?.hidden).toBe(false);
    expect(active?.textContent).toContain('brewing 28s');
    expect(active?.textContent).not.toContain('mana tonic');
    expect(activeProgressFill?.style.transform).toBe('scaleX(0.0667)');

    for (const callback of frameCallbacks) {
      callback();
    }

    expect(activeProgressFill?.classList.contains('is-progress-running')).toBe(true);
    expect(activeProgressFill?.style.transition).toBe('transform 28000ms linear');
    expect(activeProgressFill?.style.transform).toBe('scaleX(1)');
    expect(cauldronLiquid?.hidden).toBe(false);
    expect(cauldronLiquid?.dataset.potionLiquidKey).toBe('manaTonic');
    expect(cauldronLiquid?.style.getPropertyValue('--brewing-page-cauldron-liquid-color')).toBe(
      '#10a7ff',
    );

    snapshot.brewing.activeBrew = null;
    snapshot.brewing.canAddIngredient = true;
    manager.render(snapshot);

    expect(items?.hidden).toBe(false);
    expect(parent.querySelector('.brewing-page__cauldron')?.classList.contains('has-active-brew')).toBe(
      false,
    );
    expect(active?.hidden).toBe(true);
    expect(cauldronLiquid?.hidden).toBe(true);
    expect(cauldronLiquid?.dataset.potionLiquidKey).toBeUndefined();

    manager.unmount();
    parent.remove();
  });
});
