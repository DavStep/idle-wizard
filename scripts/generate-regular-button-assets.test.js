import { readFileSync, readdirSync } from 'node:fs';

import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';

const ASSET_DIR = 'assets/game/source/ui/regular-button';
const COLORS = [
  'blue',
  'brown',
  'dark-brown',
  'gray',
  'green',
  'purple',
  'red',
  'yellow',
];
const TIERS = [
  {
    radius: 50,
    size: [141, 171],
    slice: { left: 86, top: 100, right: 52, bottom: 68 },
  },
  {
    radius: 30,
    size: [87, 104],
    slice: { left: 52, top: 60, right: 32, bottom: 41 },
  },
  {
    radius: 15,
    size: [46, 53],
    slice: { left: 27, top: 30, right: 16, bottom: 20 },
  },
];

describe('regular button asset generator', () => {
  it('checks in the complete color and radius matrix', () => {
    const pngs = readdirSync(ASSET_DIR)
      .filter((name) => name.endsWith('.9.png'))
      .sort();

    expect(pngs).toEqual(
      COLORS
        .flatMap((color) =>
          TIERS.map(
            ({ radius }) => `${color}-button-${radius}.9.png`,
          ),
        )
        .sort(),
    );
  });

  it('keeps each radius tier at its declared minimum geometry', () => {
    for (const tier of TIERS) {
      const alphaMasks = [];

      for (const color of COLORS) {
        const filename = `${color}-button-${tier.radius}.9.png`;
        const png = PNG.sync.read(
          readFileSync(`${ASSET_DIR}/${filename}`),
        );
        const metadata = JSON.parse(
          readFileSync(
            `${ASSET_DIR}/${filename.replace(/\.png$/, '')}.9slice.json`,
            'utf8',
          ),
        );

        expect([png.width, png.height], filename).toEqual(tier.size);
        expect(metadata.asset, filename).toBe(filename);
        expect(metadata.slice, filename).toEqual(tier.slice);
        expect(metadata.rendering.outputInsets, filename).toEqual(
          tier.slice,
        );
        expect(metadata.rendering.minimumCenter, filename).toEqual({
          width: 3,
          height: 3,
        });
        expect(metadata.rendering.minimumSize, filename).toEqual({
          width: tier.size[0],
          height: tier.size[1],
        });
        expect(
          png.width - tier.slice.left - tier.slice.right,
          filename,
        ).toBeGreaterThanOrEqual(3);
        expect(
          png.height - tier.slice.top - tier.slice.bottom,
          filename,
        ).toBeGreaterThanOrEqual(3);
        expectFlatStretchCenter(png, tier.slice, filename);
        expectCleanStretchGutters(png, tier.slice, filename);
        alphaMasks.push(readAlphaMask(png));
      }

      for (const alphaMask of alphaMasks.slice(1)) {
        expect(alphaMask).toEqual(alphaMasks[0]);
      }
    }
  });
});

function expectFlatStretchCenter(png, slice, filename) {
  const centerWidth = png.width - slice.left - slice.right;
  const centerHeight = png.height - slice.top - slice.bottom;

  for (let y = 0; y < png.height; y += 1) {
    const reference = readPixel(png, slice.left, y);

    for (let offset = 1; offset < centerWidth; offset += 1) {
      expect(
        readPixel(png, slice.left + offset, y),
        `${filename} horizontal stretch row ${y}`,
      ).toEqual(reference);
    }
  }

  for (let x = 0; x < png.width; x += 1) {
    const reference = readPixel(png, x, slice.top);

    for (let offset = 1; offset < centerHeight; offset += 1) {
      expect(
        readPixel(png, x, slice.top + offset),
        `${filename} vertical stretch column ${x}`,
      ).toEqual(reference);
    }
  }
}

function expectCleanStretchGutters(png, slice, filename) {
  const centerWidth = png.width - slice.left - slice.right;
  const centerHeight = png.height - slice.top - slice.bottom;

  for (let y = 0; y < png.height; y += 1) {
    const centerPixel = readPixel(png, slice.left, y);

    expect(
      readPixel(png, slice.left - 1, y),
      `${filename} left stretch gutter row ${y}`,
    ).toEqual(centerPixel);
    expect(
      readPixel(png, slice.left + centerWidth, y),
      `${filename} right stretch gutter row ${y}`,
    ).toEqual(centerPixel);
  }

  for (let x = 0; x < png.width; x += 1) {
    const centerPixel = readPixel(png, x, slice.top);

    expect(
      readPixel(png, x, slice.top - 1),
      `${filename} top stretch gutter column ${x}`,
    ).toEqual(centerPixel);
    expect(
      readPixel(png, x, slice.top + centerHeight),
      `${filename} bottom stretch gutter column ${x}`,
    ).toEqual(centerPixel);
  }
}

function readPixel(png, x, y) {
  const index = (y * png.width + x) * 4;

  return [...png.data.subarray(index, index + 4)];
}

function readAlphaMask(png) {
  const mask = [];

  for (let index = 3; index < png.data.length; index += 4) {
    mask.push(png.data[index]);
  }

  return mask;
}
