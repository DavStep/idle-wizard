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
  let orangePixels = 0;
  let parchmentPixels = 0;
  let partialAlphaPixels = 0;
  let tealPixels = 0;
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
      if (
        alpha > 160 &&
        red >= 180 &&
        green >= 80 &&
        green < 160 &&
        blue < 75
      ) {
        orangePixels += 1;
      }
      if (
        alpha > 160 &&
        red >= 190 &&
        green >= 160 &&
        blue >= 100 &&
        red > blue + 35
      ) {
        parchmentPixels += 1;
      }
      if (
        alpha > 160 &&
        blue > red + 12 &&
        green > red + 8 &&
        green >= 75
      ) {
        tealPixels += 1;
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
    orangePixelRatio: orangePixels / visiblePixels,
    parchmentPixelRatio: parchmentPixels / visiblePixels,
    partialAlphaPixels,
    tealPixelRatio: tealPixels / visiblePixels,
    visibleHeight: maxY - minY + 1,
    visibleWidth: maxX - minX + 1,
    width: image.width,
  };
}

function measureDarkRun(image, x, y, axis) {
  const isDark = (sampleX, sampleY) => {
    const offset = (sampleY * image.width + sampleX) * 4;
    const red = image.data[offset];
    const green = image.data[offset + 1];
    const blue = image.data[offset + 2];
    const alpha = image.data[offset + 3];
    const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
    return alpha > 160 && luminance < 34;
  };
  const stepX = axis === 'x' ? 1 : 0;
  const stepY = axis === 'y' ? 1 : 0;
  let startX = x;
  let startY = y;
  let endX = x;
  let endY = y;

  while (
    startX - stepX >= 0 &&
    startY - stepY >= 0 &&
    isDark(startX - stepX, startY - stepY)
  ) {
    startX -= stepX;
    startY -= stepY;
  }

  while (
    endX + stepX < image.width &&
    endY + stepY < image.height &&
    isDark(endX + stepX, endY + stepY)
  ) {
    endX += stepX;
    endY += stepY;
  }

  return axis === 'x' ? endX - startX + 1 : endY - startY + 1;
}

function measureDarkRingRatio(
  image,
  { centerX, centerY, innerRadius, outerRadius },
) {
  let darkPixels = 0;
  let ringPixels = 0;

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const radius = Math.hypot(x - centerX, y - centerY);
      if (radius < innerRadius || radius > outerRadius) {
        continue;
      }

      ringPixels += 1;
      const offset = (y * image.width + x) * 4;
      const red = image.data[offset];
      const green = image.data[offset + 1];
      const blue = image.data[offset + 2];
      const alpha = image.data[offset + 3];
      const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;

      if (alpha > 160 && luminance < 50) {
        darkPixels += 1;
      }
    }
  }

  return darkPixels / ringPixels;
}

describe('Workshop action icon assets', () => {
  it('keeps the Quests scroll within the Bag icon size, light, and stroke family', () => {
    const bag = inspectIcon('icon-bag.png');
    const quests = inspectIcon('icon-quests-scroll-bag-style.png');

    expect(quests.width).toBe(bag.width);
    expect(quests.height).toBe(bag.height);
    expect(quests.visibleWidth).toBeGreaterThanOrEqual(62);
    expect(quests.visibleHeight).toBeGreaterThanOrEqual(72);
    expect(quests.darkPixelRatio).toBeGreaterThanOrEqual(
      bag.darkPixelRatio,
    );
    expect(quests.darkPixelRatio).toBeLessThanOrEqual(0.25);
    expect(quests.partialAlphaPixels).toBeGreaterThan(200);
  });

  it('keeps the Stats report within the Bag icon family with a dominant pie chart', () => {
    const bag = inspectIcon('icon-bag.png');
    const stats = inspectIcon('icon-stats-ledger-bag-style.png');
    const image = PNG.sync.read(
      fs.readFileSync(
        path.join(ICON_DIRECTORY, 'icon-stats-ledger-bag-style.png'),
      ),
    );

    expect(stats.width).toBe(75);
    expect(stats.height).toBe(83);
    expect(stats.visibleWidth).toBeGreaterThanOrEqual(63);
    expect(stats.visibleWidth).toBeLessThanOrEqual(66);
    expect(stats.visibleHeight).toBeGreaterThanOrEqual(80);
    expect(stats.visibleHeight).toBeLessThanOrEqual(82);
    expect(stats.darkPixelRatio).toBeGreaterThanOrEqual(
      bag.darkPixelRatio,
    );
    expect(stats.darkPixelRatio).toBeLessThanOrEqual(0.25);
    expect(stats.parchmentPixelRatio).toBeGreaterThanOrEqual(0.35);
    expect(stats.parchmentPixelRatio).toBeLessThanOrEqual(0.5);
    expect(stats.tealPixelRatio).toBeGreaterThanOrEqual(0.05);
    expect(stats.tealPixelRatio).toBeLessThanOrEqual(0.12);
    expect(stats.orangePixelRatio).toBeLessThanOrEqual(0.03);
    expect(stats.partialAlphaPixels).toBeGreaterThan(100);
    expect(
      measureDarkRingRatio(image, {
        centerX: 36,
        centerY: 31,
        innerRadius: 14,
        outerRadius: 19,
      }),
    ).toBeGreaterThan(0.13);
  });

  it('keeps the inbox owl readable with one moderate inner and outer stroke weight', () => {
    const icon = inspectIcon('icon-inbox-envelope-bag-style.png');
    const image = PNG.sync.read(
      fs.readFileSync(
        path.join(ICON_DIRECTORY, 'icon-inbox-envelope-bag-style.png'),
      ),
    );

    expect(icon.width).toBe(512);
    expect(icon.height).toBe(512);
    expect(icon.darkPixelRatio).toBeGreaterThanOrEqual(0.39);
    expect(icon.darkPixelRatio).toBeLessThanOrEqual(0.44);
    expect(icon.visibleWidth).toBeGreaterThanOrEqual(350);
    expect(icon.visibleWidth).toBeLessThanOrEqual(362);
    expect(icon.visibleHeight).toBeGreaterThanOrEqual(455);
    expect(icon.visibleHeight).toBeLessThanOrEqual(466);
    expect(icon.partialAlphaPixels).toBeGreaterThan(700);

    const representativeStrokeWidths = [
      measureDarkRun(image, 270, 46, 'y'),
      measureDarkRun(image, 255, 130, 'x'),
      measureDarkRun(image, 190, 170, 'x'),
      measureDarkRun(image, 365, 170, 'x'),
      measureDarkRun(image, 330, 250, 'y'),
      measureDarkRun(image, 93, 370, 'x'),
      measureDarkRun(image, 343, 370, 'x'),
    ];

    expect(Math.min(...representativeStrokeWidths)).toBeGreaterThanOrEqual(10);
    expect(Math.max(...representativeStrokeWidths)).toBeLessThanOrEqual(18);
  });
});
