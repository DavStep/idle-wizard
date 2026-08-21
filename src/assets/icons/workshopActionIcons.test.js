import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';

const ICON_DIRECTORY = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../assets/game/source/icons',
);
const BAG_SHA_256 = 'b7cc936cb18e7c6ff68c98ab4917e62172347fa088fa67a1e2f3988867e2ac25';
const PNG_ICON_FILES = Object.freeze([
  'icon-personal-tasks-scroll-bag-style.png',
  'icon-stats-ledger-bag-style.png',
  'icon-inbox-envelope-bag-style.png',
  'icon-discoveries-journal-bag-style.png',
  'icon-quests-scroll-bag-style.png',
  'icon-leaderboard-trophy-bag-style.png',
]);
const ROOT_RUN_SIDE_ICON_FILES = Object.freeze([
  'icon-side-alliance-root-run.png',
  'icon-side-bag-root-run.png',
  'icon-side-discoveries-root-run.png',
  'icon-side-event-root-run.png',
  'icon-side-inbox-root-run.png',
  'icon-side-leaderboard-root-run.png',
  'icon-side-stats-root-run.png',
  'icon-side-tasks-root-run.png',
]);
const CONVERTED_PNG_ICON_FILES = Object.freeze([
  'icon-alliance-banner-base.png',
  'icon-alliance-banner-cloth-mask.png',
  'icon-alliance-banner-emblem.png',
  'icon-leaderboard-trophy.png',
  'icon-discoveries-journal.png',
]);

function inspectIcon(fileName) {
  const image = PNG.sync.read(fs.readFileSync(path.join(ICON_DIRECTORY, fileName)));
  const visible = new Uint8Array(image.width * image.height);
  const paletteCounts = {
    blue: 0,
    cream: 0,
    cyan: 0,
    gold: 0,
    green: 0,
    purple: 0,
    red: 0,
  };
  let darkPixels = 0;
  let partialAlphaPixels = 0;
  let visiblePixels = 0;
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const pixelIndex = y * image.width + x;
      const offset = pixelIndex * 4;
      const red = image.data[offset];
      const green = image.data[offset + 1];
      const blue = image.data[offset + 2];
      const alpha = image.data[offset + 3];

      if (alpha <= 16) {
        continue;
      }

      visible[pixelIndex] = 1;
      visiblePixels += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);

      if (alpha < 255) {
        partialAlphaPixels += 1;
      }
      if (alpha <= 160) {
        continue;
      }

      const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
      if (luminance < 50) {
        darkPixels += 1;
      }
      if (blue > red + 30 && blue > green + 10 && blue > 100) {
        paletteCounts.blue += 1;
      }
      if (red > 180 && green > 145 && blue > 95) {
        paletteCounts.cream += 1;
      }
      if (green > 100 && blue > 120 && green > red + 25 && blue > red + 30) {
        paletteCounts.cyan += 1;
      }
      if (red > 150 && green > 80 && green < red - 10 && blue < 100) {
        paletteCounts.gold += 1;
      }
      if (green > 55 && green > red + 10 && green > blue - 5) {
        paletteCounts.green += 1;
      }
      if (blue > red + 20 && blue > green + 10 && red > 35) {
        paletteCounts.purple += 1;
      }
      if (red > 120 && green < 95 && blue < 95) {
        paletteCounts.red += 1;
      }
    }
  }

  let connectedComponents = 0;
  const visited = new Uint8Array(visible.length);
  for (let start = 0; start < visible.length; start += 1) {
    if (!visible[start] || visited[start]) {
      continue;
    }

    connectedComponents += 1;
    const stack = [start];
    visited[start] = 1;
    while (stack.length > 0) {
      const current = stack.pop();
      const x = current % image.width;
      const y = Math.floor(current / image.width);
      const neighbors = [
        x > 0 ? current - 1 : -1,
        x < image.width - 1 ? current + 1 : -1,
        y > 0 ? current - image.width : -1,
        y < image.height - 1 ? current + image.width : -1,
      ];

      for (const neighbor of neighbors) {
        if (neighbor >= 0 && visible[neighbor] && !visited[neighbor]) {
          visited[neighbor] = 1;
          stack.push(neighbor);
        }
      }
    }
  }

  return {
    connectedComponents,
    darkPixelRatio: darkPixels / visiblePixels,
    height: image.height,
    maxX,
    maxY,
    minX,
    minY,
    paletteRatios: Object.fromEntries(
      Object.entries(paletteCounts).map(([name, count]) => [name, count / visiblePixels]),
    ),
    partialAlphaPixels,
    visiblePixels,
    width: image.width,
  };
}

