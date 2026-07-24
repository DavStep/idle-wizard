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
  'icon-crystal.png',
  'icon-ruby.png',
  'icon-emerald.png',
];

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

  it('keeps the crystal tall and optically full inside its canvas', () => {
    const image = PNG.sync.read(
      fs.readFileSync(path.join(ICON_DIRECTORY, 'icon-crystal.png')),
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
});
