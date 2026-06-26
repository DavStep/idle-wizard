// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { GardenPlotManager } from './GardenPlotManager.js';

function createGameplayFacadeFake() {
  const listeners = new Set();
  const herbsBySeedId = new Map([
    [1, { itemTypeId: 1001, key: 'sageHerb', label: 'sage' }],
    [2, { itemTypeId: 1002, key: 'mintHerb', label: 'mint' }],
    [3, { itemTypeId: 1003, key: 'nettleHerb', label: 'nettle' }],
  ]);
  const snapshot = {
    coin: {
      current: 0,
    },
    garden: {
      plot: {
        unlockedTiles: 1,
        maxTiles: 1,
        tilesPerRow: 4,
        tileCosts: [0],
        nextTileNumber: null,
        nextTileCost: null,
        harvestSeconds: 3,
        tiles: [
          {
            tileNumber: 1,
            unlocked: true,
            selectedSeedItemTypeId: null,
            selectedSeedKey: null,
            selectedSeedLabel: null,
            selectedHerbKey: null,
            selectedHerbLabel: null,
            seedItemTypeId: null,
            seedKey: null,
            seedLabel: null,
            herbItemTypeId: null,
            herbKey: null,
            herbLabel: null,
            phase: 'empty',
            totalMs: 0,
            remainingMs: 0,
            progress: 0,
            process: null,
          },
        ],
      },
      seeds: [
        {
          itemTypeId: 2,
          key: 'mintSeed',
          label: 'mint seed',
          kind: 'seed',
          quantity: 1,
        },
        {
          itemTypeId: 3,
          key: 'nettleSeed',
          label: 'nettle seed',
          kind: 'seed',
          quantity: 6,
        },
        {
          itemTypeId: 1,
          key: 'sageSeed',
          label: 'sage seed',
          kind: 'seed',
          quantity: 0,
        },
      ],
    },
  };
  const publish = () => {
    for (const listener of listeners) {
      listener(snapshot);
    }
  };

  const gameplayFacade = {
    getSnapshot: () => snapshot,
    publish,
    subscribe: (listener) => {
      listeners.add(listener);
      listener(snapshot);
      return () => listeners.delete(listener);
    },
    plantGardenSeed: (tileNumber, seedTypeId) => {
      const seed = snapshot.garden.seeds.find((candidate) => candidate.itemTypeId === seedTypeId);
      const tile = snapshot.garden.plot.tiles[tileNumber - 1];
      const herb = herbsBySeedId.get(seedTypeId);

      if (!seed || seed.quantity <= 0 || !tile || tile.phase !== 'empty' || !herb) {
        return { ok: false };
      }

      seed.quantity -= 1;
      tile.selectedSeedItemTypeId = seed.itemTypeId;
      tile.selectedSeedKey = seed.key;
      tile.selectedSeedLabel = seed.label;
      tile.selectedHerbKey = herb.key;
      tile.selectedHerbLabel = herb.label;
      tile.seedItemTypeId = seed.itemTypeId;
      tile.seedKey = seed.key;
      tile.seedLabel = seed.label;
      tile.herbItemTypeId = herb.itemTypeId;
      tile.herbKey = herb.key;
      tile.herbLabel = herb.label;
      tile.phase = 'growing';
      tile.totalMs = 12_000;
      tile.remainingMs = 12_000;
      tile.progress = 0;
      tile.process = {
        phase: 'growing',
        totalMs: 12_000,
        remainingMs: 12_000,
        progress: 0,
      };
      publish();
      return { ok: true };
    },
    selectGardenSeed: (tileNumber, seedTypeId) => {
      const tile = snapshot.garden.plot.tiles[tileNumber - 1];

      if (!tile) {
        return { ok: false };
      }

      if (!seedTypeId) {
        tile.selectedSeedItemTypeId = null;
        tile.selectedSeedKey = null;
        tile.selectedSeedLabel = null;
        tile.selectedHerbKey = null;
        tile.selectedHerbLabel = null;
        publish();
        return { ok: true, planted: false };
      }

      const seed = snapshot.garden.seeds.find((candidate) => candidate.itemTypeId === seedTypeId);
      const herb = herbsBySeedId.get(seedTypeId);

      if (!seed || !herb) {
        return { ok: false };
      }

      tile.selectedSeedItemTypeId = seed.itemTypeId;
      tile.selectedSeedKey = seed.key;
      tile.selectedSeedLabel = seed.label;
      tile.selectedHerbKey = herb.key;
      tile.selectedHerbLabel = herb.label;

      if (tile.phase === 'empty' && seed.quantity > 0) {
        const result = gameplayFacade.plantGardenSeed(tileNumber, seedTypeId);
        return result?.ok ? { ...result, planted: true } : { ok: true, planted: false };
      }

      publish();
      return { ok: true, planted: false };
    },
    plantSelectedGardenSeed: (tileNumber) => {
      const tile = snapshot.garden.plot.tiles[tileNumber - 1];

      if (!tile?.selectedSeedItemTypeId) {
        return { ok: false };
      }

      return gameplayFacade.plantGardenSeed(tileNumber, tile.selectedSeedItemTypeId);
    },
    replaceGardenSeed: (tileNumber, seedTypeId) => {
      const tile = snapshot.garden.plot.tiles[tileNumber - 1];
      const seed = snapshot.garden.seeds.find((candidate) => candidate.itemTypeId === seedTypeId);
      const herb = herbsBySeedId.get(seedTypeId);
      const previousSeed = snapshot.garden.seeds.find(
        (candidate) => candidate.itemTypeId === tile?.seedItemTypeId,
      );
      const availableQuantity =
        (seed?.quantity ?? 0) + (previousSeed?.itemTypeId === seedTypeId ? 1 : 0);

      if (!tile || tile.phase !== 'growing' || !seed || !herb || availableQuantity <= 0) {
        return { ok: false };
      }

      if (previousSeed) {
        previousSeed.quantity += 1;
      }

      seed.quantity -= 1;
      tile.selectedSeedItemTypeId = seed.itemTypeId;
      tile.selectedSeedKey = seed.key;
      tile.selectedSeedLabel = seed.label;
      tile.selectedHerbKey = herb.key;
      tile.selectedHerbLabel = herb.label;
      tile.seedItemTypeId = seed.itemTypeId;
      tile.seedKey = seed.key;
      tile.seedLabel = seed.label;
      tile.herbItemTypeId = herb.itemTypeId;
      tile.herbKey = herb.key;
      tile.herbLabel = herb.label;
      tile.phase = 'growing';
      tile.totalMs = 12_000;
      tile.remainingMs = 12_000;
      tile.progress = 0;
      tile.process = {
        phase: 'growing',
        totalMs: 12_000,
        remainingMs: 12_000,
        progress: 0,
      };
      publish();
      return { ok: true };
    },
    startGardenHarvest: (tileNumber) => {
      const tile = snapshot.garden.plot.tiles[tileNumber - 1];

      if (!tile || tile.phase !== 'ready') {
        return { ok: false };
      }

      tile.phase = 'harvesting';
      tile.totalMs = 3_000;
      tile.remainingMs = 3_000;
      tile.progress = 0;
      tile.process = {
        phase: 'harvesting',
        totalMs: 3_000,
        remainingMs: 3_000,
        progress: 0,
      };
      publish();
      return { ok: true };
    },
    cancelGardenPlanting: (tileNumber) => {
      const tile = snapshot.garden.plot.tiles[tileNumber - 1];

      if (!tile?.process || !tile.seedItemTypeId) {
        return { ok: false };
      }

      const seed = snapshot.garden.seeds.find(
        (candidate) => candidate.itemTypeId === tile.seedItemTypeId,
      );

      if (seed) {
        seed.quantity += 1;
      }

      tile.selectedSeedItemTypeId = null;
      tile.selectedSeedKey = null;
      tile.selectedSeedLabel = null;
      tile.selectedHerbKey = null;
      tile.selectedHerbLabel = null;
      tile.seedItemTypeId = null;
      tile.seedKey = null;
      tile.seedLabel = null;
      tile.herbItemTypeId = null;
      tile.herbKey = null;
      tile.herbLabel = null;
      tile.phase = 'empty';
      tile.totalMs = 0;
      tile.remainingMs = 0;
      tile.progress = 0;
      tile.process = null;
      publish();
      return { ok: true };
    },
    buyGardenTile: vi.fn(() => {
      const plot = snapshot.garden.plot;
      const tileNumber = plot.nextTileNumber;
      const cost = plot.nextTileCost;
      const tile = plot.tiles.find((candidate) => candidate.tileNumber === tileNumber);

      if (
        !tile ||
        tile.unlocked ||
        !Number.isFinite(cost) ||
        snapshot.coin.current < cost
      ) {
        return { ok: false };
      }

      snapshot.coin.current -= cost;
      tile.unlocked = true;
      plot.unlockedTiles = plot.tiles.filter((candidate) => candidate.unlocked).length;

      const nextTile = plot.tiles.find((candidate) => !candidate.unlocked);
      plot.nextTileNumber = nextTile?.tileNumber ?? null;
      plot.nextTileCost =
        nextTile && Array.isArray(plot.tileCosts)
          ? (plot.tileCosts[nextTile.tileNumber - 1] ?? null)
          : null;

      publish();
      return { ok: true, cost, tileNumber };
    }),
  };

  return gameplayFacade;
}

