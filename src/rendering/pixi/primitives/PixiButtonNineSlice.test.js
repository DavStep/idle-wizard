import { readFileSync } from 'node:fs';

import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';

import { PIXI_ROOT_RUN_GEOMETRY } from '../theme/PixiThemeTokens.js';

const COMPACT_BUTTON_ASSET_DIR =
  'assets/game/source/ui/root-run-cost-button';
const COMPACT_BUTTON_ASSETS = [
  'yellow-button-9slice.png',
  'green-button-9slice.png',
  'red-button-9slice.png',
  'gray-button-9slice.png',
  'brown-button-dark-9slice.png',
  'brown-button-light-9slice.png',
];

describe('compact Root Run button nine-slices', () => {
  it('uses a distilled flat stretch band for every color variant', () => {
    const sourceInsets = PIXI_ROOT_RUN_GEOMETRY.button.sourceInsets;

    expect(sourceInsets).toEqual({
      top: 100,
      right: 43,
      bottom: 68,
      left: 85,
    });

    for (const asset of COMPACT_BUTTON_ASSETS) {
      const png = PNG.sync.read(
        readFileSync(`${COMPACT_BUTTON_ASSET_DIR}/${asset}`),
      );
      const stretchStart = sourceInsets.left;
      const stretchWidth =
        png.width - sourceInsets.left - sourceInsets.right;

      expect([png.width, png.height], asset).toEqual([130, 169]);
      expect(stretchWidth, asset).toBe(2);

      for (let y = 0; y < png.height; y += 1) {
        const firstColumn = (y * png.width + stretchStart) * 4;
        const secondColumn = firstColumn + 4;

        expect(
          [...png.data.subarray(firstColumn, firstColumn + 4)],
          `${asset} stretch row ${y}`,
        ).toEqual([
          ...png.data.subarray(secondColumn, secondColumn + 4),
        ]);
      }
    }
  });
});
