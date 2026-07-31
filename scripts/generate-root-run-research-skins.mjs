/* global console */

import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import pngjs from 'pngjs';

import { writeFileIfChanged } from './write-file-if-changed.mjs';

const { PNG } = pngjs;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSET_DIR = path.join(ROOT, 'assets/game/source/ui/root-run-research');
const LOCKED_CARD_SOURCE = 'research-upgrade-bg-locked.png';
const LOCKED_ART_SOURCE = 'squirqle-40-locked.png';
const LOCKED_CARD_MONOCHROME = Object.freeze({ floor: 12, scale: 0.28 });
const LOCKED_ART_MONOCHROME = Object.freeze({ floor: 12, scale: 0.34 });

const recipes = Object.freeze([
  {
    input: 'research-upgrade-bg.png',
    output: 'research-card-1000x304.9.png',
    slice: { left: 64, top: 55, right: 77, bottom: 88 },
    width: 1000,
    height: 304,
  },
  {
    input: LOCKED_CARD_SOURCE,
    output: 'research-card-locked-1000x304.9.png',
    slice: { left: 64, top: 55, right: 77, bottom: 88 },
    width: 1000,
    height: 304,
  },
  {
    input: 'squirqle-40-cream.png',
    output: 'research-art-well-204x194.9.png',
    slice: { left: 49, top: 49, right: 50, bottom: 50 },
    width: 204,
    height: 194,
  },
  {
    input: LOCKED_ART_SOURCE,
    output: 'research-art-well-locked-204x194.9.png',
    slice: { left: 49, top: 49, right: 50, bottom: 50 },
    width: 204,
    height: 194,
  },
  {
    input: 'upgrade-lvl-bg.png',
    output: 'research-rank-badge-217x62.png',
    slice: { left: 36, top: 15, right: 37, bottom: 10 },
    width: 217,
    height: 62,
  },
]);

mkdirSync(ASSET_DIR, { recursive: true });

let changed = 0;
const lockedCardSource = createMonochromeVariant(
  PNG.sync.read(readFileSync(path.join(ASSET_DIR, 'research-upgrade-bg.png'))),
  LOCKED_CARD_MONOCHROME,
);
const lockedArtSource = createMonochromeVariant(
  PNG.sync.read(readFileSync(path.join(ASSET_DIR, 'squirqle-40-cream.png'))),
  LOCKED_ART_MONOCHROME,
);

for (const [fileName, image] of [
  [LOCKED_CARD_SOURCE, lockedCardSource],
  [LOCKED_ART_SOURCE, lockedArtSource],
]) {
  if (
    writeFileIfChanged(
      path.join(ASSET_DIR, fileName),
      PNG.sync.write(image),
    )
  ) {
    changed += 1;
  }
}

for (const recipe of recipes) {
  const source = PNG.sync.read(
    readFileSync(path.join(ASSET_DIR, recipe.input)),
  );
  const rendered = renderNineSlice(source, recipe);

  if (
    writeFileIfChanged(
      path.join(ASSET_DIR, recipe.output),
      PNG.sync.write(rendered),
    )
  ) {
    changed += 1;
  }
}

console.log(
  `generated locked research sources and ${recipes.length} fixed-size Root Run research skins (${changed} changed)`,
);

function createMonochromeVariant(source, { floor, scale }) {
  const output = new PNG({ width: source.width, height: source.height });

  for (let offset = 0; offset < source.data.length; offset += 4) {
    const luminance =
      source.data[offset] * 0.2126 +
      source.data[offset + 1] * 0.7152 +
      source.data[offset + 2] * 0.0722;
    const gray = Math.round(floor + luminance * scale);

    output.data[offset] = gray;
    output.data[offset + 1] = gray;
    output.data[offset + 2] = gray;
    output.data[offset + 3] = source.data[offset + 3];
  }

  return output;
}

