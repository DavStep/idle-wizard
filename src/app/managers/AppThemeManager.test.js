// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';

import { AppThemeManager } from './AppThemeManager.js';

function createPlayerFacade(initialTheme = 'white', initialColorMode = 'monochrome') {
  let snapshot = {
    theme: initialTheme,
    colorMode: initialColorMode,
  };
  const listeners = new Set();

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setTheme: (theme) => {
      snapshot = { ...snapshot, theme };

      for (const listener of listeners) {
        listener(snapshot);
      }
    },
    setColorMode: (colorMode) => {
      snapshot = { ...snapshot, colorMode };

      for (const listener of listeners) {
        listener(snapshot);
      }
    },
  };
}

describe('AppThemeManager', () => {
  afterEach(() => {
    delete document.documentElement.dataset.styleTheme;
    delete document.documentElement.dataset.styleColor;
  });

  it('applies current and changed player visual settings to the document root', () => {
    const playerFacade = createPlayerFacade('black', 'resources');
    const manager = new AppThemeManager();

    manager.mount(playerFacade);

    expect(document.documentElement.dataset.styleTheme).toBe('black');
    expect(document.documentElement.dataset.styleColor).toBe('resources');

    playerFacade.setTheme('night-black');
    playerFacade.setColorMode('colored');

    expect(document.documentElement.dataset.styleTheme).toBe('black');
    expect(document.documentElement.dataset.styleColor).toBe('resources');

    manager.unmount();
    expect(document.documentElement.dataset.styleTheme).toBe('white');
    expect(document.documentElement.dataset.styleColor).toBe('monochrome');
  });
});
