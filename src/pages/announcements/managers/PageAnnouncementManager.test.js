// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';

import { PageAnnouncementManager } from './PageAnnouncementManager.js';

const managers = new Set();

afterEach(() => {
  for (const manager of managers) {
    manager.unmount();
  }

  managers.clear();
});

function createGameplayFacadeFake(snapshot, { emitInitial = true } = {}) {
  const listeners = new Set();

  return {
    getSnapshot: () => snapshot,
    publishSnapshot: () => {
      for (const listener of listeners) {
        listener(snapshot);
      }
    },
    subscribe: (listener) => {
      listeners.add(listener);
      if (emitInitial) {
        listener(snapshot);
      }
      return () => listeners.delete(listener);
    },
  };
}

function createSnapshot() {
  return {
    tasks: {
      currentLevel: 1,
    },
    playerLevel: {
      currentLevel: 1,
      levels: [
        {
          level: 1,
          current: true,
          unlocked: true,
          totals: {
            maxGardenTiles: 2,
            maxManaCap: 50,
            manaPerSecond: 1,
          },
          effects: [],
        },
        {
          level: 2,
          current: false,
          unlocked: false,
          totals: {
            maxGardenTiles: 3,
            maxManaCap: 100,
            manaPerSecond: 2,
          },
          effects: ['crystal reward 1'],
        },
      ],
    },
    research: {
      completedResearchIds: [],
      tabs: [
        {
          id: 'regular',
          label: 'regular research',
          boxes: [
            {
              id: 'recipes',
              label: 'recipe unlocks research',
              researches: [
                {
                  id: 'unlockRecipe:manaTonic',
                  label: 'mana tonic',
                  value: 'brew',
                  effect: 'brew',
                  completed: false,
                },
              ],
            },
          ],
        },
      ],
    },
  };
}

function mountManager(snapshot) {
  const stage = document.createElement('section');
  const gameplayFacade = createGameplayFacadeFake(snapshot);
  const manager = new PageAnnouncementManager({ gameplayFacade, displayMs: 10_000 });
  managers.add(manager);
  manager.mount(stage);
  return { gameplayFacade, manager, stage };
}

function mountManagerWithGameplayFacade(gameplayFacade) {
  const stage = document.createElement('section');
  const manager = new PageAnnouncementManager({ gameplayFacade, displayMs: 10_000 });
  managers.add(manager);
  manager.mount(stage);
  return { manager, stage };
}

describe('PageAnnouncementManager', () => {
  it('shows a full-screen level-up announcement after level increases', () => {
    const snapshot = createSnapshot();
    const { gameplayFacade, stage } = mountManager(snapshot);

    expect(stage.querySelector('.room-announcement-layer')?.hidden).toBe(true);

    snapshot.tasks.currentLevel = 2;
    snapshot.playerLevel.currentLevel = 2;
    gameplayFacade.publishSnapshot();

    const layer = stage.querySelector('.room-announcement-layer');
    expect(layer?.hidden).toBe(false);
    expect(stage.querySelector('.room-announcement')?.classList.contains('style-dialog')).toBe(
      false,
    );
    expect(stage.querySelector('.room-announcement__close')).toBeNull();
    expect(stage.querySelector('.room-announcement__title')?.textContent).toBe('level up!');
    expect(stage.querySelector('.room-announcement__level-flow')?.textContent).toBe('level 1> 2');
    expect(stage.querySelector('.room-announcement__level-from')?.textContent).toBe('level 1');
    expect(stage.querySelector('.room-announcement__level-to')?.textContent).toBe('> 2');
    expect(
      [...stage.querySelectorAll('.room-announcement__row')].map((row) => [
        row.querySelector('.room-announcement__row-label')?.textContent,
        row.querySelector('.room-announcement__row-value')?.textContent,
      ]),
    ).toEqual([
      ['unlocks', 'garden'],
      ['garden plots', '+1'],
      ['mana cap', '+50'],
      ['mana regen', '+1/sec'],
      ['crystal', '+1'],
    ]);
  });

  it('captures the saved level baseline when subscriptions do not emit immediately', () => {
    const snapshot = createSnapshot();
    const gameplayFacade = createGameplayFacadeFake(snapshot, { emitInitial: false });
    const { stage } = mountManagerWithGameplayFacade(gameplayFacade);

    expect(stage.querySelector('.room-announcement-layer')?.hidden).toBe(true);

    snapshot.tasks.currentLevel = 2;
    snapshot.playerLevel.currentLevel = 2;
    gameplayFacade.publishSnapshot();

    expect(stage.querySelector('.room-announcement-layer')?.hidden).toBe(false);
    expect(stage.querySelector('.room-announcement__level-flow')?.textContent).toBe('level 1> 2');
  });

  it('keeps announcements open until the timed flow completes', () => {
    const snapshot = createSnapshot();
    const { gameplayFacade, stage } = mountManager(snapshot);

    snapshot.tasks.currentLevel = 2;
    snapshot.playerLevel.currentLevel = 2;
    gameplayFacade.publishSnapshot();

    const layer = stage.querySelector('.room-announcement-layer');
    layer.click();
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));

    expect(layer.hidden).toBe(false);
  });

  it('shows completed research with a silhouette and actual icon', () => {
    const snapshot = createSnapshot();
    const { gameplayFacade, stage } = mountManager(snapshot);
    const research = snapshot.research.tabs[0].boxes[0].researches[0];

    research.completed = true;
    research.value = 'researched';
    snapshot.research.completedResearchIds = [research.id];
    gameplayFacade.publishSnapshot();

    expect(stage.querySelector('.room-announcement-layer')?.hidden).toBe(false);
    expect(stage.querySelector('.room-announcement__title')?.textContent).toBe(
      'research complete',
    );
    expect(stage.querySelector('.room-announcement__research-label')?.textContent).toBe(
      'mana tonic',
    );
    expect(stage.querySelector('.room-announcement__research-detail')?.textContent).toBe('brew');
    expect(
      stage
        .querySelector('.room-announcement__research-silhouette')
        ?.getAttribute('data-asset-atlas-frame'),
    ).toBe('potion:manaTonic');
    expect(
      stage
        .querySelector('.room-announcement__research-icon')
        ?.getAttribute('data-asset-atlas-frame'),
    ).toBe('potion:manaTonic');
  });
});
