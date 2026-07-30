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
  it('keeps all seven room backgrounds solid for every production theme', () => {
    const pageIds = [
      'workshop',
      'brewing',
      'garden',
      'research',
      'shop',
      'guild',
      'prestige',
    ];

    for (const themeKey of ['night', 'day']) {
      const theme = createPixiThemeSnapshot({ theme: themeKey });
      const expectedBackground =
        themeKey === 'day' ? theme.background : theme.surface;
      if (themeKey === 'day') {
        expect(theme.background).toBe('#ffe2c0');
        expect(theme.surface).toBe('#543a28');
      }
      expect(Object.keys(theme.pageBackgrounds)).toEqual(pageIds);
      for (const pageId of pageIds) {
        const colors = getPixiPageBackgroundColors(pageId, theme);
        expect(colors).toBe(
          PIXI_PAGE_BACKGROUND_COLORS[themeKey][pageId],
        );
        expect(colors).toEqual([
          expectedBackground,
          expectedBackground,
          expectedBackground,
        ]);
        expect(
          createPixiPageBackgroundGradient(pageId, theme),
        ).toBe(expectedBackground);
      }
    }
  });
});
