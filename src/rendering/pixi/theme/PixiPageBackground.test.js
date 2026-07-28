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

    for (const themeKey of ['black', 'midnight', 'witchcraft']) {
      const theme = createPixiThemeSnapshot({ theme: themeKey });
      expect(Object.keys(theme.pageBackgrounds)).toEqual(pageIds);
      for (const pageId of pageIds) {
        const colors = getPixiPageBackgroundColors(pageId, theme);
        expect(colors).toBe(
          PIXI_PAGE_BACKGROUND_COLORS[themeKey][pageId],
        );
        expect(colors).toEqual([
          theme.surface,
          theme.surface,
          theme.surface,
        ]);
        expect(
          createPixiPageBackgroundGradient(pageId, theme),
        ).toBe(theme.surface);
      }
    }
  });
});
