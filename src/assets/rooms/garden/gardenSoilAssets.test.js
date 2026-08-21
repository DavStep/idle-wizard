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

  const luminanceAt = (x, y) => {
    const offset = (y * png.width + x) * 4;
    return (
      png.data[offset] * 0.2126 +
      png.data[offset + 1] * 0.7152 +
      png.data[offset + 2] * 0.0722
    );
  };
  const meanRegionLuminance = ({ height, width, x, y }) => {
    let count = 0;
    let total = 0;
    for (let regionY = y; regionY < y + height; regionY += 1) {
      for (let regionX = x; regionX < x + width; regionX += 1) {
        const alpha = png.data[(regionY * png.width + regionX) * 4 + 3];
        if (alpha <= 128) {
          continue;
        }
        total += luminanceAt(regionX, regionY);
        count += 1;
      }
    }
    return total / count;
  };
  const meanRimDepth = (side) => {
    let totalDepth = 0;
    let sampleCount = 0;
    const startX = Math.floor(png.width * 0.1);
    const endX = Math.ceil(png.width * 0.9);
    for (let x = startX; x < endX; x += 1) {
      const step = side === 'top' ? 1 : -1;
      let y = side === 'top' ? 0 : png.height - 1;
      while (
        y >= 0 &&
        y < png.height &&
        png.data[(y * png.width + x) * 4 + 3] <= 128
      ) {
        y += step;
      }
      let depth = 0;
      while (y >= 0 && y < png.height && luminanceAt(x, y) < 45) {
        depth += 1;
        y += step;
      }
      totalDepth += depth;
      sampleCount += 1;
    }
    return totalDepth / sampleCount / png.height;
  };

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
    const luminance = luminanceAt(x, y);
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

  const slotPatchContrasts = Array.from({ length: 5 }, (_, slotIndex) => {
    const centerX = Math.round((png.width * (slotIndex + 0.5)) / 5);
    const sampleWidth = Math.round(png.width * 0.09);
    const x = centerX - Math.round(sampleWidth / 2);
    const patch = meanRegionLuminance({
      height: Math.round(png.height * 0.35),
      width: sampleWidth,
      x,
      y: Math.round(png.height * 0.25),
    });
    const cleanSoil = meanRegionLuminance({
      height: Math.round(png.height * 0.12),
      width: sampleWidth,
      x,
      y: Math.round(png.height * 0.12),
    });
    return Math.abs(cleanSoil - patch);
  });

  return {
    bottomRimRatio: meanRimDepth('bottom'),
    height: png.height,
    mainColor: mainColor.map((channel) => channel / mainPixelCount),
    nearBlackRatio: nearBlackPixelCount / visiblePixelCount,
    slotPatchContrast:
      slotPatchContrasts.reduce((total, contrast) => total + contrast, 0) /
      slotPatchContrasts.length,
    topRimRatio: meanRimDepth('top'),
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
    expect(Math.abs(automated.topRimRatio - single.topRimRatio)).toBeLessThan(
      0.01,
    );
    expect(
      Math.abs(automated.bottomRimRatio - single.bottomRimRatio),
    ).toBeLessThan(0.01);
    expect(automated.nearBlackRatio).toBeGreaterThan(0.06);
    expect(automated.slotPatchContrast).toBeLessThan(1);
  });
});