function renderNineSlice(source, { slice, width, height }) {
  validateSlice(source, slice, width, height);

  const output = new PNG({ width, height });
  const sourceX = [0, slice.left, source.width - slice.right, source.width];
  const sourceY = [0, slice.top, source.height - slice.bottom, source.height];
  const targetX = [0, slice.left, width - slice.right, width];
  const targetY = [0, slice.top, height - slice.bottom, height];

  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      resizeRegion({
        source,
        output,
        sourceX: sourceX[column],
        sourceY: sourceY[row],
        sourceWidth: sourceX[column + 1] - sourceX[column],
        sourceHeight: sourceY[row + 1] - sourceY[row],
        targetX: targetX[column],
        targetY: targetY[row],
        targetWidth: targetX[column + 1] - targetX[column],
        targetHeight: targetY[row + 1] - targetY[row],
      });
    }
  }

  return output;
}

function validateSlice(source, slice, width, height) {
  if (
    slice.left <= 0 ||
    slice.top <= 0 ||
    slice.right <= 0 ||
    slice.bottom <= 0
  ) {
    throw new Error('Nine-slice margins must be positive.');
  }

  if (
    slice.left + slice.right >= source.width ||
    slice.top + slice.bottom >= source.height
  ) {
    throw new Error('Nine-slice margins leave no source stretch region.');
  }

  if (
    slice.left + slice.right >= width ||
    slice.top + slice.bottom >= height
  ) {
    throw new Error('Nine-slice margins leave no output stretch region.');
  }
}

function resizeRegion({
  source,
  output,
  sourceX,
  sourceY,
  sourceWidth,
  sourceHeight,
  targetX,
  targetY,
  targetWidth,
  targetHeight,
}) {
  for (let y = 0; y < targetHeight; y += 1) {
    const sampleY = mapSample(y, targetHeight, sourceHeight);
    const sourceY0 = Math.floor(sampleY);
    const sourceY1 = Math.min(sourceHeight - 1, sourceY0 + 1);
    const mixY = sampleY - sourceY0;

    for (let x = 0; x < targetWidth; x += 1) {
      const sampleX = mapSample(x, targetWidth, sourceWidth);
      const sourceX0 = Math.floor(sampleX);
      const sourceX1 = Math.min(sourceWidth - 1, sourceX0 + 1);
      const mixX = sampleX - sourceX0;
      const targetOffset = ((targetY + y) * output.width + targetX + x) * 4;
      const samples = [
        readPixel(source, sourceX + sourceX0, sourceY + sourceY0),
        readPixel(source, sourceX + sourceX1, sourceY + sourceY0),
        readPixel(source, sourceX + sourceX0, sourceY + sourceY1),
        readPixel(source, sourceX + sourceX1, sourceY + sourceY1),
      ];
      const weights = [
        (1 - mixX) * (1 - mixY),
        mixX * (1 - mixY),
        (1 - mixX) * mixY,
        mixX * mixY,
      ];
      const alpha = samples.reduce(
        (sum, sample, index) => sum + sample[3] * weights[index],
        0,
      );

      output.data[targetOffset + 3] = Math.round(alpha);

      for (let channel = 0; channel < 3; channel += 1) {
        const premultiplied = samples.reduce(
          (sum, sample, index) =>
            sum + sample[channel] * sample[3] * weights[index],
          0,
        );
        output.data[targetOffset + channel] =
          alpha > 0 ? Math.round(premultiplied / alpha) : 0;
      }
    }
  }
}

function mapSample(index, targetSize, sourceSize) {
  if (targetSize <= 1 || sourceSize <= 1) {
    return 0;
  }

  return (index * (sourceSize - 1)) / (targetSize - 1);
}

function readPixel(image, x, y) {
  const offset = (y * image.width + x) * 4;

  return [
    image.data[offset],
    image.data[offset + 1],
    image.data[offset + 2],
    image.data[offset + 3],
  ];
}
