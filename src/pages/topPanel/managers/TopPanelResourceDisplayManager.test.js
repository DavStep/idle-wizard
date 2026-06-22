// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { TopPanelResourceDisplayManager } from './TopPanelResourceDisplayManager.js';

function createRefs() {
  return {
    contextCurrency: document.createElement('span'),
    contextCurrencyValue: document.createElement('span'),
    coinValue: document.createElement('span'),
    levelValue: document.createElement('span'),
    manaRateValue: document.createElement('span'),
    manaValue: document.createElement('span'),
    resources: document.createElement('section'),
  };
}

describe('TopPanelResourceDisplayManager', () => {
  it('renders frame resource updates without needing a full gameplay snapshot', () => {
    let frameListener = null;
    const refs = createRefs();
    const gameplayFacade = {
      getSnapshot: vi.fn(() => ({
        mana: { current: 0, cap: 50, perSecond: 1 },
        coin: { current: 0 },
        tasks: { currentLevel: 1 },
      })),
      subscribe: vi.fn(() => vi.fn()),
      subscribeFrameResources: vi.fn((listener) => {
        frameListener = listener;
        return vi.fn();
      }),
    };
    const manager = new TopPanelResourceDisplayManager({ gameplayFacade });

    manager.mount(refs);
    frameListener({
      mana: { current: 3, cap: 50, perSecond: 1 },
      coin: { current: 7 },
      tasks: { currentLevel: 2 },
    });

    expect(refs.manaValue.textContent).toBe('3/50 mana');
    expect(refs.coinValue.textContent).toBe('7 coin');
    expect(refs.levelValue.textContent).toBe('level 2');
  });
});
