// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { PageAnnouncementManager } from './PageAnnouncementManager.js';

const managers = new Set();

afterEach(() => {
  for (const manager of managers) {
    manager.unmount();
  }

  managers.clear();
  vi.useRealTimers();
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
    persistence: {
      loadRevision: 0,
    },
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

  it('keeps multi-level unlock announcements in a stable row layout', () => {
    const snapshot = createSnapshot();
    const { gameplayFacade, stage } = mountManager(snapshot);

    snapshot.tasks.currentLevel = 10;
    snapshot.playerLevel.currentLevel = 10;
    gameplayFacade.publishSnapshot();

    const unlockRow = stage.querySelector('.room-announcement__row');
    expect(unlockRow?.classList.contains('room-announcement__row--list')).toBe(true);
    expect(unlockRow?.querySelector('.room-announcement__row-label')?.textContent).toBe(
      'unlocks',
    );
    expect(unlockRow?.querySelector('.room-announcement__row-value')?.textContent).toBe(
      'garden / research / brewing / prestige / leaderboard / discoveries / alliance / inbox',
    );
  });

  it('allows long announcement values to wrap without collapsing labels', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const rowRule = baseCss.match(/\.room-announcement__row\s*\{(?<body>[^}]*)\}/)?.groups
      ?.body;
    const valueRule = baseCss.match(
      /\.room-announcement__row-value\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(rowRule).toContain('grid-template-columns: minmax(72px, 0.8fr) minmax(0, 1.2fr);');
    expect(valueRule).toContain('min-width: 0;');
    expect(valueRule).toContain('overflow-wrap: break-word;');
    expect(valueRule).toContain('white-space: normal;');
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

  it('does not replay saved level and research announcements after persistence hydration', () => {
    const snapshot = createSnapshot();
    const { gameplayFacade, stage } = mountManager(snapshot);
    const research = snapshot.research.tabs[0].boxes[0].researches[0];

    snapshot.persistence.loadRevision = 1;
    snapshot.tasks.currentLevel = 2;
    snapshot.playerLevel.currentLevel = 2;
    research.completed = true;
    research.value = 'researched';
    snapshot.research.completedResearchIds = [research.id];
    gameplayFacade.publishSnapshot();

    expect(stage.querySelector('.room-announcement-layer')?.hidden).toBe(true);

    snapshot.tasks.currentLevel = 3;
    snapshot.playerLevel.currentLevel = 3;
    gameplayFacade.publishSnapshot();

    expect(stage.querySelector('.room-announcement-layer')?.hidden).toBe(false);
    expect(stage.querySelector('.room-announcement__title')?.textContent).toBe('level up!');
    expect(stage.querySelector('.room-announcement__level-flow')?.textContent).toBe('level 2> 3');
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

  it('auto-advances announcements after the faster default display window', () => {
    vi.useFakeTimers();

    const snapshot = createSnapshot();
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake(snapshot);
    const manager = new PageAnnouncementManager({ gameplayFacade });
    managers.add(manager);
    manager.mount(stage);

    snapshot.tasks.currentLevel = 2;
    snapshot.playerLevel.currentLevel = 2;
    gameplayFacade.publishSnapshot();

    const layer = stage.querySelector('.room-announcement-layer');
    expect(layer?.hidden).toBe(false);

    vi.advanceTimersByTime(2099);
    expect(layer?.hidden).toBe(false);

    vi.advanceTimersByTime(1);
    expect(layer?.hidden).toBe(true);
  });

  it('uses x2 faster announcement animation timings', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');

    expect(baseCss).toContain('animation: room-announcement-panel-enter 130ms');
    expect(baseCss).toContain('animation: room-announcement-title-flyout 450ms');
    expect(baseCss).toContain('animation: room-announcement-level-from-sequence 580ms');
    expect(baseCss).toContain('var(--style-motion-ease-rubber) 320ms both;');
    expect(baseCss).toContain('animation: room-announcement-level-to-enter 270ms');
    expect(baseCss).toContain('var(--style-motion-ease-rubber) 720ms both;');
    expect(baseCss).toContain(
      'calc(970ms + (var(--room-announcement-row-index, 0) * 55ms)) both;',
    );
    expect(baseCss).toContain('animation: room-announcement-research-icon 390ms');
    expect(baseCss).toContain('var(--style-motion-ease-rubber) 180ms both;');
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

  it('shows the seed icon on completed seed research packs', () => {
    const snapshot = createSnapshot();
    snapshot.research.tabs[0].boxes[0].researches[0] = {
      id: 'unlockSeed:mintSeed',
      label: 'mint seed',
      value: 'grow mint',
      effect: 'grow mint',
      completed: false,
    };
    const { gameplayFacade, stage } = mountManager(snapshot);
    const research = snapshot.research.tabs[0].boxes[0].researches[0];

    research.completed = true;
    research.value = 'researched';
    snapshot.research.completedResearchIds = [research.id];
    gameplayFacade.publishSnapshot();

    const icon = stage.querySelector('.room-announcement__research-icon');
    expect(
      stage
        .querySelector('.room-announcement__research-silhouette')
        ?.getAttribute('data-asset-atlas-frame'),
    ).toBe('seed:regular');
    expect(icon?.classList.contains('style-seed-pack-composite')).toBe(true);
    expect(icon?.getAttribute('data-asset-atlas-frame')).toBe('seed:regular');
    expect(icon?.getAttribute('data-seed-pack-item-frame')).toBe('herb:mintHerb');
    expect(
      icon?.querySelector('.style-seed-pack-composite__item')?.getAttribute(
        'data-asset-atlas-frame',
      ),
    ).toBe('herb:mintHerb');
  });

  it('uses facade metadata when completed series research is hidden from visible tabs', () => {
    const snapshot = createSnapshot();
    snapshot.research.tabs[0].boxes[0].researches = [];
    const { gameplayFacade, stage } = mountManager(snapshot);

    gameplayFacade.researchFacade = {
      getResearchAnnouncementSnapshot: (researchId) => ({
        id: researchId,
        label: 'fast sell lvl 1',
        effect: '85% payout',
        value: 'researched',
        costCurrency: 'ruby',
      }),
    };

    snapshot.research.completedResearchIds = ['fastSellPayout:1'];
    gameplayFacade.publishSnapshot();

    expect(stage.querySelector('.room-announcement-layer')?.hidden).toBe(false);
    expect(stage.querySelector('.room-announcement__title')?.textContent).toBe(
      'research complete',
    );
    expect(stage.querySelector('.room-announcement__research-label')?.textContent).toBe(
      'fast sell lvl 1',
    );
    expect(stage.querySelector('.room-announcement__research-detail')?.textContent).toBe(
      '85% payout',
    );
    expect(
      stage
        .querySelector('.room-announcement__research-icon')
        ?.getAttribute('data-asset-atlas-frame'),
    ).toBe('resource:research');
  });
});
