import { describe, expect, it } from 'vitest';

import {
  createPixiThemeSnapshot,
  PIXI_PAGE_BACKGROUND_COLORS,
} from './PixiThemeTokens.js';
import {
  createPixiPageBackgroundGradient,
  createPixiPagePaperPattern,
  getPixiPageBackgroundColors,
  getPixiPageBackgroundMaterial,
} from './PixiPageBackground.js';

describe('Pixi page background tokens', () => {
  it('keeps all seven room backgrounds on the exact active-theme base', () => {
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
        expect(theme.background).toBe('#e8bc8c');
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

  it('adds deterministic warm paper fibers to Day while Night stays unchanged', () => {
    const night = createPixiThemeSnapshot({ theme: 'night' });
    const day = createPixiThemeSnapshot({ theme: 'day' });

    expect(getPixiPageBackgroundMaterial(night).kind).toBe('solid');
    expect(getPixiPageBackgroundMaterial(day)).toMatchObject({
      kind: 'paper',
      highlight: 0xffead0,
      shadow: 0xaf744c,
    });

    const first = createPixiPagePaperPattern('workshop', 360, 2170 / 3);
    const second = createPixiPagePaperPattern('workshop', 360, 2170 / 3);
    const otherRoom = createPixiPagePaperPattern('garden', 360, 2170 / 3);

    expect(first).toEqual(second);
    expect(first).not.toEqual(otherRoom);
    expect(first.longFibers).toHaveLength(24);
    expect(first.shortFibers).toHaveLength(112);
    expect(first.specks).toHaveLength(64);
  });
});
