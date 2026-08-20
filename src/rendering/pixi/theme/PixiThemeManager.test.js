import { describe, expect, it, vi } from 'vitest';

import { PixiThemeManager } from './PixiThemeManager.js';
import {
  createPixiThemeSnapshot,
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_PROGRESS_VISUALS,
  PIXI_UI_GEOMETRY,
} from './PixiThemeTokens.js';

describe('Pixi theme tokens', () => {
  it('keeps the authored source geometry and Night defaults', () => {
    expect(PIXI_UI_GEOMETRY).toMatchObject({
      authoredWidth: 1170,
      authoredHeight: 2532,
      sourceScale: 3,
      sourceWidth: 390,
      bodyFontSize: 13,
      dialogTitleFontSize: 14,
      borderLabelFontSize: 11,
      roomControlHeight: 36,
    });
    expect(DEFAULT_PIXI_THEME_SNAPSHOT).toMatchObject({
      themeKey: 'night',
      background: '#1c1e26',
      surface: '#17191f',
      text: '#d4d4d4',
      stroke: '#3f465c',
    });
    expect(PIXI_PROGRESS_VISUALS.tones.green.fill).toBe('#99bb46');
    expect(PIXI_PROGRESS_VISUALS.tones.green.edge).toBe('#d6ec3e');
  });

  it('normalizes aliases and resolves the full visual settings snapshot', () => {
    const snapshot = createPixiThemeSnapshot({
      theme: 'day',
      font: 'comic sans mono',
      colorMode: 'resources',
      iconMode: 'icons',
      progressBar: 'bronze',
    });

    expect(snapshot.themeKey).toBe('day');
    expect(snapshot.fontKey).toBe('comic-sans-mono');
    expect(snapshot.progressKey).toBe('notched');
    expect(snapshot.resourceColors.coin).toBe('#f2d36c');
    expect(snapshot.revisionKey).toBe(
      'day:comic-sans-mono:resources:icons:notched',
    );
  });
});

describe('PixiThemeManager', () => {
  it('publishes only real visual-setting revisions', () => {
    let publish = null;
    const playerFacade = {
      getSnapshot: () => ({
        theme: 'night',
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

    publish({ ...playerFacade.getSnapshot(), theme: 'day' });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(manager.getSnapshot().themeKey).toBe('day');
  });
});
