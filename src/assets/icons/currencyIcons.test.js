import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';

const ICON_DIRECTORY = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../assets/game/source/icons',
);
const CURRENCY_ICON_FILES = [
  'icon-mana-drop.png',
  'icon-coin.png',
  'icon-amber.png',
  'icon-amethyst.png',
  'icon-ruby.png',
  'icon-emerald.png',
];
const COIN_ICON_FILE = 'icon-coin.png';
const MATCHED_OUTLINE_ICON_FILES = CURRENCY_ICON_FILES.filter(
  (fileName) => fileName !== 'icon-coin.png',
);
const DARK_CONTOUR_LUMINANCE = 35;
const DARK_RING_COVERAGE = 0.9;

describe('currency icon assets', () => {
  it.each(CURRENCY_ICON_FILES)('%s keeps a smooth antialiased 92px silhouette', (fileName) => {
    const image = PNG.sync.read(fs.readFileSync(path.join(ICON_DIRECTORY, fileName)));
    let partialAlphaPixels = 0;

    for (let offset = 3; offset < image.data.length; offset += 4) {
      const alpha = image.data[offset];

      if (alpha > 0 && alpha < 255) {
        partialAlphaPixels += 1;
      }
    }

    expect(image.width).toBe(92);
    expect(image.height).toBe(92);
    expect(partialAlphaPixels).toBeGreaterThan(200);
  });

  it('keeps the amethyst tall and optically full inside its canvas', () => {
    const image = PNG.sync.read(
      fs.readFileSync(path.join(ICON_DIRECTORY, 'icon-amethyst.png')),
    );
    let minX = image.width;
    let minY = image.height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < image.height; y += 1) {
      for (let x = 0; x < image.width; x += 1) {
        const alpha = image.data[(y * image.width + x) * 4 + 3];

        if (alpha > 16) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    const visibleWidth = maxX - minX + 1;
    const visibleHeight = maxY - minY + 1;
    const heightToWidth = visibleHeight / visibleWidth;

    expect(visibleWidth).toBeGreaterThanOrEqual(66);
    expect(visibleWidth).toBeLessThanOrEqual(72);
    expect(visibleHeight).toBeGreaterThanOrEqual(88);
    expect(visibleHeight).toBeLessThanOrEqual(90);
    expect(heightToWidth).toBeGreaterThanOrEqual(1.25);
    expect(heightToWidth).toBeLessThanOrEqual(1.5);
  });

  it.each(MATCHED_OUTLINE_ICON_FILES)(
    '%s matches the coin exterior contour thickness exactly',
    (fileName) => {
      const coin = readIcon(COIN_ICON_FILE);
      const image = readIcon(fileName);

      expect(measureExteriorDarkContourWidth(coin)).toBe(5);
      expect(measureExteriorDarkContourWidth(image)).toBe(
        measureExteriorDarkContourWidth(coin),
      );
    },
  );
});

function readIcon(fileName) {
  return PNG.sync.read(fs.readFileSync(path.join(ICON_DIRECTORY, fileName)));
}

function measureExteriorDarkContourWidth(image) {
  const exterior = collectExteriorPixels(image);
  const ringTotals = Array.from({ length: 16 }, () => ({ dark: 0, total: 0 }));

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const offset = (y * image.width + x) * 4;

      if (image.data[offset + 3] <= 16) {
        continue;
      }

      const distance = Math.floor(
        Math.sqrt(
          exterior.reduce(
            (closest, [exteriorX, exteriorY]) =>
              Math.min(
                closest,
                (x - exteriorX) ** 2 + (y - exteriorY) ** 2,
              ),
            Number.POSITIVE_INFINITY,
          ),
        ),
      );

      if (distance < 1 || distance >= ringTotals.length) {
        continue;
      }

      const luminance =
        image.data[offset] * 0.2126
        + image.data[offset + 1] * 0.7152
        + image.data[offset + 2] * 0.0722;
      ringTotals[distance].total += 1;
      ringTotals[distance].dark += luminance < DARK_CONTOUR_LUMINANCE ? 1 : 0;
    }
  }

  let thickness = 0;

  for (const ring of ringTotals.slice(1)) {
    if (ring.total === 0 || ring.dark / ring.total <= DARK_RING_COVERAGE) {
      break;
    }

    thickness += 1;
  }

  return thickness;
}

function collectExteriorPixels(image) {
  const exterior = [];

  for (let y = -1; y <= image.height; y += 1) {
    for (let x = -1; x <= image.width; x += 1) {
      if (
        x < 0
        || y < 0
        || x >= image.width
        || y >= image.height
        || image.data[(y * image.width + x) * 4 + 3] <= 16
      ) {
        exterior.push([x, y]);
      }
    }
  }

  return exterior;
}
