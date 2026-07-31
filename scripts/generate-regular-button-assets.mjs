import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { PNG } from 'pngjs';

const ROOT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const SOURCE_DIR = path.join(
  ROOT_DIR,
  'assets/game/source/ui/root-run-cost-button',
);
const OUTPUT_DIR = path.join(
  ROOT_DIR,
  'assets/game/source/ui/regular-button',
);
const MASTER_DIR = path.join(
  ROOT_DIR,
  'assets/game/masters/ui/regular-button',
);
const SOURCE_CENTER_X = 160;
const SOURCE_CENTER_Y = 100;
const CENTER_SIZE = 3;
const LEGACY_COMPACT_SLICE = Object.freeze({
  left: 85,
  right: 43,
});
const LEGACY_COMPACT_CENTER_WIDTH = 2;

const COLORS = Object.freeze({
  blue: path.join(SOURCE_DIR, 'blue-button-short.png'),
  brown: path.join(SOURCE_DIR, 'brown-button.png'),
  gray: path.join(SOURCE_DIR, 'gray-button-short.png'),
  green: path.join(SOURCE_DIR, 'green-button-short.9.png'),
  purple: path.join(SOURCE_DIR, 'purple-button-short.png'),
  red: path.join(MASTER_DIR, 'red-button-50.png'),
  yellow: path.join(SOURCE_DIR, 'yellow-button-short.png'),
});

const TIERS = Object.freeze([
  Object.freeze({
    radius: 50,
    width: 141,
    height: 171,
    slice: Object.freeze({
      left: 86,
      top: 100,
      right: 52,
      bottom: 68,
    }),
  }),
  Object.freeze({
    radius: 30,
    width: 87,
    height: 104,
    slice: Object.freeze({
      left: 52,
      top: 60,
      right: 32,
      bottom: 41,
    }),
  }),
  Object.freeze({
    radius: 15,
    width: 46,
    height: 53,
    slice: Object.freeze({
      left: 27,
      top: 30,
      right: 16,
      bottom: 20,
    }),
  }),
]);

mkdirSync(OUTPUT_DIR, { recursive: true });

for (const [color, sourcePath] of Object.entries(COLORS)) {
  const rawSource = readPng(sourcePath);
  const source = color === 'red'
    ? transferCompactPalette(readPng(COLORS.green), rawSource)
    : rawSource;
  const sourceName = path.relative(ROOT_DIR, sourcePath);

  for (const tier of TIERS) {
    const tierSource = createTierSource(source, tier);
    const sourceCenterX = Math.round(
      SOURCE_CENTER_X * tierSource.width / source.width,
    );
    const sourceCenterY = Math.round(
      SOURCE_CENTER_Y * tierSource.height / source.height,
    );
    const image = distillTier(
      tierSource,
      sourceName,
      tier,
      sourceCenterX,
      sourceCenterY,
    );
    const filename = `${color}-button-${tier.radius}.9.png`;
    const outputPath = path.join(OUTPUT_DIR, filename);

    writeFileSync(outputPath, PNG.sync.write(image));
    writeFileSync(
      `${outputPath.replace(/\.png$/i, '')}.9slice.json`,
      `${JSON.stringify(createMetadata(filename, image, tier), null, 2)}\n`,
    );
  }
}

process.stdout.write(
  `Generated ${Object.keys(COLORS).length * TIERS.length} regular button assets in ${
    path.relative(ROOT_DIR, OUTPUT_DIR)
  }\n`,
);

function readPng(filename) {
  return PNG.sync.read(readFileSync(filename));
}

function createTierSource(source, tier) {
  if (tier.radius === 50) {
    return source;
  }

  return resizeLanczos(
    source,
    Math.round(source.width * tier.radius / 50),
    tier.slice.top + 1 + tier.slice.bottom,
  );
}

function distillTier(
  source,
  sourceName,
  tier,
  sourceCenterX,
  sourceCenterY,
) {
  const { slice } = tier;
  const expectedHeight = slice.top + 1 + slice.bottom;

  if (
    source.width <= slice.left + slice.right
    || source.height !== expectedHeight
    || sourceCenterX < slice.left
    || sourceCenterX >= source.width - slice.right
    || sourceCenterY < slice.top
    || sourceCenterY >= source.height - slice.bottom
  ) {
    throw new Error(
      `${sourceName} cannot produce the radius-${tier.radius} regular button geometry`,
    );
  }

  const output = new PNG({
    width: tier.width,
    height: tier.height,
  });

  for (let y = 0; y < output.height; y += 1) {
    const sourceY = mapDistilledCoordinate(
      y,
      slice.top,
      slice.bottom,
      source.height,
      sourceCenterY,
    );

    for (let x = 0; x < output.width; x += 1) {
      const sourceX = mapDistilledCoordinate(
        x,
        slice.left,
        slice.right,
        source.width,
        sourceCenterX,
      );

      copyPixel(source, output, sourceX, sourceY, x, y);
    }
  }

  return addCleanStretchGutters(output, slice);
}