function setPlotActionHitBox(plotRow) {
  plotRow.querySelector('.garden-page__plot-action').getBoundingClientRect = () => ({
    left: 100,
    right: 220,
    top: 0,
    bottom: 24,
    width: 120,
    height: 24,
  });
}

function createPointerEvent(
  type,
  { clientX = 120, clientY = 180, pointerId = 1, pointerType = 'touch' } = {},
) {
  const event = new window.MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX,
    clientY,
  });
  Object.defineProperty(event, 'pointerId', { value: pointerId });
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  return event;
}

function dispatchPointer(element, type, options) {
  const event = createPointerEvent(type, options);
  element.dispatchEvent(event);
  return event;
}

function dispatchTouchLikePressStart(element, options) {
  element.dispatchEvent(createPointerEvent('pointerdown', options));
}

function dispatchTouchLikePressEnd(element, options) {
  element.dispatchEvent(
    createPointerEvent('pointerup', options),
  );
}

describe('GardenPlotManager', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('renders a plot world with three fixed columns', () => {
    const parent = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const manager = new GardenPlotManager({ gameplayFacade });

    gameplayFacade.getSnapshot().garden.plot.tilesPerRow = 8;

    manager.mount(parent);

    const plotRoot = parent.querySelector('.garden-page__plot');
    const rows = parent.querySelector('.garden-page__plot-rows');

    expect(plotRoot?.classList.contains('garden-page__plot-world')).toBe(true);
    expect(plotRoot?.dataset.pageSwipeBlock).toBe('true');
    expect(plotRoot?.classList.contains('style-box')).toBe(false);
    expect(plotRoot?.querySelector('.style-box__title')).toBeNull();
    expect(plotRoot?.querySelector('.garden-page__world-shell')).toBeTruthy();
    expect(plotRoot?.querySelector('.garden-page__world')).toBeTruthy();
    expect(rows?.style.getPropertyValue('--garden-page-plot-columns')).toBe('3');
  });

  it('pans the garden world from a plot and suppresses the follow-up click', () => {
    const parent = document.createElement('section');
    document.body.append(parent);
    const gameplayFacade = createGameplayFacadeFake();
    const manager = new GardenPlotManager({ gameplayFacade });
    const tile = gameplayFacade.getSnapshot().garden.plot.tiles[0];

    Object.assign(tile, {
      selectedSeedItemTypeId: 3,
      selectedSeedKey: 'nettleSeed',
      selectedSeedLabel: 'nettle seed',
      selectedHerbKey: 'nettleHerb',
      selectedHerbLabel: 'nettle',
    });
    const plantSelectedGardenSeed = vi.spyOn(gameplayFacade, 'plantSelectedGardenSeed');

    manager.mount(parent);

    const shell = parent.querySelector('.garden-page__world-shell');
    const row = parent.querySelector('.garden-page__plot-row');
    Object.defineProperty(shell, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ left: 0, top: 0, width: 200, height: 200 }),
    });

    dispatchPointer(row, 'pointerdown', {
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
    row.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));

    const world = parent.querySelector('.garden-page__world');
    expect(world.style.getPropertyValue('--garden-page-world-pan-x')).toBe('-50px');
    expect(world.style.getPropertyValue('--garden-page-world-pan-y')).toBe('-60px');
    expect(plantSelectedGardenSeed).not.toHaveBeenCalled();

    manager.unmount();
    parent.remove();
  });

  it('pinch-zooms the garden world', () => {
    const parent = document.createElement('section');
    document.body.append(parent);
    const gameplayFacade = createGameplayFacadeFake();
    const manager = new GardenPlotManager({ gameplayFacade });

    manager.mount(parent);

    const shell = parent.querySelector('.garden-page__world-shell');
    const row = parent.querySelector('.garden-page__plot-row');
    Object.defineProperty(shell, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ left: 0, top: 0, width: 200, height: 200 }),
    });

    dispatchPointer(row, 'pointerdown', {
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

    const world = parent.querySelector('.garden-page__world');
    const zoom = Number.parseFloat(world.style.getPropertyValue('--garden-page-world-zoom'));
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

    expect(world.style.getPropertyValue('--garden-page-world-zoom')).toBe('1.16');

    manager.unmount();
    parent.remove();
  });

  it('shows plot stars inside each plot box', () => {
    const parent = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const manager = new GardenPlotManager({ gameplayFacade });
    const tile = gameplayFacade.getSnapshot().garden.plot.tiles[0];

    tile.level = 3;

    manager.mount(parent);

    const star = parent.querySelector('.garden-page__plot-box-level');
    const frame = parent.querySelector('.garden-page__plot-box-frame');

    expect(star?.textContent).toBe('★★');
    expect(star?.dataset.starTone).toBe('yellow');
    expect(star?.getAttribute('aria-label')).toBe('yellow star 2');
    expect(frame?.dataset.plotSoilLevel).toBe('3');
  });

  it('shows empty plot stars before emerald upgrades', () => {
    const parent = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const manager = new GardenPlotManager({ gameplayFacade });

    manager.mount(parent);

    const star = parent.querySelector('.garden-page__plot-box-level');
    const frame = parent.querySelector('.garden-page__plot-box-frame');

    expect(star?.textContent).toBe('☆☆☆');
    expect(star?.dataset.starTone).toBe('empty');
    expect(star?.getAttribute('aria-label')).toBe('0 stars');
    expect(frame?.dataset.plotSoilLevel).toBe('1');
    expect(
      star?.querySelectorAll('.style-star-level__slot[data-star-filled="true"]'),
    ).toHaveLength(0);
  });

  it('caps plot soil tint at the richest supported level', () => {
    const parent = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const manager = new GardenPlotManager({ gameplayFacade });
    const tile = gameplayFacade.getSnapshot().garden.plot.tiles[0];

    tile.level = 12;

    manager.mount(parent);

    expect(parent.querySelector('.garden-page__plot-box-frame')?.dataset.plotSoilLevel).toBe(
      '5',
    );
  });

  it('shows plant xN on enhanced empty plots with selected seeds', () => {
    const parent = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const manager = new GardenPlotManager({ gameplayFacade });
    const tile = gameplayFacade.getSnapshot().garden.plot.tiles[0];

    Object.assign(tile, {
      level: 3,
      selectedSeedItemTypeId: 3,
      selectedSeedKey: 'nettleSeed',
      selectedSeedLabel: 'nettle seed',
      selectedHerbKey: 'nettleHerb',
      selectedHerbLabel: 'nettle',
    });

    manager.mount(parent);

    const plotRow = parent.querySelector('.garden-page__plot-row');

    expect(plotRow.querySelector('.garden-page__plot-action')?.textContent).toBe('plant x3');
    expect(plotRow.querySelector('.garden-page__plot-box-action')?.textContent).toBe('plant x3');
  });

  it('centers empty plot box actions above plot chrome', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const centeredRule = baseCss.match(
      /\.garden-page__plot\s+\.garden-page__plot-row\.is-empty\s+\.garden-page__plot-box-action\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(centeredRule).toContain('top: 50%;');
    expect(centeredRule).toContain('left: 50%;');
    expect(centeredRule).toContain('right: auto;');
    expect(centeredRule).toContain('bottom: auto;');
    expect(centeredRule).toContain('z-index: 2;');
    expect(centeredRule).toContain(
      'font-size: var(--style-box-border-label-font-size);',
    );
    expect(centeredRule).toContain(
      'line-height: var(--style-box-border-label-line-height);',
    );
    expect(centeredRule).toContain('text-align: center;');
    expect(centeredRule).toContain('transform: translate(-50%, -50%);');
  });

  it('styles buyable plot slots as dashed transparent boxes', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const frameRule = baseCss.match(
      /\.garden-page__plot\s+\.garden-page__plot-row\.is-buy-slot\s+\.garden-page__plot-box-frame\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const hiddenChromeRule = baseCss.match(
      /\.garden-page__plot\s+\.garden-page__plot-row\.is-buy-slot\s+:where\(\s*\.garden-page__plot-box-number,\s*\.garden-page__plot-box-level,\s*\.garden-page__plot-box-label\s*\)\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const centeredActionRule = baseCss.match(
      /\.garden-page__plot\s+\.garden-page__plot-row\.is-buy-slot\s+\.garden-page__plot-box-action\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const boughtFrameRule = baseCss.match(
      /\.garden-page__plot\s+\.garden-page__plot-row\.is-newly-bought\s+\.garden-page__plot-box-frame\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const boughtActionRule = baseCss.match(
      /\.garden-page__plot\s+\.garden-page__plot-row\.is-newly-bought\s+\.garden-page__plot-box-action\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(frameRule).toContain('border: var(--style-border);');
    expect(frameRule).toContain('border-style: dashed;');
    expect(frameRule).toContain(
      'border-color: color-mix(in srgb, var(--style-stroke) 45%, transparent);',
    );
    expect(frameRule).toContain('background-color: transparent;');
    expect(frameRule).toContain('background-image: none;');
    expect(hiddenChromeRule).toContain('display: none;');
    expect(centeredActionRule).toContain('top: 50%;');
    expect(centeredActionRule).toContain('left: 50%;');
    expect(centeredActionRule).toContain('right: auto;');
    expect(centeredActionRule).toContain('bottom: auto;');
    expect(centeredActionRule).toContain('text-align: center;');
    expect(centeredActionRule).toContain('transform: translate(-50%, -50%);');
    expect(boughtFrameRule).toContain(
      'animation: garden-page-plot-buy-frame var(--style-motion-normal)',
    );
    expect(boughtActionRule).toContain(
      'animation: garden-page-plot-buy-action var(--style-motion-normal)',
    );
    expect(baseCss).toContain('@keyframes garden-page-plot-buy-frame');
    expect(baseCss).toContain('@keyframes garden-page-plot-buy-action');
    expect(baseCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.garden-page__plot-row\.is-newly-bought[\s\S]*animation:\s*none;/,
    );
  });

  it('uses smaller type for plot box stars and bottom-right statuses', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const rootRule = baseCss.match(/:root\s*\{(?<body>[^}]*)\}/)?.groups?.body;
    const boxLevelRule = baseCss.match(
      /\.garden-page__plot-box-level\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const boxActionRule = baseCss.match(
      /\.garden-page__plot\s+\.garden-page__plot-box-action\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const boxTimerRule = baseCss.match(
      /\.garden-page__plot\s+\.garden-page__plot-box-timer\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(rootRule).toContain('--garden-page-plot-box-detail-font-size: 9px;');
    expect(rootRule).toContain('--garden-page-plot-box-detail-line-height: 11px;');
    expect(boxLevelRule).toContain(
      'font-size: var(--garden-page-plot-box-detail-font-size);',
    );
    expect(boxLevelRule).toContain(
      'line-height: var(--garden-page-plot-box-detail-line-height);',
    );
    expect(boxActionRule).toContain(
      'font-size: var(--garden-page-plot-box-detail-font-size);',
    );
    expect(boxActionRule).toContain('padding: 0 2px;');
    expect(boxActionRule).toContain('background: transparent;');
    expect(boxActionRule).toContain(
      'line-height: var(--garden-page-plot-box-detail-line-height);',
    );
    expect(boxTimerRule).toContain(
      'font-size: var(--garden-page-plot-box-detail-font-size);',
    );
    expect(boxTimerRule).toContain(
      'line-height: var(--garden-page-plot-box-detail-line-height);',
    );
  });

  it('keeps the Garden world edge-to-edge while catalog boxes stay chrome-aligned', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const uiLayerRule = baseCss.match(
      /\.garden-page__ui-layer\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const contentRule = baseCss.match(
      /\.garden-page__content\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const gardenBoxesRule = baseCss.match(
      /\.garden-page__plot,\s*\.garden-page__seeds,\s*\.garden-page__herbs\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const plotWorldRule = baseCss.match(
      /\.garden-page__plot-world\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const worldShellRule = baseCss.match(
      /\.garden-page__world-shell\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const worldRule = baseCss.match(
      /\.garden-page__world\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const plotRowsRule = baseCss.match(
      /\.garden-page__plot-rows\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const inventoryRowsRule = baseCss.match(
      /\.garden-page__inventory-rows,\s*\.garden-page__herb-rows,\s*\.garden-page__seed-inventory-rows\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const absoluteRegistryStart = baseCss.indexOf('.workshop-page__bag-dialog,');
    const absoluteRegistryEnd = baseCss.indexOf('.shop-page__market-panel .shop-page__shelf');
    const absoluteRegistry = baseCss.slice(absoluteRegistryStart, absoluteRegistryEnd);

    expect(uiLayerRule).not.toContain('overflow: hidden auto;');
    expect(contentRule).toContain('top: var(--style-room-content-top);');
    expect(contentRule).toContain('bottom: var(--style-room-chat-clearance);');
    expect(contentRule).not.toContain('var(--style-page-tab-scroll-clearance)');
    expect(contentRule).toContain('--garden-page-scroll-title-clearance: 6px;');
    expect(contentRule).toContain(
      'var(--style-page-scroll-padding-top) +\n      var(--garden-page-scroll-title-clearance)',
    );
    expect(contentRule).toContain('padding-bottom: var(--style-page-scroll-padding-bottom);');
    expect(contentRule).toContain('overflow: hidden auto;');
    expect(contentRule).toContain('touch-action: pan-y;');
    expect(gardenBoxesRule).toContain('position: relative;');
    expect(plotWorldRule).toContain('position: absolute;');
    expect(plotWorldRule).toContain(
      'top: calc(var(--style-room-content-top) - var(--style-room-content-edge));',
    );
    expect(plotWorldRule).toContain('right: 0;');
    expect(plotWorldRule).toContain('bottom: var(--style-room-chat-clearance);');
    expect(plotWorldRule).toContain('left: 0;');
    expect(plotWorldRule).toContain('overflow: hidden;');
    expect(worldShellRule).toContain('touch-action: none;');
    expect(worldRule).toContain('var(--garden-page-world-pan-x, 0px)');
    expect(worldRule).toContain('var(--garden-page-world-pan-y, 0px)');
    expect(worldRule).toContain('scale(var(--garden-page-world-zoom, 1))');
    expect(plotRowsRule).toContain('max-height: none;');
    expect(plotRowsRule).toContain('overflow: visible;');
    expect(baseCss).toContain(
      'padding: 8px var(--style-room-content-edge) 0;',
    );
    expect(inventoryRowsRule).toContain('display: grid;');
    expect(inventoryRowsRule).toContain(
      'grid-template-columns: repeat(2, minmax(0, 1fr));',
    );
    expect(inventoryRowsRule).toContain(
      'min-height: calc(var(--style-row-min-height) * 3);',
    );
    expect(inventoryRowsRule).toContain('max-height: none;');
    expect(inventoryRowsRule).toContain('overflow: visible;');
    expect(baseCss).not.toContain('--garden-page-plot-rows-height');
    expect(baseCss).not.toContain('--garden-page-herb-rows-height');
    expect(baseCss).not.toContain('--garden-page-plot-row-min-height');
    expect(baseCss).not.toContain('--garden-page-plot-box-height');
    expect(absoluteRegistry).not.toContain('.garden-page__plot');
    expect(absoluteRegistry).not.toContain('.garden-page__seeds');
    expect(absoluteRegistry).not.toContain('.garden-page__herbs');
  });

  it('shows a growing herb icon scaled by progress in boxes mode', () => {
    const parent = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const manager = new GardenPlotManager({ gameplayFacade });
    const tile = gameplayFacade.getSnapshot().garden.plot.tiles[0];

    Object.assign(tile, {
      selectedSeedItemTypeId: 1,
      selectedSeedKey: 'sageSeed',
      selectedSeedLabel: 'sage seed',
      seedItemTypeId: 1,
      seedKey: 'sageSeed',
      seedLabel: 'sage seed',
      herbItemTypeId: 1001,
      herbKey: 'sageHerb',
      herbLabel: 'sage',
      phase: 'growing',
      totalMs: 12_000,
      remainingMs: 6_000,
      progress: 0.5,
      process: {
        phase: 'growing',
        totalMs: 12_000,
        remainingMs: 6_000,
        progress: 0.5,
      },
    });

    manager.mount(parent);

    const boxFrame = parent.querySelector('.garden-page__plot-box-frame');
    const plantIcon = parent.querySelector('.garden-page__plot-plant-icon');
    const boxAction = parent.querySelector('.garden-page__plot-box-action');
    const boxTimer = parent.querySelector('.garden-page__plot-box-timer');

    expect(boxFrame?.classList.contains('has-plant')).toBe(true);
    expect(boxFrame?.style.getPropertyValue('--garden-page-plot-growth-scale')).toBe('0.71');
    expect(plantIcon?.dataset.assetAtlasFrame).toBe('herb:sageHerb');
    expect(parent.querySelector('.garden-page__plot-scissors')?.hasAttribute('hidden')).toBe(
      true,
    );
    expect(boxAction?.textContent).toBe('growing 6s');
    expect(boxTimer?.parentElement).toBe(boxAction);
    expect(boxTimer?.textContent).toBe('6s');
  });

  it('sizes plot soil and progress rails from the same visual width', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const frameRule = baseCss.match(
      /\.garden-page__plot\s+\.garden-page__plot-box-frame\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const soilFillRule = baseCss.match(
      /\.garden-page__plot\s+\.garden-page__plot-box-frame::before\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const soilInkRule = baseCss.match(
      /\.garden-page__plot\s+\.garden-page__plot-box-frame::after\s*\{\s*(?<body>background-image:[^}]*)\}/,
    )?.groups?.body;
    const plantRule = baseCss.match(
      /\.garden-page__plot-plant\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const numberRule = baseCss.match(
      /\.garden-page__plot-box-number\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const progressRule = baseCss.match(
      /\.garden-page__plot\s+\.garden-page__plot-progress\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(baseCss).toContain('--garden-page-plot-number-color: #3b2416;');
    expect(baseCss).toContain('--garden-page-plot-soil-level-1: #784c31;');
    expect(baseCss).toContain('--garden-page-plot-soil-level-5: #54321f;');
    expect(frameRule).toContain('width: var(--garden-page-plot-visual-width);');
    expect(frameRule).toContain(
      '--garden-page-plot-soil-fill: var(--garden-page-plot-soil-level-1);',
    );
    expect(frameRule).toContain('isolation: isolate;');
    expect(frameRule).toContain('border: 0;');
    expect(frameRule).toContain('background-image: none;');
    expect(frameRule).toContain('background-position: center bottom;');
    expect(frameRule).toContain('background-size: 100% auto;');
    expect(soilFillRule).toContain('background: var(--garden-page-plot-soil-fill);');
    expect(soilFillRule).toContain(
      'mask-image: url("../pages/garden/assets/plots/outpost-plot-ground.png");',
    );
    expect(soilFillRule).toContain(
      '-webkit-mask-image: url("../pages/garden/assets/plots/outpost-plot-ground.png");',
    );
    expect(soilInkRule).toContain(
      'background-image: url("../pages/garden/assets/plots/outpost-plot-ground.png");',
    );
    expect(soilInkRule).toContain('mix-blend-mode: multiply;');
    expect(numberRule).toContain('left: 10px;');
    expect(numberRule).toContain('color: var(--garden-page-plot-number-color);');
    expect(numberRule).toContain('font-size: var(--style-font-size);');
    expect(baseCss).toMatch(
      /\.garden-page__plot-box-number,[\s\S]*\.garden-page__plot-box-label\s*\{[\s\S]*padding:\s*0 2px;[\s\S]*background:\s*transparent;/,
    );
    expect(baseCss).toMatch(
      /\.garden-page__plot-box-number,[\s\S]*\.garden-page__plot-box-label\s*\{[\s\S]*z-index:\s*2;/,
    );
    expect(progressRule).toContain('justify-self: center;');
    expect(progressRule).toContain('width: var(--garden-page-plot-visual-width);');
    expect(plantRule).toContain('bottom: 20px;');
    expect(baseCss).toContain('animation: garden-page-plot-ready-lift 1080ms');
    expect(baseCss).toContain('infinite;');
    expect(baseCss).toContain('@keyframes garden-page-plot-ready-lift');
    expect(baseCss).toContain('translate(-50%, -8px)');
    expect(baseCss).toContain('scale(1.1, 0.88)');
    expect(baseCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.garden-page__plot-box-frame\.is-ready \.garden-page__plot-plant\s*\{[\s\S]*animation: none;[\s\S]*transform: translateX\(-50%\) scale\(var\(--garden-page-plot-growth-scale, 1\)\);/,
    );
    expect(plantRule).toContain('width: 57.2px;');
    expect(plantRule).toContain('height: 62.4px;');
  });

  it('softens active plot progress without continuously animating on mobile', () => {
    const parent = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const manager = new GardenPlotManager({ gameplayFacade });
    const tile = gameplayFacade.getSnapshot().garden.plot.tiles[0];
    const frameCallbacks = [];
    const requestAnimationFrame = vi.fn((callback) => {
      frameCallbacks.push(callback);
      return frameCallbacks.length;
    });

    vi.stubGlobal('requestAnimationFrame', requestAnimationFrame);
    Object.assign(tile, {
      selectedSeedItemTypeId: 1,
      selectedSeedKey: 'sageSeed',
      selectedSeedLabel: 'sage seed',
      seedItemTypeId: 1,
      seedKey: 'sageSeed',
      seedLabel: 'sage seed',
      herbItemTypeId: 1001,
      herbKey: 'sageHerb',
      herbLabel: 'sage',
      phase: 'growing',
      totalMs: 12_000,
      remainingMs: 6_000,
      progress: 0.5,
      process: {
        phase: 'growing',
        totalMs: 12_000,
        remainingMs: 6_000,
        progress: 0.5,
      },
    });

    manager.mount(parent);

    const progressFill = parent.querySelector('.garden-page__plot-progress-fill');

    for (const callback of frameCallbacks) {
      callback();
    }

    expect(progressFill?.classList.contains('is-progress-running')).toBe(true);
    expect(progressFill?.style.transition).toBe('transform 6000ms linear');
    expect(progressFill?.style.transform).toBe('scaleX(1)');
  });

  it('marks boxes ready to harvest', () => {
    const parent = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const manager = new GardenPlotManager({ gameplayFacade });
    const tile = gameplayFacade.getSnapshot().garden.plot.tiles[0];

    Object.assign(tile, {
      selectedSeedItemTypeId: 1,
      selectedSeedKey: 'sageSeed',
      selectedSeedLabel: 'sage seed',
      seedItemTypeId: 1,
      seedKey: 'sageSeed',
      seedLabel: 'sage seed',
      herbItemTypeId: 1001,
      herbKey: 'sageHerb',
      herbLabel: 'sage',
      phase: 'ready',
      totalMs: 0,
      remainingMs: 0,
      progress: 1,
      process: null,
    });

    manager.mount(parent);

    const boxFrame = parent.querySelector('.garden-page__plot-box-frame');

    expect(boxFrame?.classList.contains('is-ready')).toBe(true);
    expect(parent.querySelector('.garden-page__plot-box-action')?.textContent).toBe('harvest');
    expect(parent.querySelector('.garden-page__plot-scissors')?.hasAttribute('hidden')).toBe(
      true,
    );
    expect(parent.querySelector('.garden-page__plot-box-timer')?.textContent).toBe('');
    expect(parent.querySelector('.garden-page__plot-box-timer')?.hidden).toBe(true);
  });

  it('shows harvesting scissors and timer next to status in boxes mode', () => {
    const parent = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const manager = new GardenPlotManager({ gameplayFacade });
    const tile = gameplayFacade.getSnapshot().garden.plot.tiles[0];

    Object.assign(tile, {
      selectedSeedItemTypeId: 1,
      selectedSeedKey: 'sageSeed',
      selectedSeedLabel: 'sage seed',
      seedItemTypeId: 1,
      seedKey: 'sageSeed',
      seedLabel: 'sage seed',
      herbItemTypeId: 1001,
      herbKey: 'sageHerb',
      herbLabel: 'sage',
      phase: 'harvesting',
      totalMs: 3_000,
      remainingMs: 3_000,
      progress: 0,
      process: {
        phase: 'harvesting',
        totalMs: 3_000,
        remainingMs: 3_000,
        progress: 0,
      },
    });

    manager.mount(parent);

    const boxFrame = parent.querySelector('.garden-page__plot-box-frame');
    const scissors = parent.querySelector('.garden-page__plot-scissors');
    const boxAction = parent.querySelector('.garden-page__plot-box-action');
    const boxTimer = parent.querySelector('.garden-page__plot-box-timer');

    expect(boxFrame?.classList.contains('is-harvesting')).toBe(true);
    expect(scissors?.hasAttribute('hidden')).toBe(false);
    expect(boxAction?.textContent).toBe('harvesting 3s');
    expect(boxTimer?.textContent).toBe('3s');
    expect(boxTimer?.parentElement).toBe(boxAction);
  });

  it('loops harvesting scissors motion until harvest ends', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const scissorsRule = baseCss.match(
      /\.garden-page__plot-box-frame\.is-harvesting\s+\.garden-page__plot-scissors\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(scissorsRule).toBeDefined();
    expect(scissorsRule).toContain(
      'animation: garden-page-plot-scissors-snip 0.42s steps(2, end) infinite;',
    );
    expect(baseCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.garden-page__plot-scissors[\s\S]*animation:\s*none;/,
    );
  });

  it('shows zero-cost plot buys as free', () => {
    const parent = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const snapshot = gameplayFacade.getSnapshot();
    const manager = new GardenPlotManager({ gameplayFacade });

    snapshot.garden.plot.unlockedTiles = 0;
    snapshot.garden.plot.nextTileNumber = 1;
    snapshot.garden.plot.nextTileCost = 0;
    snapshot.garden.plot.tiles[0].unlocked = false;

    manager.mount(parent);

    const plotRow = parent.querySelector('.garden-page__plot-row');
    const boxNumber = plotRow.querySelector('.garden-page__plot-box-number');
    const boxLevel = plotRow.querySelector('.garden-page__plot-box-level');
    const boxLabel = plotRow.querySelector('.garden-page__plot-box-label');

    expect(plotRow.classList.contains('is-buy-slot')).toBe(true);
    expect(plotRow.querySelector('.garden-page__plot-action')?.textContent).toBe('buy free');
    expect(plotRow.querySelector('.garden-page__plot-box-action')?.textContent).toBe('buy free');
    expect(boxNumber?.textContent).toBe('');
    expect(boxNumber?.hidden).toBe(true);
    expect(boxLevel?.textContent).toBe('');
    expect(boxLevel?.hidden).toBe(true);
    expect(boxLevel?.getAttribute('aria-label')).toBeNull();
    expect(boxLabel?.textContent).toBe('');
    expect(plotRow.disabled).toBe(false);
  });

  it('keeps unaffordable plot buy prices disabled without coin color', () => {
    const parent = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const snapshot = gameplayFacade.getSnapshot();
    const manager = new GardenPlotManager({ gameplayFacade });

    snapshot.garden.plot.unlockedTiles = 0;
    snapshot.garden.plot.nextTileNumber = 1;
    snapshot.garden.plot.nextTileCost = 25;
    snapshot.garden.plot.tiles[0].unlocked = false;

    manager.mount(parent);

    const plotRow = parent.querySelector('.garden-page__plot-row');
    const actionLabel = plotRow.querySelector('.garden-page__plot-action-label');

    expect(plotRow.classList.contains('is-buy-slot')).toBe(true);
    expect(actionLabel?.textContent).toBe('buy 25 coin');
    expect(plotRow.disabled).toBe(true);
    expect(actionLabel?.getAttribute('data-resource-color')).toBeNull();

    snapshot.coin.current = 25;
    gameplayFacade.publish();

    expect(plotRow.disabled).toBe(false);
    expect(actionLabel?.getAttribute('data-resource-color')).toBe('coin');
  });

  it('marks a newly bought plot for one snap animation', () => {
    vi.useFakeTimers();

    const parent = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const snapshot = gameplayFacade.getSnapshot();
    const manager = new GardenPlotManager({ gameplayFacade });

    snapshot.coin.current = 1;
    snapshot.garden.plot.maxTiles = 2;
    snapshot.garden.plot.tileCosts = [0, 1];
    snapshot.garden.plot.nextTileNumber = 2;
    snapshot.garden.plot.nextTileCost = 1;
    snapshot.garden.plot.tiles.push({
      ...snapshot.garden.plot.tiles[0],
      tileNumber: 2,
      unlocked: false,
    });

    manager.mount(parent);

    const plotRows = [...parent.querySelectorAll('.garden-page__plot-row')];

    expect(plotRows[1].classList.contains('is-buy-slot')).toBe(true);

    plotRows[1].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(gameplayFacade.buyGardenTile).toHaveBeenCalledTimes(1);
    expect(plotRows[1].classList.contains('is-buy-slot')).toBe(false);
    expect(plotRows[1].classList.contains('is-newly-bought')).toBe(true);

    vi.advanceTimersByTime(260);

    expect(plotRows[1].classList.contains('is-newly-bought')).toBe(false);
  });

  it('keeps plant seed buttons stable between renders and plants mint seed', () => {
    const parent = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const manager = new GardenPlotManager({ gameplayFacade });

    manager.mount(parent);

    const plotRow = parent.querySelector('.garden-page__plot-row');
    plotRow
      .querySelector('.garden-page__plot-action')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(parent.querySelector('#garden-seed-dialog-title')?.textContent).toBe('choose seed');

    const mintButton = parent.querySelector('[aria-label="select mint seed, owned 1"]');

    expect(mintButton).not.toBeNull();
    expect(mintButton.dataset.resourceColor).toBe('seed');
    expect(mintButton.querySelector('.row_key')?.classList.contains('style-seed-label')).toBe(
      true,
    );
    expect(mintButton.querySelector('.style-seed-label__icon')).not.toBeNull();

    gameplayFacade.publish();

    expect(parent.querySelector('[aria-label="select mint seed, owned 1"]')).toBe(mintButton);

    mintButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(parent.querySelector('.garden-page__seed-popup').hidden).toBe(true);
    expect(plotRow.querySelector('.garden-page__plot-label')?.textContent).toBe('mint');
    expect(plotRow.querySelector('.garden-page__plot-label')?.dataset.resourceColor).toBe(
      'herb',
    );
    expect(plotRow.querySelector('.garden-page__plot-action')?.textContent).toBe('growing 12s');
    expect(plotRow.querySelector('.garden-page__plot-action-timer')?.textContent).toBe('12s');
  });

  it('targets the seed name text for tutorial guidance, not the quantity value', () => {
    const parent = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const manager = new GardenPlotManager({ gameplayFacade });

    manager.mount(parent);
    parent
      .querySelector('.garden-page__plot-action')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const seedTarget = parent.querySelector('[data-tutorial-id="garden:seed:mintSeed"]');
    const quantity = parent.querySelector('.garden-page__seed-button > .row_val');
    const button = seedTarget?.closest('.garden-page__seed-button');

    expect(seedTarget?.classList.contains('row_key')).toBe(true);
    expect(button?.dataset.tutorialId).toBeUndefined();
    expect(button?.textContent).toBe('mint seed1');
    expect(quantity?.dataset.tutorialId).toBeUndefined();
  });

  it('opens seed choices from selected seed text without planting', () => {
    const parent = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const snapshot = gameplayFacade.getSnapshot();
    const tile = snapshot.garden.plot.tiles[0];
    const manager = new GardenPlotManager({ gameplayFacade });

    Object.assign(tile, {
      selectedSeedItemTypeId: 2,
      selectedSeedKey: 'mintSeed',
      selectedSeedLabel: 'mint seed',
      phase: 'empty',
    });

    manager.mount(parent);

    const plotRow = parent.querySelector('.garden-page__plot-row');
    const labelText = plotRow
      .querySelector('.garden-page__plot-label .style-herb-label__text')
      ?.firstChild;

    labelText.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const popup = parent.querySelector('.garden-page__seed-popup');

    expect(popup.hidden).toBe(false);
    expect(tile.phase).toBe('empty');
    expect(plotRow.querySelector('.garden-page__plot-action')?.textContent).toBe('plant');

    popup.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    parent
      .querySelector('.garden-page__plot-action')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(tile.phase).toBe('growing');
    expect(plotRow.querySelector('.garden-page__plot-action')?.textContent).toBe('growing 12s');
  });

  it('plants from the full empty plot slot when a selected seed is plantable', () => {
    const parent = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const snapshot = gameplayFacade.getSnapshot();
    const tile = snapshot.garden.plot.tiles[0];
    const manager = new GardenPlotManager({ gameplayFacade });

    Object.assign(tile, {
      selectedSeedItemTypeId: 2,
      selectedSeedKey: 'mintSeed',
      selectedSeedLabel: 'mint seed',
      phase: 'empty',
    });

    manager.mount(parent);

    const plotRow = parent.querySelector('.garden-page__plot-row');
    plotRow
      .querySelector('.garden-page__plot-box-frame')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true, detail: 1 }));

    expect(parent.querySelector('.garden-page__seed-popup').hidden).toBe(true);
    expect(tile.phase).toBe('growing');
    expect(plotRow.querySelector('.garden-page__plot-action')?.textContent).toBe('growing 12s');
  });

  it('opens seed choices from selected seed text on touch press start', () => {
    const parent = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const snapshot = gameplayFacade.getSnapshot();
    const tile = snapshot.garden.plot.tiles[0];
    const manager = new GardenPlotManager({ gameplayFacade });

    Object.assign(tile, {
      selectedSeedItemTypeId: 2,
      selectedSeedKey: 'mintSeed',
      selectedSeedLabel: 'mint seed',
      phase: 'empty',
    });

    manager.mount(parent);

    const plotRow = parent.querySelector('.garden-page__plot-row');
    const labelText = plotRow.querySelector(
      '.garden-page__plot-label .style-herb-label__text',
    );

    dispatchTouchLikePressStart(labelText);

    const popup = parent.querySelector('.garden-page__seed-popup');

    expect(popup.hidden).toBe(false);
    expect(tile.phase).toBe('empty');
    expect(plotRow.querySelector('.garden-page__plot-action')?.textContent).toBe('plant');

    popup.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(popup.hidden).toBe(false);
  });

  it('opens seed choices from the visible box seed name on touch press start', () => {
    const parent = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const snapshot = gameplayFacade.getSnapshot();
    const tile = snapshot.garden.plot.tiles[0];
    const manager = new GardenPlotManager({ gameplayFacade });

    Object.assign(tile, {
      selectedSeedItemTypeId: 2,
      selectedSeedKey: 'mintSeed',
      selectedSeedLabel: 'mint seed',
      phase: 'empty',
    });

    manager.mount(parent);

    const plotRow = parent.querySelector('.garden-page__plot-row');
    const boxLabel = plotRow.querySelector('.garden-page__plot-box-label');

    dispatchTouchLikePressStart(boxLabel);

    const popup = parent.querySelector('.garden-page__seed-popup');

    expect(popup.hidden).toBe(false);
    expect(tile.phase).toBe('empty');
    expect(plotRow.classList.contains('is-selected')).toBe(true);
  });

  it('keeps selected seed text stable across renders so taps can open choices', () => {
    const parent = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const snapshot = gameplayFacade.getSnapshot();
    const tile = snapshot.garden.plot.tiles[0];
    const manager = new GardenPlotManager({ gameplayFacade });

    Object.assign(tile, {
      selectedSeedItemTypeId: 2,
      selectedSeedKey: 'mintSeed',
      selectedSeedLabel: 'mint seed',
      phase: 'empty',
    });

    manager.mount(parent);

    const labelText = parent.querySelector(
      '.garden-page__plot-label .style-herb-label__text',
    );

    expect(labelText).not.toBeNull();

    gameplayFacade.publish();

    expect(parent.querySelector('.garden-page__plot-label .style-herb-label__text')).toBe(
      labelText,
    );

    labelText.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(parent.querySelector('.garden-page__seed-popup').hidden).toBe(false);
    expect(tile.phase).toBe('empty');
  });

  it('selects a seed choice on touch release', () => {
    const parent = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const manager = new GardenPlotManager({ gameplayFacade });

    document.body.append(parent);
    manager.mount(parent);
    parent
      .querySelector('.garden-page__plot-action')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const mintButton = parent.querySelector('[aria-label="select mint seed, owned 1"]');

    dispatchTouchLikePressStart(mintButton);
    dispatchTouchLikePressEnd(mintButton);

    const plotRow = parent.querySelector('.garden-page__plot-row');

    expect(parent.querySelector('.garden-page__seed-popup').hidden).toBe(true);
    expect(plotRow.querySelector('.garden-page__plot-label')?.textContent).toBe('mint');
    expect(plotRow.querySelector('.garden-page__plot-action')?.textContent).toBe('growing 12s');

    manager.unmount();
    parent.remove();
  });

  it('does not select a seed choice when the seed picker touch scrolls', () => {
    const parent = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const manager = new GardenPlotManager({ gameplayFacade });

    document.body.append(parent);
    manager.mount(parent);
    parent
      .querySelector('.garden-page__plot-action')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const mintButton = parent.querySelector('[aria-label="select mint seed, owned 1"]');

    dispatchTouchLikePressStart(mintButton, { clientX: 10, clientY: 10 });
    document.dispatchEvent(createPointerEvent('pointermove', { clientX: 10, clientY: 32 }));
    dispatchTouchLikePressEnd(mintButton, { clientX: 10, clientY: 32 });

    const plotRow = parent.querySelector('.garden-page__plot-row');

    expect(parent.querySelector('.garden-page__seed-popup').hidden).toBe(false);
    expect(plotRow.querySelector('.garden-page__plot-label')?.textContent).toBe('empty');
    expect(plotRow.querySelector('.garden-page__plot-action')?.textContent).toBe('choose');

    manager.unmount();
    parent.remove();
  });

  it('ignores the retargeted plot click after touch-selecting a seed choice', () => {
    const parent = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const manager = new GardenPlotManager({ gameplayFacade });

    document.body.append(parent);
    manager.mount(parent);
    parent
      .querySelector('.garden-page__plot-action')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const mintButton = parent.querySelector('[aria-label="select mint seed, owned 1"]');

    dispatchTouchLikePressStart(mintButton);
    dispatchTouchLikePressEnd(mintButton);

    const plotRow = parent.querySelector('.garden-page__plot-row');
    plotRow.dispatchEvent(
      new window.MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }),
    );

    expect(parent.querySelector('.garden-page__cancel-popup').hidden).toBe(true);
    expect(parent.querySelector('.garden-page__seed-popup').hidden).toBe(true);
    expect(plotRow.querySelector('.garden-page__plot-action')?.textContent).toBe('growing 12s');

    manager.unmount();
    parent.remove();
  });

  it('shows the selected plot and seed while the seed picker is open', () => {
    const parent = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const snapshot = gameplayFacade.getSnapshot();
    const tile = snapshot.garden.plot.tiles[0];
    const manager = new GardenPlotManager({ gameplayFacade });

    Object.assign(tile, {
      selectedSeedItemTypeId: 2,
      selectedSeedKey: 'mintSeed',
      selectedSeedLabel: 'mint seed',
      phase: 'empty',
    });

    manager.mount(parent);

    const plotRow = parent.querySelector('.garden-page__plot-row');
    plotRow
      .querySelector('.garden-page__plot-label')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const popup = parent.querySelector('.garden-page__seed-popup');
    const emptyButton = parent.querySelector('[aria-label="set plot seed to empty"]');
    const mintButton = parent.querySelector('[aria-label="select mint seed, owned 1"]');

    expect(popup.hidden).toBe(false);
    expect(plotRow.classList.contains('is-selected')).toBe(true);
    expect(emptyButton.getAttribute('aria-pressed')).toBe('false');
    expect(mintButton.getAttribute('aria-pressed')).toBe('true');

    popup.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popup.hidden).toBe(true);
    expect(plotRow.classList.contains('is-selected')).toBe(false);
    expect(mintButton.getAttribute('aria-pressed')).toBe('false');
  });

  it('plants from the full right action slot when a tap misses the text', () => {
    const parent = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const snapshot = gameplayFacade.getSnapshot();
    const tile = snapshot.garden.plot.tiles[0];
    const manager = new GardenPlotManager({ gameplayFacade });

    Object.assign(tile, {
      selectedSeedItemTypeId: 2,
      selectedSeedKey: 'mintSeed',
      selectedSeedLabel: 'mint seed',
      phase: 'empty',
    });

    manager.mount(parent);

    const plotRow = parent.querySelector('.garden-page__plot-row');
    setPlotActionHitBox(plotRow);

    plotRow.dispatchEvent(
      new window.MouseEvent('click', {
        bubbles: true,
        detail: 1,
        clientX: 116,
        clientY: 10,
      }),
    );

    expect(parent.querySelector('.garden-page__seed-popup').hidden).toBe(true);
    expect(tile.phase).toBe('growing');
    expect(plotRow.querySelector('.garden-page__plot-action')?.textContent).toBe('growing 12s');
  });

  it('keeps blank row space inert when the selected seed count is empty', () => {
    const parent = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const snapshot = gameplayFacade.getSnapshot();
    const tile = snapshot.garden.plot.tiles[0];
    const manager = new GardenPlotManager({ gameplayFacade });

    Object.assign(tile, {
      selectedSeedItemTypeId: 1,
      selectedSeedKey: 'sageSeed',
      selectedSeedLabel: 'sage seed',
      phase: 'empty',
    });

    manager.mount(parent);

    const plotRow = parent.querySelector('.garden-page__plot-row');
    plotRow.dispatchEvent(new window.MouseEvent('click', { bubbles: true, detail: 1 }));

    expect(parent.querySelector('.garden-page__seed-popup').hidden).toBe(true);
    expect(plotRow.classList.contains('is-empty')).toBe(true);
    expect(plotRow.querySelector('.garden-page__plot-label')?.dataset.resourceColor).toBe(
      'herb',
    );
    expect(plotRow.querySelector('.garden-page__plot-action')?.textContent).toBe('no seeds');

    plotRow
      .querySelector('.garden-page__plot-label')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(parent.querySelector('.garden-page__seed-popup').hidden).toBe(false);
  });

  it('keeps selected empty plot herb labels in resource color', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const suppressionIndex = baseCss.indexOf(
      '[data-resource-color] {\n  color: inherit;',
    );
    const overrideIndex = baseCss.indexOf(
      '.garden-page__plot-row.is-empty\n  .garden-page__plot-label[data-resource-color="herb"]',
    );
    const rule = baseCss.match(
      /\.garden-page__plot-row\.is-empty\s+\.garden-page__plot-label\[data-resource-color="herb"\]\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(suppressionIndex).toBeGreaterThan(-1);
    expect(overrideIndex).toBeGreaterThan(suppressionIndex);
    expect(rule).toBeDefined();
    expect(rule).toMatch(/\bcolor:\s*var\(--style-resource-herb\);/);
  });

  it('keeps plot notification dots on the text row instead of progress rails', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const genericRuleIndex = baseCss.indexOf(
      ':where(button, [role="button"])[data-notification="true"]::before',
    );
    const plotRuleIndex = baseCss.indexOf(
      '.garden-page__plot-row[data-notification="true"]::before',
    );
    const rule = baseCss.match(
      /\.garden-page__plot-row\[data-notification="true"\]::before\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(genericRuleIndex).toBeGreaterThan(-1);
    expect(plotRuleIndex).toBeGreaterThan(genericRuleIndex);
    expect(rule).toBeDefined();
    expect(rule).toContain('top: calc(');
    expect(rule).toContain('var(--style-row-min-height)');
    expect(rule).toContain('var(--style-notification-size)');
  });

  it('keeps choose-seed rows compact without emphasized row labels', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const buttonRule = baseCss.match(
      /\.garden-page__seed-button\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const emphasisRule = baseCss.match(
      /\.garden-page__seed-button:hover \.row_key,\s*\.garden-page__seed-button:focus \.row_key,\s*\.garden-page__seed-button\[aria-pressed="true"\] \.row_key\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(buttonRule).toBeDefined();
    expect(buttonRule).toMatch(/\bdisplay:\s*grid;/);
    expect(buttonRule).toMatch(/\bmin-height:\s*var\(--style-row-min-height\);/);
    expect(buttonRule).toMatch(/\bpadding:\s*0;/);
    expect(emphasisRule).toBeDefined();
    expect(emphasisRule).toMatch(/\bfont-weight:\s*normal;/);
    expect(baseCss).not.toContain('.garden-page__seed-button:not(:disabled) .row_key');
  });

  it('confirms canceling active plot progress and returns the seed', () => {
    const parent = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const manager = new GardenPlotManager({ gameplayFacade });

    manager.mount(parent);

    const plotRow = parent.querySelector('.garden-page__plot-row');
    plotRow
      .querySelector('.garden-page__plot-action')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    parent
      .querySelector('[aria-label="select mint seed, owned 1"]')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const cancelPopup = parent.querySelector('.garden-page__cancel-popup');

    plotRow.dispatchEvent(
      new window.MouseEvent('click', {
        bubbles: true,
        detail: 1,
        clientX: 1,
        clientY: 1,
      }),
    );

    expect(cancelPopup.hidden).toBe(false);
    expect(cancelPopup.querySelector('#garden-cancel-dialog-title')?.textContent).toBe(
      'cancel progress?',
    );
    expect(cancelPopup.querySelector('.garden-page__cancel-message')?.textContent).toBe(
      'are you sure you want to empty plot 1? mint seed will be returned.',
    );

    cancelPopup
      .querySelector('.garden-page__cancel-keep')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(cancelPopup.hidden).toBe(true);
    expect(plotRow.querySelector('.garden-page__plot-label')?.textContent).toBe('mint');

    plotRow
      .querySelector('.garden-page__plot-action')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(cancelPopup.querySelector('.garden-page__cancel-confirm')?.textContent).toBe('empty');
    cancelPopup
      .querySelector('.garden-page__cancel-confirm')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(cancelPopup.hidden).toBe(true);
    expect(plotRow.querySelector('.garden-page__plot-label')?.textContent).toBe('empty');
    expect(plotRow.querySelector('.garden-page__plot-action')?.textContent).toBe('choose');
    expect(plotRow.querySelector('.garden-page__plot-progress')?.hidden).toBe(true);
    expect(gameplayFacade.getSnapshot().garden.seeds[0]).toMatchObject({
      label: 'mint seed',
      quantity: 1,
    });
  });

  it('opens cancel from the visible plot name and returns to seed choices after confirming', () => {
    const parent = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const manager = new GardenPlotManager({ gameplayFacade });

    manager.mount(parent);

    const plotRow = parent.querySelector('.garden-page__plot-row');
    plotRow
      .querySelector('.garden-page__plot-action')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    parent
      .querySelector('[aria-label="select mint seed, owned 1"]')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const cancelPopup = parent.querySelector('.garden-page__cancel-popup');
    const seedPopup = parent.querySelector('.garden-page__seed-popup');

    plotRow
      .querySelector('.garden-page__plot-box-label')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true, detail: 1 }));

    expect(cancelPopup.hidden).toBe(false);
    expect(seedPopup.hidden).toBe(true);
    expect(cancelPopup.querySelector('.garden-page__cancel-message')?.textContent).toBe(
      'are you sure you want to empty plot 1? mint seed will be returned.',
    );

    cancelPopup
      .querySelector('.garden-page__cancel-confirm')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(cancelPopup.hidden).toBe(true);
    expect(seedPopup.hidden).toBe(false);
    expect(plotRow.classList.contains('is-selected')).toBe(true);
    expect(plotRow.querySelector('.garden-page__plot-label')?.textContent).toBe('empty');
    expect(plotRow.querySelector('.garden-page__plot-action')?.textContent).toBe('choose');
    expect(gameplayFacade.getSnapshot().garden.seeds[0]).toMatchObject({
      label: 'mint seed',
      quantity: 1,
    });
  });

  it('does not reopen seed choices after keeping a name cancel and canceling from the action', () => {
    const parent = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const manager = new GardenPlotManager({ gameplayFacade });

    manager.mount(parent);

    const plotRow = parent.querySelector('.garden-page__plot-row');
    plotRow
      .querySelector('.garden-page__plot-action')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    parent
      .querySelector('[aria-label="select mint seed, owned 1"]')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const cancelPopup = parent.querySelector('.garden-page__cancel-popup');
    const seedPopup = parent.querySelector('.garden-page__seed-popup');

    plotRow
      .querySelector('.garden-page__plot-box-label')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true, detail: 1 }));
    cancelPopup
      .querySelector('.garden-page__cancel-keep')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    plotRow
      .querySelector('.garden-page__plot-action')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    cancelPopup
      .querySelector('.garden-page__cancel-confirm')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(seedPopup.hidden).toBe(true);
    expect(plotRow.querySelector('.garden-page__plot-label')?.textContent).toBe('empty');
    expect(gameplayFacade.getSnapshot().garden.seeds[0]).toMatchObject({
      label: 'mint seed',
      quantity: 1,
    });
  });

  it('opens cancel when a harvesting plot body is clicked', () => {
    const parent = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const manager = new GardenPlotManager({ gameplayFacade });
    const tile = gameplayFacade.getSnapshot().garden.plot.tiles[0];

    Object.assign(tile, {
      selectedSeedItemTypeId: 1,
      selectedSeedKey: 'sageSeed',
      selectedSeedLabel: 'sage seed',
      seedItemTypeId: 1,
      seedKey: 'sageSeed',
      seedLabel: 'sage seed',
      herbItemTypeId: 1001,
      herbKey: 'sageHerb',
      herbLabel: 'sage',
      phase: 'harvesting',
      totalMs: 3_000,
      remainingMs: 3_000,
      progress: 0,
      process: {
        phase: 'harvesting',
        totalMs: 3_000,
        remainingMs: 3_000,
        progress: 0,
      },
    });

    manager.mount(parent);

    const plotRow = parent.querySelector('.garden-page__plot-row');
    const cancelPopup = parent.querySelector('.garden-page__cancel-popup');

    plotRow.dispatchEvent(
      new window.MouseEvent('click', {
        bubbles: true,
        detail: 1,
        clientX: 1,
        clientY: 1,
      }),
    );

    expect(cancelPopup.hidden).toBe(false);
    expect(cancelPopup.querySelector('.garden-page__cancel-message')?.textContent).toBe(
      'are you sure you want to empty plot 1? sage seed will be returned.',
    );
  });

  it('shows unresearched seed choices as locked and grays zero-count researched seeds', () => {
    const parent = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const snapshot = gameplayFacade.getSnapshot();
    const manager = new GardenPlotManager({ gameplayFacade });

    snapshot.research = {
      completedResearchIds: ['unlockSeed:sageSeed', 'unlockSeed:mintSeed'],
      boxes: [],
    };
    snapshot.garden.seeds = [
      {
        itemTypeId: 2,
        key: 'mintSeed',
        label: 'mint seed',
        kind: 'seed',
        quantity: 1,
      },
      {
        itemTypeId: 3,
        key: 'nettleSeed',
        label: 'nettle seed',
        kind: 'seed',
        quantity: 0,
      },
      {
        itemTypeId: 1,
        key: 'sageSeed',
        label: 'sage seed',
        kind: 'seed',
        quantity: 0,
      },
    ];

    manager.mount(parent);
    parent
      .querySelector('.garden-page__plot-action')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const buttons = [...parent.querySelectorAll('.garden-page__seed-button')];
    const divider = parent.querySelector('.garden-page__seed-divider');
    const findRow = (label) =>
      [...parent.querySelectorAll('.garden-page__seed-row')].find(
        (row) => row.querySelector('.row_key')?.textContent === label,
      );

    expect(buttons.map((button) => button.textContent)).toEqual([
      'empty',
      'mint seed1',
      'sage seed0',
    ]);
    expect(divider).toBeNull();
    expect(findRow('sage seed')?.classList.contains('is-empty')).toBe(true);
    expect(findRow('sage seed')?.classList.contains('is-unresearched')).toBe(false);
    expect(findRow('nettle seed')).toBeUndefined();
    expect(findRow('sage seed')?.querySelector('.garden-page__seed-button')?.disabled).toBe(false);
  });

  it('shows the harvest timer next to the harvesting label', () => {
    const parent = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const manager = new GardenPlotManager({ gameplayFacade });
    const tile = gameplayFacade.getSnapshot().garden.plot.tiles[0];

    Object.assign(tile, {
      selectedSeedItemTypeId: 1,
      selectedSeedKey: 'sageSeed',
      selectedSeedLabel: 'sage seed',
      seedItemTypeId: 1,
      seedKey: 'sageSeed',
      seedLabel: 'sage seed',
      herbItemTypeId: 1001,
      herbKey: 'sageHerb',
      herbLabel: 'sage',
      phase: 'ready',
      totalMs: 0,
      remainingMs: 0,
      progress: 0,
      process: null,
    });

    manager.mount(parent);

    const plotRow = parent.querySelector('.garden-page__plot-row');
    plotRow
      .querySelector('.garden-page__plot-action')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(plotRow.querySelector('.garden-page__plot-action')?.textContent).toBe('harvesting 3s');
    expect(plotRow.querySelector('.garden-page__plot-action-label')?.textContent).toBe(
      'harvesting',
    );
    expect(plotRow.querySelector('.garden-page__plot-action-timer')?.textContent).toBe('3s');
  });

  it('starts harvest when a ready plot plant is clicked', () => {
    const parent = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const manager = new GardenPlotManager({ gameplayFacade });
    const tile = gameplayFacade.getSnapshot().garden.plot.tiles[0];

    Object.assign(tile, {
      selectedSeedItemTypeId: 1,
      selectedSeedKey: 'sageSeed',
      selectedSeedLabel: 'sage seed',
      seedItemTypeId: 1,
      seedKey: 'sageSeed',
      seedLabel: 'sage seed',
      herbItemTypeId: 1001,
      herbKey: 'sageHerb',
      herbLabel: 'sage',
      phase: 'ready',
      totalMs: 0,
      remainingMs: 0,
      progress: 1,
      process: null,
    });

    manager.mount(parent);

    const plotRow = parent.querySelector('.garden-page__plot-row');
    plotRow
      .querySelector('.garden-page__plot-plant')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(tile.phase).toBe('harvesting');
    expect(plotRow.querySelector('.garden-page__plot-action')?.textContent).toBe('harvesting 3s');
  });

  it('starts harvest when a ready plot box frame is clicked beside the plant', () => {
    const parent = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const manager = new GardenPlotManager({ gameplayFacade });
    const tile = gameplayFacade.getSnapshot().garden.plot.tiles[0];

    Object.assign(tile, {
      selectedSeedItemTypeId: 1,
      selectedSeedKey: 'sageSeed',
      selectedSeedLabel: 'sage seed',
      seedItemTypeId: 1,
      seedKey: 'sageSeed',
      seedLabel: 'sage seed',
      herbItemTypeId: 1001,
      herbKey: 'sageHerb',
      herbLabel: 'sage',
      phase: 'ready',
      totalMs: 0,
      remainingMs: 0,
      progress: 1,
      process: null,
    });

    manager.mount(parent);

    const plotRow = parent.querySelector('.garden-page__plot-row');
    plotRow
      .querySelector('.garden-page__plot-box-frame')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(tile.phase).toBe('harvesting');
    expect(plotRow.querySelector('.garden-page__plot-action')?.textContent).toBe('harvesting 3s');
  });

  it('shows full progress when a plot can be harvested', () => {
    const parent = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const manager = new GardenPlotManager({ gameplayFacade });
    const tile = gameplayFacade.getSnapshot().garden.plot.tiles[0];

    Object.assign(tile, {
      selectedSeedItemTypeId: 1,
      selectedSeedKey: 'sageSeed',
      selectedSeedLabel: 'sage seed',
      seedItemTypeId: 1,
      seedKey: 'sageSeed',
      seedLabel: 'sage seed',
      herbItemTypeId: 1001,
      herbKey: 'sageHerb',
      herbLabel: 'sage',
      phase: 'ready',
      totalMs: 0,
      remainingMs: 0,
      progress: 1,
      process: null,
    });

    manager.mount(parent);

    const plotRow = parent.querySelector('.garden-page__plot-row');
    const boxFrame = plotRow.querySelector('.garden-page__plot-box-frame');

    expect(plotRow.querySelector('.garden-page__plot-action')?.textContent).toBe('harvest');
    expect(boxFrame?.classList.contains('is-ready')).toBe(true);
    expect(boxFrame?.style.getPropertyValue('--garden-page-plot-ready-delay')).toBe('0ms');
    expect(plotRow.querySelector('.garden-page__plot-progress')?.hidden).toBe(false);
    expect(plotRow.querySelector('.garden-page__plot-progress-fill')?.style.transform).toBe(
      'scaleX(1)',
    );
    expect(plotRow.querySelector('.garden-page__plot-progress-text')?.textContent).toBe('');
  });
});
