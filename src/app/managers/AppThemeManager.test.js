// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';

import { AppThemeManager } from './AppThemeManager.js';

function createPlayerFacade(initialTheme = 'white') {
  let snapshot = {
    theme: initialTheme,
  };
  const listeners = new Set();

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setTheme: (theme) => {
      snapshot = { theme };

      for (const listener of listeners) {
        listener(snapshot);
      }
    },
  };
}

describe('AppThemeManager', () => {
  afterEach(() => {
    delete document.documentElement.dataset.styleTheme;
  });

  it('applies current and changed player theme to the document root', () => {
    const playerFacade = createPlayerFacade('black');
    const manager = new AppThemeManager();

    manager.mount(playerFacade);

    expect(document.documentElement.dataset.styleTheme).toBe('black');

    playerFacade.setTheme('night-black');

    expect(document.documentElement.dataset.styleTheme).toBe('black');

    manager.unmount();
    expect(document.documentElement.dataset.styleTheme).toBe('white');
  });
});