function mapDistilledCoordinate(
  coordinate,
  leadingSlice,
  trailingSlice,
  sourceSize,
  centerCoordinate,
) {
  if (coordinate < leadingSlice) {
    return coordinate;
  }
  if (coordinate < leadingSlice + CENTER_SIZE) {
    return centerCoordinate;
  }

  return sourceSize - trailingSlice
    + coordinate - leadingSlice - CENTER_SIZE;
}

function copyPixel(source, output, sourceX, sourceY, outputX, outputY) {
  const sourceStart = (sourceY * source.width + sourceX) * 4;
  const outputStart = (outputY * output.width + outputX) * 4;

  source.data.copy(output.data, outputStart, sourceStart, sourceStart + 4);
}

function addCleanStretchGutters(image, slice) {
  for (let y = 0; y < image.height; y += 1) {
    copyPixel(image, image, slice.left, y, slice.left - 1, y);
    copyPixel(
      image,
      image,
      slice.left,
      y,
      slice.left + CENTER_SIZE,
      y,
    );
  }

  for (let x = 0; x < image.width; x += 1) {
    copyPixel(image, image, x, slice.top, x, slice.top - 1);
    copyPixel(
      image,
      image,
      x,
      slice.top,
      x,
      slice.top + CENTER_SIZE,
    );
  }

  return image;
}

function transferCompactPalette(geometrySource, paletteSource) {
  const compactGeometry = createLegacyCompactSource(geometrySource);

  if (
    paletteSource.width !== compactGeometry.width
    || paletteSource.height !== compactGeometry.height
  ) {
    throw new Error(
      'The red regular-button palette master must match the legacy compact geometry',
    );
  }

  const palette = new Map();

  for (let index = 0; index < compactGeometry.data.length; index += 4) {
    const geometryColor = readPixelColor(compactGeometry, index);
    const paletteColor = readPixelColor(paletteSource, index);
    const existing = palette.get(geometryColor);

    if (existing && existing !== paletteColor) {
      throw new Error(
        `The red regular-button palette maps ${geometryColor} inconsistently`,
      );
    }
    palette.set(geometryColor, paletteColor);
  }

  const output = new PNG({
    width: geometrySource.width,
    height: geometrySource.height,
  });
  const paletteEntries = [...palette].map(([sourceColor, targetColor]) => ({
    source: sourceColor.split(',').map(Number),
    target: targetColor.split(',').map(Number),
  }));

  for (let index = 0; index < geometrySource.data.length; index += 4) {
    const sourceColor = readPixelColor(geometrySource, index);
    const targetColor = palette.get(sourceColor)
      ?? findNearestPaletteColor(
        [...geometrySource.data.subarray(index, index + 4)],
        paletteEntries,
      );

    output.data.set(
      typeof targetColor === 'string'
        ? targetColor.split(',').map(Number)
        : targetColor,
      index,
    );
  }

  return output;
}

function createLegacyCompactSource(source) {
  const output = new PNG({
    width:
      LEGACY_COMPACT_SLICE.left
      + LEGACY_COMPACT_CENTER_WIDTH
      + LEGACY_COMPACT_SLICE.right,
    height: source.height,
  });

  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < output.width; x += 1) {
      const sourceX = x < LEGACY_COMPACT_SLICE.left
        ? x
        : x < (
          LEGACY_COMPACT_SLICE.left + LEGACY_COMPACT_CENTER_WIDTH
        )
          ? SOURCE_CENTER_X + x - LEGACY_COMPACT_SLICE.left
          : source.width - LEGACY_COMPACT_SLICE.right
            + x
            - LEGACY_COMPACT_SLICE.left
            - LEGACY_COMPACT_CENTER_WIDTH;

      copyPixel(source, output, sourceX, y, x, y);
    }
  }

  return output;
}

function readPixelColor(image, index) {
  return [...image.data.subarray(index, index + 4)].join(',');
}

