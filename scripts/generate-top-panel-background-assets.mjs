import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PNG } from 'pngjs';

import { writeFileIfChanged } from './write-file-if-changed.mjs';

const ROOT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const UI_ASSET_DIR = path.join(ROOT_DIR, 'assets/game/source/ui');
const SOURCE_SLICE = Object.freeze({
  left: 40,
  top: 40,
  right: 40,
  bottom: 1,
});
const RESIZED_SLICE = Object.freeze({
  left: 30,
  top: 30,
  right: 30,
  bottom: 1,
});
const OUTPUT_SLICE = Object.freeze({
  left: 30,
  top: 1,
  right: 30,
  bottom: 30,
});
const RECIPES = Object.freeze([
  Object.freeze({
    source: 'midnight-room-tab-top-cap.9.png',
    output: 'midnight-top-panel-background.9.png',
  }),
  Object.freeze({
    source: 'day-room-tab-top-cap.9.png',
    output: 'day-top-panel-background.9.png',
  }),
]);

let changed = 0;

for (const recipe of RECIPES) {
  const source = PNG.sync.read(
    readFileSync(path.join(UI_ASSET_DIR, recipe.source)),
  );
  const resizedCap = renderNineSlice(
    source,
    SOURCE_SLICE,
    RESIZED_SLICE,
  );
  const output = flipVertical(resizedCap);
  const outputPath = path.join(UI_ASSET_DIR, recipe.output);
  const metadataPath = outputPath.replace(/\.png$/i, '.9slice.json');

  if (writeFileIfChanged(outputPath, PNG.sync.write(output))) {
    changed += 1;
  }
  if (
    writeFileIfChanged(
      metadataPath,
      `${JSON.stringify(createMetadata(recipe, source), null, 2)}\n`,
    )
  ) {
    changed += 1;
  }
}

process.stdout.write(
  `Generated ${RECIPES.length} flipped 30px top-panel skins (${changed} files changed)\n`,
);

function renderNineSlice(source, sourceSlice, outputSlice) {
  const output = new PNG({ width: source.width, height: source.height });
  const sourceX = [
    0,
    sourceSlice.left,
    source.width - sourceSlice.right,
    source.width,
  ];
  const sourceY = [
    0,
    sourceSlice.top,
    source.height - sourceSlice.bottom,
    source.height,
  ];
  const outputX = [
    0,
    outputSlice.left,
    source.width - outputSlice.right,
    source.width,
  ];
  const outputY = [
    0,
    outputSlice.top,
    source.height - outputSlice.bottom,
    source.height,
  ];

  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      const tile = cropPng(
        source,
        sourceX[column],
        sourceY[row],
        sourceX[column + 1] - sourceX[column],
        sourceY[row + 1] - sourceY[row],
      );
      const width = outputX[column + 1] - outputX[column];
      const height = outputY[row + 1] - outputY[row];
      const resized = tile.width === width && tile.height === height
        ? tile
        : resizeLanczos(tile, width, height);

      pastePng(output, resized, outputX[column], outputY[row]);
    }
  }

  return output;
}

function cropPng(source, x, y, width, height) {
  const output = new PNG({ width, height });

  for (let row = 0; row < height; row += 1) {
    const sourceStart = ((y + row) * source.width + x) * 4;
    const outputStart = row * width * 4;

    source.data.copy(
      output.data,
      outputStart,
      sourceStart,
      sourceStart + width * 4,
    );
  }

  return output;
}

function pastePng(output, tile, x, y) {
  for (let row = 0; row < tile.height; row += 1) {
    const sourceStart = row * tile.width * 4;
    const outputStart = ((y + row) * output.width + x) * 4;

    tile.data.copy(
      output.data,
      outputStart,
      sourceStart,
      sourceStart + tile.width * 4,
    );
  }
}

function flipVertical(source) {
  const output = new PNG({ width: source.width, height: source.height });
  const rowBytes = source.width * 4;

  for (let y = 0; y < source.height; y += 1) {
    const sourceStart = y * rowBytes;
    const outputStart = (source.height - 1 - y) * rowBytes;

    source.data.copy(
      output.data,
      outputStart,
      sourceStart,
      sourceStart + rowBytes,
    );
  }

  return output;
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

          const sourceOffset = (
            sampleY * source.width + sampleX
          ) * 4;
          const alpha = source.data[sourceOffset + 3] / 255;

          weightTotal += weight;
          alphaTotal += alpha * weight;
          redTotal += source.data[sourceOffset] * alpha * weight;
          greenTotal += source.data[sourceOffset + 1] * alpha * weight;
          blueTotal += source.data[sourceOffset + 2] * alpha * weight;
        }
      }

      const outputOffset = (y * width + x) * 4;
      const normalizedAlpha = weightTotal === 0
        ? 0
        : alphaTotal / weightTotal;

      output.data[outputOffset + 3] = clampByte(normalizedAlpha * 255);
      if (alphaTotal <= 0) {
        output.data[outputOffset] = 0;
        output.data[outputOffset + 1] = 0;
        output.data[outputOffset + 2] = 0;
      } else {
        output.data[outputOffset] = clampByte(redTotal / alphaTotal);
        output.data[outputOffset + 1] = clampByte(greenTotal / alphaTotal);
        output.data[outputOffset + 2] = clampByte(blueTotal / alphaTotal);
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

function createMetadata(recipe, source) {
  return {
    version: 1,
    format: 'png',
    asset: recipe.output,
    source: {
      path: path.posix.join('assets/game/source/ui', recipe.source),
      width: source.width,
      height: source.height,
      mode: 'RGBA',
      crop: {
        x: 0,
        y: 0,
        width: source.width,
        height: source.height,
      },
    },
    sourceCropSize: {
      width: source.width,
      height: source.height,
    },
    slice: OUTPUT_SLICE,
    mode: 'source',
    distill: null,
    cleanup: {
      geometricMask: true,
      cornerRemap: {
        sourceRadius: SOURCE_SLICE.top,
        outputRadius: RESIZED_SLICE.top,
        verticalFlip: true,
      },
    },
    rendering: {
      stretch: 'edges-and-center',
      outputInsets: OUTPUT_SLICE,
      minimumCenter: {
        width: 1,
        height: 1,
      },
      minimumSize: {
        width: OUTPUT_SLICE.left + OUTPUT_SLICE.right + 1,
        height: OUTPUT_SLICE.top + OUTPUT_SLICE.bottom + 1,
      },
      qaResample: 'nearest',
      browserPreviewSmoothingDefault: false,
    },
    editor: {
      tool: 'Idle Wizard top-panel asset generator',
      sourceAssetPreserved: true,
    },
  };
}
