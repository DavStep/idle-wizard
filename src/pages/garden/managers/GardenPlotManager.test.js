// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { GardenPlotManager } from './GardenPlotManager.js';

function createGameplayFacadeFake() {
  const listeners = new Set();
  const herbsBySeedId = new Map([
    [1, { itemTypeId: 1001, key: 'sageHerb', label: 'Sage' }],
    [2, { itemTypeId: 1002, key: 'mintHerb', label: 'Mint' }],
    [3, { itemTypeId: 1003, key: 'nettleHerb', label: 'Nettle' }],
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
          label: 'Mint Seed',
          kind: 'seed',
          quantity: 1,
        },
        {
          itemTypeId: 3,
          key: 'nettleSeed',
          label: 'Nettle Seed',
          kind: 'seed',
          quantity: 6,
        },
        {
          itemTypeId: 1,
          key: 'sageSeed',
          label: 'Sage Seed',
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
      tile.totalMs = 60_000;
      tile.remainingMs = 60_000;
      tile.progress = 0;
      tile.process = {
        phase: 'growing',
        totalMs: 60_000,
        remainingMs: 60_000,
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
  };

  return gameplayFacade;
}

describe('GardenPlotManager', () => {
  it('keeps plant seed buttons stable between renders and plants Mint Seed', () => {
    const parent = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const manager = new GardenPlotManager({ gameplayFacade });

    manager.mount(parent);

    const plotRow = parent.querySelector('.garden-page__plot-row');
    plotRow.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const mintButton = parent.querySelector('[aria-label="select Mint Seed, owned 1"]');

    expect(mintButton).not.toBeNull();

    gameplayFacade.publish();

    expect(parent.querySelector('[aria-label="select Mint Seed, owned 1"]')).toBe(mintButton);

    mintButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(parent.querySelector('.garden-page__seed-popup').hidden).toBe(true);
    expect(plotRow.querySelector('.garden-page__plot-label')?.textContent).toBe('Mint Seed');
    expect(plotRow.querySelector('.garden-page__plot-action')?.textContent).toBe('growing 60s');
    expect(plotRow.querySelector('.garden-page__plot-action-timer')?.textContent).toBe('60s');
  });

  it('shows the harvest timer next to the harvesting label', () => {
    const parent = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake();
    const manager = new GardenPlotManager({ gameplayFacade });
    const tile = gameplayFacade.getSnapshot().garden.plot.tiles[0];

    Object.assign(tile, {
      selectedSeedItemTypeId: 1,
      selectedSeedKey: 'sageSeed',
      selectedSeedLabel: 'Sage Seed',
      seedItemTypeId: 1,
      seedKey: 'sageSeed',
      seedLabel: 'Sage Seed',
      herbItemTypeId: 1001,
      herbKey: 'sageHerb',
      herbLabel: 'Sage',
      phase: 'ready',
      totalMs: 0,
      remainingMs: 0,
      progress: 0,
      process: null,
    });

    manager.mount(parent);

    const plotRow = parent.querySelector('.garden-page__plot-row');
    plotRow.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

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
      selectedSeedLabel: 'Sage Seed',
      seedItemTypeId: 1,
      seedKey: 'sageSeed',
      seedLabel: 'Sage Seed',
      herbItemTypeId: 1001,
      herbKey: 'sageHerb',
      herbLabel: 'Sage',
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
