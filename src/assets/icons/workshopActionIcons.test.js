import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';

const ICON_DIRECTORY = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../assets/game/source/icons',
);

function inspectIcon(fileName) {
  const image = PNG.sync.read(
    fs.readFileSync(path.join(ICON_DIRECTORY, fileName)),
  );
  let darkPixels = 0;
  let partialAlphaPixels = 0;
  let visiblePixels = 0;
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const offset = (y * image.width + x) * 4;
      const red = image.data[offset];
      const green = image.data[offset + 1];
      const blue = image.data[offset + 2];
      const alpha = image.data[offset + 3];

      if (alpha <= 16) {
        continue;
      }

      visiblePixels += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);

      if (alpha < 255) {
        partialAlphaPixels += 1;
      }

      const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
      if (alpha > 160 && luminance < 34) {
        darkPixels += 1;
      }
    }
  }

  return {
    darkPixelRatio: darkPixels / visiblePixels,
    height: image.height,
    partialAlphaPixels,
    visibleHeight: maxY - minY + 1,
    visibleWidth: maxX - minX + 1,
    width: image.width,
  };
}

describe('Workshop action icon assets', () => {
  it('keeps the inbox owl readable with bag-weight contours at HUD scale', () => {
    const icon = inspectIcon('icon-inbox-envelope-bag-style.png');

    expect(icon.width).toBe(512);
    expect(icon.height).toBe(512);
    expect(icon.darkPixelRatio).toBeGreaterThanOrEqual(0.43);
    expect(icon.darkPixelRatio).toBeLessThanOrEqual(0.49);
    expect(icon.visibleWidth).toBeGreaterThanOrEqual(365);
    expect(icon.visibleWidth).toBeLessThanOrEqual(372);
    expect(icon.visibleHeight).toBeGreaterThanOrEqual(466);
    expect(icon.visibleHeight).toBeLessThanOrEqual(472);
    expect(icon.partialAlphaPixels).toBeGreaterThan(1_000);
  });
});
