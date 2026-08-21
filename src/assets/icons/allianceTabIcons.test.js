import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';

const ICON_DIRECTORY = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../assets/game/source/icons',
);
const ALLIANCE_TAB_ICON_FILES = Object.freeze([
  'icon-alliance-home-tab.png',
  'icon-alliance-quests-tab.png',
  'icon-alliance-requests-tab.png',
  'icon-alliance-settings-tab.png',
]);

function inspectIcon(fileName) {
  const image = PNG.sync.read(
    fs.readFileSync(path.join(ICON_DIRECTORY, fileName)),
  );
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;
  let partialAlphaPixels = 0;
  let transparentPixels = 0;
  let visiblePixels = 0;

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const alpha = image.data[(y * image.width + x) * 4 + 3];

      if (alpha === 0) {
        transparentPixels += 1;
      } else if (alpha < 255) {
        partialAlphaPixels += 1;
      }
      if (alpha <= 16) {
        continue;
      }

      visiblePixels += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  return {
    height: image.height,
    maxX,
    maxY,
    minX,
    minY,
    partialAlphaPixels,
    transparentPixels,
    visibleHeight: maxY - minY + 1,
    visiblePixels,
    visibleWidth: maxX - minX + 1,
    width: image.width,
  };
}

describe('Trade Alliance bottom-tab icon assets', () => {
  it.each(ALLIANCE_TAB_ICON_FILES)(
    'keeps %s transparent, padded, antialiased, and legible at tab scale',
    (fileName) => {
      const icon = inspectIcon(fileName);

      expect(icon.width).toBe(512);
      expect(icon.height).toBe(512);
      expect(icon.minX).toBeGreaterThanOrEqual(32);
      expect(icon.minY).toBeGreaterThanOrEqual(32);
      expect(icon.maxX).toBeLessThanOrEqual(479);
      expect(icon.maxY).toBeLessThanOrEqual(479);
      expect(icon.visibleWidth).toBeGreaterThanOrEqual(300);
      expect(icon.visibleHeight).toBeGreaterThanOrEqual(350);
      expect(icon.visibleHeight).toBeLessThanOrEqual(440);
      expect(icon.visiblePixels).toBeGreaterThan(65_000);
      expect(icon.transparentPixels).toBeGreaterThan(145_000);
      expect(icon.partialAlphaPixels).toBeGreaterThan(900);
    },
  );
});