describe('Workshop action icon assets', () => {
  it('keeps the approved Bag reference byte-for-byte unchanged', () => {
    const bag = fs.readFileSync(path.join(ICON_DIRECTORY, 'icon-bag.png'));

    expect(crypto.createHash('sha256').update(bag).digest('hex')).toBe(BAG_SHA_256);
  });

  it.each(PNG_ICON_FILES)(
    'keeps %s clean, antialiased, padded, and free of stray islands',
    (fileName) => {
      const icon = inspectIcon(fileName);

      expect(icon.width).toBeLessThanOrEqual(128);
      expect(icon.height).toBeLessThanOrEqual(128);
      expect(Math.max(icon.width, icon.height)).toBe(128);
      expect(icon.minX).toBeGreaterThanOrEqual(3);
      expect(icon.minY).toBeGreaterThanOrEqual(3);
      expect(icon.maxX).toBeLessThanOrEqual(icon.width - 4);
      expect(icon.maxY).toBeLessThanOrEqual(icon.height - 4);
      expect(icon.visiblePixels).toBeGreaterThan(7_000);
      expect(icon.partialAlphaPixels).toBeGreaterThan(500);
      expect(icon.connectedComponents).toBe(1);
      expect(icon.darkPixelRatio).toBeGreaterThan(0.18);
      expect(icon.darkPixelRatio).toBeLessThan(0.55);
    },
  );

  it.each(ROOT_RUN_SIDE_ICON_FILES)(
    'keeps approved RootRunSideAction asset %s at a consistent authored size',
    (fileName) => {
      const icon = inspectIcon(fileName);

      expect(icon.width).toBe(128);
      expect(icon.height).toBe(128);
      expect(icon.visiblePixels).toBeGreaterThan(9_000);
      expect(icon.partialAlphaPixels).toBeGreaterThan(800);
      expect(icon.darkPixelRatio).toBeGreaterThan(0.08);
    },
  );

  it('preserves each icon’s deliberate, saturated color identity', () => {
    const tasks = inspectIcon('icon-personal-tasks-scroll-bag-style.png');
    const stats = inspectIcon('icon-stats-ledger-bag-style.png');
    const inbox = inspectIcon('icon-inbox-envelope-bag-style.png');
    const discoveries = inspectIcon('icon-discoveries-journal-bag-style.png');
    const event = inspectIcon('icon-quests-scroll-bag-style.png');
    const leaderboard = inspectIcon('icon-leaderboard-trophy-bag-style.png');

    expect(tasks.paletteRatios.cream).toBeGreaterThan(0.35);
    expect(tasks.paletteRatios.purple).toBeGreaterThan(0.06);
    expect(tasks.paletteRatios.blue).toBeGreaterThan(0.06);

    expect(stats.paletteRatios.purple).toBeGreaterThan(0.45);
    expect(stats.paletteRatios.gold).toBeGreaterThan(0.07);

    expect(inbox.paletteRatios.green).toBeGreaterThan(0.5);
    expect(inbox.paletteRatios.cream).toBeGreaterThan(0.12);

    expect(discoveries.paletteRatios.purple).toBeGreaterThan(0.35);
    expect(discoveries.paletteRatios.cyan).toBeGreaterThan(0.06);
    expect(discoveries.paletteRatios.gold).toBeGreaterThan(0.07);

    expect(event.paletteRatios.cream).toBeGreaterThan(0.35);
    expect(event.paletteRatios.red).toBeGreaterThan(0.08);
    expect(event.paletteRatios.blue).toBeGreaterThan(0.05);

    expect(leaderboard.paletteRatios.gold).toBeGreaterThan(0.45);
  });

  it.each(CONVERTED_PNG_ICON_FILES)('keeps %s as a non-empty PNG runtime asset', (fileName) => {
    const bytes = fs.readFileSync(path.join(ICON_DIRECTORY, fileName));

    expect(bytes.length).toBeGreaterThan(1_000);
    expect(bytes.subarray(1, 4).toString('ascii')).toBe('PNG');
    expect(() => PNG.sync.read(bytes)).not.toThrow();
  });

  it('derives the configurable banner layers from the canonical single-tail pennant', () => {
    const source = PNG.sync.read(
      fs.readFileSync(path.join(ICON_DIRECTORY, 'icon-side-alliance-root-run.png')),
    );
    const base = PNG.sync.read(
      fs.readFileSync(path.join(ICON_DIRECTORY, 'icon-alliance-banner-base.png')),
    );
    const cloth = PNG.sync.read(
      fs.readFileSync(path.join(ICON_DIRECTORY, 'icon-alliance-banner-cloth-mask.png')),
    );

    expect(base.width).toBe(source.width);
    expect(base.height).toBe(source.height);
    expect(cloth.width).toBe(source.width);
    expect(cloth.height).toBe(source.height);

    for (let offset = 3; offset < source.data.length; offset += 4) {
      const sourceAlpha = source.data[offset];
      const baseAlpha = base.data[offset];
      const clothAlpha = cloth.data[offset];
      expect(Math.max(baseAlpha, clothAlpha)).toBe(sourceAlpha);
      expect(baseAlpha > 0 && clothAlpha > 0).toBe(false);
    }
  });

  it('keeps the banner rod-cap contours out of the tintable cloth mask', () => {
    const cloth = PNG.sync.read(
      fs.readFileSync(path.join(ICON_DIRECTORY, 'icon-alliance-banner-cloth-mask.png')),
    );

    for (let y = 0; y < cloth.height; y += 1) {
      for (let x = 0; x < cloth.width; x += 1) {
        if (x >= 25 && x <= 102) {
          continue;
        }
        expect(cloth.data[(y * cloth.width + x) * 4 + 3]).toBe(0);
      }
    }
  });
});
