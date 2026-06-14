// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { GardenPlotManager } from './GardenPlotManager.js';

function createGameplayFacadeFake() {
  const listeners = new Set();
  const herbsBySeedId = new Map([
    [1, { itemTypeId: 1001, key: 'sageHerb', label: 'sage' }],
    [2, { itemTypeId: 1002, key: 'mintHerb', label: 'mint' }],
    [3, { itemTypeId: 1003, key: 'nettleHerb', label: 'nettle' }],
  ]);
  const snapshot = {
    gold: {
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
        harvestSeconds: 10,
        tiles: [
          {
            tileNumber: 1,
            unlocked: true,
            selectedSeedItemTypeId: null,
            selectedSeedKey: null,
            selectedSeedLabel: null,
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
      tile.seedItemTypeId = seed.itemTypeId;
      tile.seedKey = seed.key;
      tile.seedLabel = seed.label;
      tile.herbItemTypeId = herb.itemTypeId;
      tile.herbKey = herb.key;
      tile.herbLabel = herb.label;
      tile.phase = 'growing';
      tile.totalMs = 20_000;
      tile.remainingMs = 20_000;
      tile.progress = 0;
      tile.process = {
        phase: 'growing',
        totalMs: 20_000,
        remainingMs: 20_000,
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
        publish();
        return { ok: true, planted: false };
      }

      const seed = snapshot.garden.seeds.find((candidate) => candidate.itemTypeId === seedTypeId);

      if (!seed) {
        return { ok: false };
      }

      tile.selectedSeedItemTypeId = seed.itemTypeId;
      tile.selectedSeedKey = seed.key;
      tile.selectedSeedLabel = seed.label;

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
    startGardenHarvest: (tileNumber) => {
      const tile = snapshot.garden.plot.tiles[tileNumber - 1];

      if (!tile || tile.phase !== 'ready') {
        return { ok: false };
      }

      tile.phase = 'harvesting';
      tile.totalMs = 10_000;
      tile.remainingMs = 10_000;
      tile.progress = 0;
      tile.process = {
        phase: 'harvesting',
        totalMs: 10_000,
        remainingMs: 10_000,
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

describe('GardenPlotManager', () => {
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

    expect(plotRow.querySelector('.garden-page__plot-action')?.textContent).toBe('buy free');
    expect(plotRow.disabled).toBe(false);
  });

  it('keeps unaffordable plot buy prices disabled without gold color', () => {
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

    expect(actionLabel?.textContent).toBe('buy 25 gold');
    expect(plotRow.disabled).toBe(true);
    expect(actionLabel?.getAttribute('data-resource-color')).toBeNull();

    snapshot.gold.current = 25;
    gameplayFacade.publish();

    expect(plotRow.disabled).toBe(false);
    expect(actionLabel?.getAttribute('data-resource-color')).toBe('gold');
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

    gameplayFacade.publish();

    expect(parent.querySelector('[aria-label="select mint seed, owned 1"]')).toBe(mintButton);

    mintButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(parent.querySelector('.garden-page__seed-popup').hidden).toBe(true);
    expect(plotRow.querySelector('.garden-page__plot-label')?.textContent).toBe('mint seed');
    expect(plotRow.querySelector('.garden-page__plot-label')?.dataset.resourceColor).toBe(
      'seed',
    );
    expect(plotRow.querySelector('.garden-page__plot-action')?.textContent).toBe('growing 20s');
    expect(plotRow.querySelector('.garden-page__plot-action-timer')?.textContent).toBe('20s');
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
    plotRow.dispatchEvent(new window.MouseEvent('click', { bubbles: true, detail: 1 }));

    expect(parent.querySelector('.garden-page__seed-popup').hidden).toBe(true);
    expect(tile.phase).toBe('empty');

    const labelText = plotRow
      .querySelector('.garden-page__plot-label .style-seed-label__text')
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
    expect(plotRow.querySelector('.garden-page__plot-action')?.textContent).toBe('growing 20s');
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
      '.garden-page__plot-label .style-seed-label__text',
    );

    expect(labelText).not.toBeNull();

    gameplayFacade.publish();

    expect(parent.querySelector('.garden-page__plot-label .style-seed-label__text')).toBe(
      labelText,
    );

    labelText.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(parent.querySelector('.garden-page__seed-popup').hidden).toBe(false);
    expect(tile.phase).toBe('empty');
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
    expect(plotRow.querySelector('.garden-page__plot-action')?.textContent).toBe('growing 20s');
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
    expect(plotRow.querySelector('.garden-page__plot-action')?.textContent).toBe('no seeds');

    plotRow
      .querySelector('.garden-page__plot-label')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(parent.querySelector('.garden-page__seed-popup').hidden).toBe(false);
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

    plotRow
      .querySelector('.garden-page__plot-label')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true, detail: 1 }));

    expect(cancelPopup.hidden).toBe(true);

    plotRow
      .querySelector('.garden-page__plot-action')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(cancelPopup.hidden).toBe(false);
    expect(cancelPopup.querySelector('#garden-cancel-dialog-title')?.textContent).toBe(
      'cancel progress?',
    );
    expect(cancelPopup.querySelector('.garden-page__cancel-message')?.textContent).toBe(
      'return mint seed and empty plot 1.',
    );

    cancelPopup
      .querySelector('.garden-page__cancel-keep')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(cancelPopup.hidden).toBe(true);
    expect(plotRow.querySelector('.garden-page__plot-label')?.textContent).toBe('mint seed');

    plotRow
      .querySelector('.garden-page__plot-action')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(cancelPopup.querySelector('.garden-page__cancel-confirm')?.textContent).toBe('yes');
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

    expect(plotRow.querySelector('.garden-page__plot-action')?.textContent).toBe('harvesting 10s');
    expect(plotRow.querySelector('.garden-page__plot-action-label')?.textContent).toBe(
      'harvesting',
    );
    expect(plotRow.querySelector('.garden-page__plot-action-timer')?.textContent).toBe('10s');
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

    expect(plotRow.querySelector('.garden-page__plot-action')?.textContent).toBe('harvest');
    expect(plotRow.querySelector('.garden-page__plot-progress')?.hidden).toBe(false);
    expect(plotRow.querySelector('.garden-page__plot-progress-fill')?.style.width).toBe('100%');
    expect(plotRow.querySelector('.garden-page__plot-progress-text')?.textContent).toBe('');
  });
});
