import { describe, expect, it, vi } from 'vitest';

import { PixiThemeManager } from './PixiThemeManager.js';
import {
  createPixiThemeSnapshot,
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_UI_GEOMETRY,
} from './PixiThemeTokens.js';

describe('Pixi theme tokens', () => {
  it('keeps the authored source geometry and midnight defaults', () => {
    expect(PIXI_UI_GEOMETRY).toMatchObject({
      authoredWidth: 1080,
      authoredHeight: 2170,
      sourceScale: 3,
      sourceWidth: 360,
      bodyFontSize: 13,
      dialogTitleFontSize: 14,
      borderLabelFontSize: 11,
    });
    expect(DEFAULT_PIXI_THEME_SNAPSHOT).toMatchObject({
      themeKey: 'midnight',
      background: '#1c1e26',
      surface: '#17191f',
      text: '#d4d4d4',
      stroke: '#3f465c',
    });
  });

  it('normalizes aliases and resolves the full visual settings snapshot', () => {
    const snapshot = createPixiThemeSnapshot({
      theme: 'idle-witch-craft',
      font: 'comic sans mono',
      colorMode: 'resources',
      iconMode: 'icons',
      progressBar: 'bronze',
    });

    expect(snapshot.themeKey).toBe('witchcraft');
    expect(snapshot.fontKey).toBe('comic-sans-mono');
    expect(snapshot.progressKey).toBe('notched');
    expect(snapshot.resourceColors.coin).toBe('#ffd76a');
    expect(snapshot.revisionKey).toBe(
      'witchcraft:comic-sans-mono:resources:icons:notched',
    );
  });
});

describe('PixiThemeManager', () => {
  it('publishes only real visual-setting revisions', () => {
    let publish = null;
    const playerFacade = {
      getSnapshot: () => ({
        theme: 'midnight',
        font: 'lexend',
        colorMode: 'resources',
        iconMode: 'icons',
        progressBar: 'regular',
      }),
      subscribe: vi.fn((listener) => {
        publish = listener;
        return vi.fn();
      }),
    };
    const listener = vi.fn();
    const manager = new PixiThemeManager();
    manager.subscribe(listener);
    manager.mount(playerFacade);

    publish(playerFacade.getSnapshot());
    expect(listener).not.toHaveBeenCalled();

    publish({ ...playerFacade.getSnapshot(), theme: 'black' });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(manager.getSnapshot().themeKey).toBe('black');
  });
});
