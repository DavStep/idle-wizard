// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { TopPanelResourceDisplayManager } from './TopPanelResourceDisplayManager.js';

function createRefs() {
  return {
    amethystValue: document.createElement('span'),
    contextCurrency: document.createElement('span'),
    contextCurrencyValue: document.createElement('span'),
    coinValue: document.createElement('span'),
    levelButton: document.createElement('button'),
    levelValue: document.createElement('span'),
    manaRateValue: document.createElement('span'),
    manaValue: document.createElement('span'),
    resources: document.createElement('section'),
  };
}

describe('TopPanelResourceDisplayManager', () => {
  it('always shows Amethyst plus the contextual fourth currency', () => {
    const refs = createRefs();
    const gameplayFacade = {
      getSnapshot: vi.fn(() => ({
        amethyst: { current: 6 },
        coin: { current: 7 },
        crystal: { current: 8 },
        ruby: { current: 9 },
        mana: { current: 10, cap: 50, perSecond: 1 },
        tasks: { currentLevel: 2 },
      })),
      subscribe: vi.fn(() => vi.fn()),
    };
    const manager = new TopPanelResourceDisplayManager({ gameplayFacade });

    manager.mount(refs);

    expect(refs.amethystValue.textContent).toBe('6 amethyst');
    expect(refs.contextCurrency.hidden).toBe(false);
    expect(refs.contextCurrency.getAttribute('aria-label')).toBe('amber');
    expect(refs.contextCurrencyValue.textContent).toBe('8 amber');

    manager.setContextCurrency('ruby');

    expect(refs.contextCurrency.getAttribute('aria-label')).toBe('ruby');
    expect(refs.contextCurrencyValue.textContent).toBe('9 ruby');
  });

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
    const manaHighlightTarget = refs.manaValue.querySelector(
      '[data-tutorial-id="top:mana:value"]',
    );

    expect(manaHighlightTarget?.textContent).toBe('3/50 mana');
    expect(manaHighlightTarget?.classList.contains('style-resource-label--mana')).toBe(true);
    expect(
      refs.manaValue.querySelector('.style-resource-label__amount')?.dataset.tutorialId,
    ).toBeUndefined();
    expect(
      manaHighlightTarget?.getAttribute('data-tutorial-highlight-padding'),
    ).toBeNull();
    expect(
      manaHighlightTarget?.getAttribute('data-tutorial-highlight-shape'),
    ).toBeNull();
    expect(refs.coinValue.textContent).toBe('7 coin');
    expect(refs.levelValue.textContent).toBe('2');
    expect(refs.levelButton.hidden).toBe(false);
    expect(refs.levelButton.getAttribute('aria-label')).toBe(
      'level 2, open level rewards',
    );
  });

  it('hides the level label before the first level-up', () => {
    const refs = createRefs();
    refs.levelValue = refs.levelButton;
    const gameplayFacade = {
      getSnapshot: vi.fn(() => ({
        mana: { current: 40, cap: 50, perSecond: 1 },
        coin: { current: 10 },
        tasks: { currentLevel: 0 },
      })),
      subscribe: vi.fn(() => vi.fn()),
    };
    const manager = new TopPanelResourceDisplayManager({ gameplayFacade });

    manager.mount(refs);

    expect(refs.levelButton.textContent).toBe('');
    expect(refs.levelButton.hidden).toBe(true);
  });
});
