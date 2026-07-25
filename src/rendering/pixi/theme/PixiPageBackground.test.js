import { describe, expect, it } from 'vitest';

import {
  createPixiThemeSnapshot,
  PIXI_PAGE_BACKGROUND_COLORS,
} from './PixiThemeTokens.js';
import {
  createPixiPageBackgroundGradient,
  getPixiPageBackgroundColors,
} from './PixiPageBackground.js';

describe('Pixi page background tokens', () => {
  it('freezes all seven legacy room gradients for every production theme', () => {
    const pageIds = [
      'workshop',
      'brewing',
      'garden',
      'research',
      'shop',
      'guild',
      'prestige',
    ];

    for (const themeKey of ['black', 'midnight', 'witchcraft']) {
      const theme = createPixiThemeSnapshot({ theme: themeKey });
      expect(Object.keys(theme.pageBackgrounds)).toEqual(pageIds);
      for (const pageId of pageIds) {
        const colors = getPixiPageBackgroundColors(pageId, theme);
        expect(colors).toBe(
          PIXI_PAGE_BACKGROUND_COLORS[themeKey][pageId],
        );
        expect(colors[1]).toBe(theme.surface);
      }
    }
  });

  it('builds the reference bottom-to-top 0/48/100 gradient', () => {
    const theme = createPixiThemeSnapshot({ theme: 'black' });
    const gradient = createPixiPageBackgroundGradient(
      'workshop',
      theme,
    );

    expect(gradient.start).toMatchObject({ x: 0, y: 1 });
    expect(gradient.end).toMatchObject({ x: 0, y: 0 });
    expect(gradient.textureSpace).toBe('local');
    expect(gradient.colorStops).toEqual([
      { offset: 0, color: '#2e2b37ff' },
      { offset: 0.48, color: '#202020ff' },
      { offset: 1, color: '#2a2a2eff' },
    ]);

    gradient.destroy();
  });
});
