import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';

const ASSET_DIRECTORY = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../assets/game/source/rooms/garden/plots',
);

function inspectSoil(filename) {
  const png = PNG.sync.read(
    readFileSync(path.join(ASSET_DIRECTORY, filename)),
  );
  const visibleBounds = {
    maxX: -1,
    maxY: -1,
    minX: png.width,
    minY: png.height,
  };
  const mainColor = [0, 0, 0];
  let mainPixelCount = 0;
  let nearBlackPixelCount = 0;
  let visiblePixelCount = 0;

  for (let offset = 0; offset < png.data.length; offset += 4) {
    const pixel = offset / 4;
    const x = pixel % png.width;
    const y = Math.floor(pixel / png.width);
    const red = png.data[offset];
    const green = png.data[offset + 1];
    const blue = png.data[offset + 2];
    const alpha = png.data[offset + 3];
    if (alpha <= 128) {
      continue;
    }

    visibleBounds.minX = Math.min(visibleBounds.minX, x);
    visibleBounds.maxX = Math.max(visibleBounds.maxX, x);
    visibleBounds.minY = Math.min(visibleBounds.minY, y);
    visibleBounds.maxY = Math.max(visibleBounds.maxY, y);
    visiblePixelCount += 1;
    const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
    if (luminance < 45) {
      nearBlackPixelCount += 1;
    }
    if (luminance > 65) {
      mainColor[0] += red;
      mainColor[1] += green;
      mainColor[2] += blue;
      mainPixelCount += 1;
    }
  }

  return {
    height: png.height,
    mainColor: mainColor.map((channel) => channel / mainPixelCount),
    nearBlackRatio: nearBlackPixelCount / visiblePixelCount,
    visibleAspect:
      (visibleBounds.maxX - visibleBounds.minX + 1) /
      (visibleBounds.maxY - visibleBounds.minY + 1),
    width: png.width,
  };
}

describe('Garden soil assets', () => {
  it('keeps the automated bed proportional and color-matched to one plot', () => {
    const single = inspectSoil('outpost-plot-ground-level-5.png');
    const automated = inspectSoil('outpost-plot-ground-automated.png');

    expect(automated).toMatchObject({ height: 150, width: 576 });
    expect(automated.visibleAspect).toBeCloseTo(3.84, 2);
    automated.mainColor.forEach((channel, index) => {
      expect(channel).toBeCloseTo(single.mainColor[index], 0);
    });
    expect(automated.nearBlackRatio).toBeCloseTo(single.nearBlackRatio, 2);
  });
});
