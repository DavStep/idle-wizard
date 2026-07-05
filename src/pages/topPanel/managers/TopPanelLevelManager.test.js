/* @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';

import { TopPanelLevelManager } from './TopPanelLevelManager.js';

describe('TopPanelLevelManager', () => {
  it('keeps reward labels plain and suppresses same-level feature capacity rows', () => {
    const refs = createRefs();
    const manager = new TopPanelLevelManager({
      gameplayFacade: createGameplayFacade({
        playerLevel: {
          currentLevel: 1,
          maxLevel: 4,
          levels: [
            createLevel(1, {
              current: true,
              effects: ['max garden tiles 2', 'max cauldrons 1'],
              totals: {
                maxGardenTiles: 2,
                maxCauldrons: 1,
                maxNpcMarketStands: 0,
                maxPlayerMarketStands: 0,
                maxManaCap: 50,
                manaPerSecond: 1,
              },
            }),
            createLevel(2, {
              effects: [
                'max garden tiles 3',
                'max mana cap 100',
                'mana regen 2/sec',
                'crystal reward 1',
              ],
              totals: {
                maxGardenTiles: 3,
                maxCauldrons: 1,
                maxNpcMarketStands: 0,
                maxPlayerMarketStands: 0,
                maxManaCap: 100,
                manaPerSecond: 2,
              },
            }),
            createLevel(3, {
              effects: ['max mana cap 150', 'mana regen 3/sec', 'crystal reward 1'],
              totals: {
                maxGardenTiles: 3,
                maxCauldrons: 1,
                maxNpcMarketStands: 0,
                maxPlayerMarketStands: 0,
                maxManaCap: 150,
                manaPerSecond: 3,
              },
            }),
            createLevel(4, {
              effects: [
                'max cauldrons 2',
                'max mana cap 200',
                'mana regen 4/sec',
                'crystal reward 1',
              ],
              totals: {
                maxGardenTiles: 3,
                maxCauldrons: 2,
                maxNpcMarketStands: 0,
                maxPlayerMarketStands: 0,
                maxManaCap: 200,
                manaPerSecond: 4,
              },
            }),
          ],
        },
      }),
    });

    manager.mount(refs);
    refs.levelButton.click();

    manager.selectLevel(2);

    expect(getRows(refs.levelAddedRows)).toEqual([
      ['mana capacity', '+50 mana'],
      ['mana regeneration', '+1/sec mana'],
      ['bonus', '+1 crystal'],
    ]);
    expect(refs.levelAddedRows.textContent).not.toContain('garden plots');
    expect(refs.levelTotalRows.textContent).toContain('garden plots3');

    manager.selectLevel(4);

    expect(getRows(refs.levelAddedRows)).toEqual([
      ['mana capacity', '+50 mana'],
      ['mana regeneration', '+1/sec mana'],
      ['bonus', '+1 crystal'],
    ]);
    expect(refs.levelAddedRows.textContent).not.toContain('cauldrons');
    expect(refs.levelTotalRows.textContent).toContain('cauldrons2');

    manager.unmount();
  });
});

function createGameplayFacade(snapshot) {
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listener(snapshot);
      return () => {};
    },
  };
}

function createLevel(level, { current = false, effects = [], totals = null } = {}) {
  return {
    level,
    current,
    unlocked: true,
    effects,
    totals,
  };
}

function createRefs() {
  return {
    levelButton: document.createElement('button'),
    levelCloseButton: document.createElement('button'),
    levelPreviousButton: document.createElement('button'),
    levelNextButton: document.createElement('button'),
    levelPopup: document.createElement('section'),
    levelPanel: document.createElement('section'),
    levelContent: document.createElement('section'),
    levelTitle: document.createElement('div'),
    levelCurrentLabel: document.createElement('div'),
    levelAddedLabel: document.createElement('div'),
    levelAddedRows: document.createElement('div'),
    levelDivider: document.createElement('div'),
    levelTotalLabel: document.createElement('div'),
    levelTotalRows: document.createElement('div'),
  };
}

function getRows(container) {
  return [...container.querySelectorAll('.room-top-panel__level-effect-row')].map((row) => [
    row.querySelector('.room-top-panel__level-effect-label')?.textContent,
    row.querySelector('.room-top-panel__level-effect-value')?.textContent,
  ]);
}