function findNearestPaletteColor(color, paletteEntries) {
  let nearest = paletteEntries[0];
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const entry of paletteEntries) {
    const distance = color.reduce(
      (total, channel, index) =>
        total + (channel - entry.source[index]) ** 2,
      0,
    );

    if (distance < nearestDistance) {
      nearest = entry;
      nearestDistance = distance;
    }
  }

  return nearest.target;
}

function resizeLanczos(source, width, height) {
  const output = new PNG({ width, height });
  const scaleX = width / source.width;
  const scaleY = height / source.height;
  const filterScaleX = Math.min(1, scaleX);
  const filterScaleY = Math.min(1, scaleY);
  const supportX = 3 / filterScaleX;
  const supportY = 3 / filterScaleY;

  for (let y = 0; y < height; y += 1) {
    const sourceY = ((y + 0.5) / scaleY) - 0.5;
    const minY = Math.max(0, Math.ceil(sourceY - supportY));
    const maxY = Math.min(
      source.height - 1,
      Math.floor(sourceY + supportY),
    );

    for (let x = 0; x < width; x += 1) {
      const sourceX = ((x + 0.5) / scaleX) - 0.5;
      const minX = Math.max(0, Math.ceil(sourceX - supportX));
      const maxX = Math.min(
        source.width - 1,
        Math.floor(sourceX + supportX),
      );
      let weightTotal = 0;
      let alphaTotal = 0;
      let redTotal = 0;
      let greenTotal = 0;
      let blueTotal = 0;

      for (let sampleY = minY; sampleY <= maxY; sampleY += 1) {
        const weightY = lanczos(
          (sampleY - sourceY) * filterScaleY,
          3,
        );

        for (let sampleX = minX; sampleX <= maxX; sampleX += 1) {
          const weight = weightY * lanczos(
            (sampleX - sourceX) * filterScaleX,
            3,
          );

          if (weight === 0) {
            continue;
          }

          const sourceIndex = (
            sampleY * source.width + sampleX
          ) * 4;
          const alpha = source.data[sourceIndex + 3] / 255;

          weightTotal += weight;
          alphaTotal += alpha * weight;
          redTotal += source.data[sourceIndex] * alpha * weight;
          greenTotal += source.data[sourceIndex + 1] * alpha * weight;
          blueTotal += source.data[sourceIndex + 2] * alpha * weight;
        }
      }

      const outputIndex = (y * width + x) * 4;
      const normalizedAlpha = weightTotal === 0
        ? 0
        : alphaTotal / weightTotal;

      output.data[outputIndex + 3] = clampByte(normalizedAlpha * 255);
      if (alphaTotal <= 0) {
        output.data[outputIndex] = 0;
        output.data[outputIndex + 1] = 0;
        output.data[outputIndex + 2] = 0;
      } else {
        output.data[outputIndex] = clampByte(redTotal / alphaTotal);
        output.data[outputIndex + 1] = clampByte(greenTotal / alphaTotal);
        output.data[outputIndex + 2] = clampByte(blueTotal / alphaTotal);
      }
    }
  }

  return output;
}

function lanczos(value, radius) {
  const distance = Math.abs(value);

  if (distance === 0) {
    return 1;
  }
  if (distance >= radius) {
    return 0;
  }

  return sinc(Math.PI * value)
    * sinc((Math.PI * value) / radius);
}

function sinc(value) {
  return Math.sin(value) / value;
}

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function createMetadata(filename, image, tier) {
  const relativePath = path.posix.join(
    'assets/game/source/ui/regular-button',
    filename,
  );

  return {
    version: 1,
    format: 'png',
    asset: filename,
    source: {
      path: relativePath,
      width: image.width,
      height: image.height,
      mode: 'RGBA',
      crop: {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
      },
    },
    sourceCropSize: {
      width: image.width,
      height: image.height,
    },
    slice: tier.slice,
    mode: 'source',
    distill: null,
    rendering: {
      stretch: 'edges-and-center',
      outputInsets: tier.slice,
      minimumCenter: {
        width: CENTER_SIZE,
        height: CENTER_SIZE,
      },
      minimumSize: {
        width: image.width,
        height: image.height,
      },
      qaResample: 'nearest',
      browserPreviewSmoothingDefault: false,
    },
    editor: {
      tool: 'Idle Wizard regular button generator',
      sourceAssetPreserved: true,
    },
  };
}
