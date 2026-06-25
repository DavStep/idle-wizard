// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';

import { AppThemeManager } from './AppThemeManager.js';

function createPlayerFacade(
  initialTheme = 'white',
  initialColorMode = 'resources',
  initialFont = 'lexend',
  initialIconMode = 'icons',
  initialProgressBar = 'regular',
) {
  let snapshot = {
    theme: initialTheme,
    font: initialFont,
    colorMode: initialColorMode,
    iconMode: initialIconMode,
    progressBar: initialProgressBar,
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
    setFont: (font) => {
      snapshot = { ...snapshot, font };

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
    setIconMode: (iconMode) => {
      snapshot = { ...snapshot, iconMode };

      for (const listener of listeners) {
        listener(snapshot);
      }
    },
    setProgressBar: (progressBar) => {
      snapshot = { ...snapshot, progressBar };

      for (const listener of listeners) {
        listener(snapshot);
      }
    },
  };
}

describe('AppThemeManager', () => {
  afterEach(() => {
    delete document.documentElement.dataset.styleTheme;
    delete document.documentElement.dataset.styleFont;
    delete document.documentElement.dataset.styleColor;
    delete document.documentElement.dataset.styleIcons;
    delete document.documentElement.dataset.styleProgress;
  });

  it('applies current and changed player visual settings to the document root', () => {
    const playerFacade = createPlayerFacade(
      'black',
      'resources',
      'comic-sans-mono',
      'icons',
      'gradient',
    );
    const manager = new AppThemeManager();

    manager.mount(playerFacade);

    expect(document.documentElement.dataset.styleTheme).toBe('black');
    expect(document.documentElement.dataset.styleFont).toBe('comic-sans-mono');
    expect(document.documentElement.dataset.styleColor).toBe('resources');
    expect(document.documentElement.dataset.styleIcons).toBe('icons');
    expect(document.documentElement.dataset.styleProgress).toBe('gradient');

    playerFacade.setTheme('midnight');
    playerFacade.setFont('comic sans mono');
    playerFacade.setIconMode('none');
    playerFacade.setProgressBar('regular');

    expect(document.documentElement.dataset.styleTheme).toBe('midnight');
    expect(document.documentElement.dataset.styleFont).toBe('comic-sans-mono');
    expect(document.documentElement.dataset.styleIcons).toBe('icons');
    expect(document.documentElement.dataset.styleProgress).toBe('regular');

    playerFacade.setFont('google-lexend');

    expect(document.documentElement.dataset.styleFont).toBe('lexend');

    playerFacade.setTheme('witchcraft');

    expect(document.documentElement.dataset.styleTheme).toBe('witchcraft');

    playerFacade.setTheme('night-black');
    playerFacade.setFont('unknown');
    playerFacade.setColorMode('colored');

    expect(document.documentElement.dataset.styleTheme).toBe('black');
    expect(document.documentElement.dataset.styleFont).toBe('lexend');
    expect(document.documentElement.dataset.styleColor).toBe('resources');

    playerFacade.setTheme('mild-white');

    expect(document.documentElement.dataset.styleTheme).toBe('white');

    manager.unmount();
    expect(document.documentElement.dataset.styleTheme).toBe('white');
    expect(document.documentElement.dataset.styleFont).toBe('lexend');
    expect(document.documentElement.dataset.styleColor).toBe('resources');
    expect(document.documentElement.dataset.styleIcons).toBe('icons');
    expect(document.documentElement.dataset.styleProgress).toBe('regular');
  });
});
