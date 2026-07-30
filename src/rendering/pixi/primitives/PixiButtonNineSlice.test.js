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
const COMPACT_TAB_ASSETS = [
  {
    file: 'brown-tab-active-9slice.png',
    sourceFile: 'brown-button-light-9slice.png',
    face: '110,70,39,255',
    highlight: '162,116,67,255',
  },
  {
    file: 'brown-tab-inactive-9slice.png',
    sourceFile: 'brown-button-dark-9slice.png',
    face: '45,33,25,255',
    highlight: '92,62,39,255',
  },
  {
    file: 'gray-tab-disabled-9slice.png',
    sourceFile: 'gray-button-9slice.png',
    face: '122,122,122,255',
    highlight: '155,155,155,255',
  },
];

describe('compact Root Run button nine-slices', () => {
  it('uses a muted red face with the shared coral highlight', () => {
    const png = PNG.sync.read(
      readFileSync(`${COMPACT_BUTTON_ASSET_DIR}/red-button-9slice.png`),
    );
    const colors = new Set();

    for (let index = 0; index < png.data.length; index += 4) {
      colors.add(
        [
          png.data[index],
          png.data[index + 1],
          png.data[index + 2],
          png.data[index + 3],
        ].join(','),
      );
    }

    expect(colors.has('171,73,66,255')).toBe(true);
    expect(colors.has('230,106,93,255')).toBe(true);
    expect(colors.has('230,57,44,255')).toBe(false);
  });

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

  it('uses compact brown tab assets that fit the 28px footer height', () => {
    const sourceInsets = PIXI_ROOT_RUN_GEOMETRY.tabButton.sourceInsets;
    const borderInsets = PIXI_ROOT_RUN_GEOMETRY.tabButton.borderInsets;

    expect(sourceInsets).toEqual({
      top: 78,
      right: 43,
      bottom: 53,
      left: 85,
    });
    expect(borderInsets).toEqual({
      top: 13,
      right: 7,
      bottom: 9,
      left: 20,
    });
    expect(borderInsets.top + borderInsets.bottom).toBeLessThan(28);

    for (const asset of COMPACT_TAB_ASSETS) {
      const png = PNG.sync.read(
        readFileSync(`${COMPACT_BUTTON_ASSET_DIR}/${asset.file}`),
      );
      const sourcePng = PNG.sync.read(
        readFileSync(`${COMPACT_BUTTON_ASSET_DIR}/${asset.sourceFile}`),
      );
      const colors = collectColors(png);
      const sourceColors = collectColors(sourcePng);

      expect([png.width, png.height], asset.file).toEqual([130, 132]);
      expect(
        png.width - sourceInsets.left - sourceInsets.right,
        asset.file,
      ).toBe(2);
      expect(
        png.height - sourceInsets.top - sourceInsets.bottom,
        asset.file,
      ).toBe(1);
      expect(colors.has(asset.face), asset.file).toBe(true);
      expect(colors.has(asset.highlight), asset.file).toBe(true);
      for (const color of colors) {
        expect(sourceColors.has(color), `${asset.file} changed ${color}`).toBe(
          true,
        );
      }
    }
  });
});

function collectColors(png) {
  const colors = new Set();

  for (let index = 0; index < png.data.length; index += 4) {
    colors.add(
      [
        png.data[index],
        png.data[index + 1],
        png.data[index + 2],
        png.data[index + 3],
      ].join(','),
    );
  }

  return colors;
}
