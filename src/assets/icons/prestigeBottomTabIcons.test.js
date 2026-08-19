import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';

const ICON_DIRECTORY = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../assets/game/source/icons',
);

const PRESTIGE_TAB_ICONS = Object.freeze([
  'icon-prestige-main-tab.png',
  'icon-prestige-points-tab.png',
]);

describe('Prestige bottom-tab icon assets', () => {
  it.each(PRESTIGE_TAB_ICONS)(
    'keeps %s square, transparent, padded, and antialiased',
    (fileName) => {
      const image = PNG.sync.read(
        fs.readFileSync(path.join(ICON_DIRECTORY, fileName)),
      );
      let transparentPixels = 0;
      let partialAlphaPixels = 0;
      let visiblePixels = 0;
      let minX = image.width;
      let minY = image.height;
      let maxX = -1;
      let maxY = -1;

      for (let y = 0; y < image.height; y += 1) {
        for (let x = 0; x < image.width; x += 1) {
          const alpha = image.data[(y * image.width + x) * 4 + 3];
          if (alpha === 0) {
            transparentPixels += 1;
            continue;
          }
          if (alpha < 255) {
            partialAlphaPixels += 1;
          }
          visiblePixels += 1;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }

      expect(image.width).toBe(512);
      expect(image.height).toBe(512);
      expect(transparentPixels).toBeGreaterThan(75_000);
      expect(partialAlphaPixels).toBeGreaterThan(1_000);
      expect(visiblePixels).toBeGreaterThan(45_000);
      expect(minX).toBeGreaterThanOrEqual(40);
      expect(minY).toBeGreaterThanOrEqual(40);
      expect(maxX).toBeLessThanOrEqual(471);
      expect(maxY).toBeLessThanOrEqual(471);
      expect(image.data[3]).toBe(0);
      expect(image.data[(image.width - 1) * 4 + 3]).toBe(0);
      expect(image.data[(image.height - 1) * image.width * 4 + 3]).toBe(0);
      expect(image.data[image.data.length - 1]).toBe(0);
    },
  );
});
