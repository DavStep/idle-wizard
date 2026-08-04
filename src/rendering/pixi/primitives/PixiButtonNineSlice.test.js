import { readFileSync } from 'node:fs';

import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';

import { PIXI_ROOT_RUN_GEOMETRY } from '../theme/PixiThemeTokens.js';
import { getPixiButtonSkin } from './PixiButtonStyle.js';

const REGULAR_BUTTON_ASSET_DIR =
  'assets/game/source/ui/regular-button';
const COMPACT_BUTTON_ASSETS = [
  {
    directory: REGULAR_BUTTON_ASSET_DIR,
    file: 'yellow-button-50.9.png',
    size: [141, 171],
    centerSize: 3,
    sourceInsets: { top: 100, right: 52, bottom: 68, left: 86 },
  },
  {
    directory: REGULAR_BUTTON_ASSET_DIR,
    file: 'green-button-50.9.png',
    size: [141, 171],
    centerSize: 3,
    sourceInsets: { top: 100, right: 52, bottom: 68, left: 86 },
  },
  {
    directory: REGULAR_BUTTON_ASSET_DIR,
    file: 'red-button-50.9.png',
    size: [141, 171],
    centerSize: 3,
    sourceInsets: { top: 100, right: 52, bottom: 68, left: 86 },
  },
  {
    directory: REGULAR_BUTTON_ASSET_DIR,
    file: 'gray-button-50.9.png',
    size: [141, 171],
    centerSize: 3,
    sourceInsets: { top: 100, right: 52, bottom: 68, left: 86 },
  },
  {
    directory: REGULAR_BUTTON_ASSET_DIR,
    file: 'dark-brown-button-50.9.png',
    size: [141, 171],
    centerSize: 3,
    sourceInsets: { top: 100, right: 52, bottom: 68, left: 86 },
  },
  {
    directory: REGULAR_BUTTON_ASSET_DIR,
    file: 'brown-button-50.9.png',
    size: [141, 171],
    centerSize: 3,
    sourceInsets: { top: 100, right: 52, bottom: 68, left: 86 },
  },
];
const SHARED_TAB_ASSETS = [
  {
    file: 'brown-button-50.9.png',
    face: '110,70,39,255',
    highlight: '154,116,72,255',
  },
  {
    file: 'dark-brown-button-50.9.png',
    face: '44,33,25,255',
    highlight: '95,70,49,255',
  },
  {
    file: 'gray-button-50.9.png',
    face: '122,122,122,255',
    highlight: '155,155,155,255',
  },
];

describe('compact Root Run button nine-slices', () => {
  it('preserves the editor-authored corner scale at the Summon Seed size', () => {
    const skin = getPixiButtonSkin({
      color: 'purple',
      height: 52,
      sizeTier: 50,
      width: 92,
    });
    const scales = {
      top: skin.borderInsets.top / skin.sourceInsets.top,
      right: skin.borderInsets.right / skin.sourceInsets.right,
      bottom: skin.borderInsets.bottom / skin.sourceInsets.bottom,
      left: skin.borderInsets.left / skin.sourceInsets.left,
    };

    expect(skin.sourceInsets).toEqual({
      top: 100,
      right: 52,
      bottom: 68,
      left: 86,
    });
    expect(scales.left).toBeCloseTo(scales.right);
    expect(scales.left).toBeCloseTo(scales.top);
    expect(scales.left).toBeCloseTo(scales.bottom);
    expect(
      skin.borderInsets.top
        + skin.minimumCenter.height
        + skin.borderInsets.bottom,
    ).toBeLessThanOrEqual(52);
  });

  it('uses a muted red face with the shared coral highlight', () => {
    const png = PNG.sync.read(
      readFileSync(`${REGULAR_BUTTON_ASSET_DIR}/red-button-50.9.png`),
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
    expect(PIXI_ROOT_RUN_GEOMETRY.button.sourceInsets).toEqual({
      top: 100,
      right: 52,
      bottom: 68,
      left: 86,
    });
    for (const asset of COMPACT_BUTTON_ASSETS) {
      const { sourceInsets } = asset;
      const png = PNG.sync.read(
        readFileSync(`${asset.directory}/${asset.file}`),
      );
      const stretchStart = sourceInsets.left;
      const stretchWidth =
        png.width - sourceInsets.left - sourceInsets.right;

      expect([png.width, png.height], asset.file).toEqual(asset.size);
      expect(stretchWidth, asset.file).toBe(asset.centerSize);

      for (let y = 0; y < png.height; y += 1) {
        const firstColumn = (y * png.width + stretchStart) * 4;

        for (let x = 1; x < asset.centerSize; x += 1) {
          expect(
            [...png.data.subarray(firstColumn, firstColumn + 4)],
            `${asset.file} stretch row ${y} column ${x}`,
          ).toEqual([
            ...png.data.subarray(
              firstColumn + x * 4,
              firstColumn + (x + 1) * 4,
            ),
          ]);
        }
      }
    }
  });

  it('reuses regular button assets with output insets that fit the 28px footer height', () => {
    const sourceInsets = PIXI_ROOT_RUN_GEOMETRY.tabButton.sourceInsets;
    const borderInsets = PIXI_ROOT_RUN_GEOMETRY.tabButton.borderInsets;

    expect(sourceInsets).toEqual({
      top: 100,
      right: 52,
      bottom: 68,
      left: 86,
    });
    expect(borderInsets).toEqual({
      top: 13,
      right: 7,
      bottom: 9,
      left: 20,
    });
    expect(borderInsets.top + borderInsets.bottom).toBeLessThan(28);

    expect(sourceInsets).toEqual(PIXI_ROOT_RUN_GEOMETRY.button.sourceInsets);

    for (const asset of SHARED_TAB_ASSETS) {
      const png = PNG.sync.read(
        readFileSync(`${REGULAR_BUTTON_ASSET_DIR}/${asset.file}`),
      );
      const colors = collectColors(png);

      expect([png.width, png.height], asset.file).toEqual([141, 171]);
      expect(
        png.width - sourceInsets.left - sourceInsets.right,
        asset.file,
      ).toBe(3);
      expect(
        png.height - sourceInsets.top - sourceInsets.bottom,
        asset.file,
      ).toBe(3);
      expect(colors.has(asset.face), asset.file).toBe(true);
      expect(colors.has(asset.highlight), asset.file).toBe(true);
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
