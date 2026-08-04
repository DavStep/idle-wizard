/* global console */

import fs from 'node:fs';
import path from 'node:path';
import { argv } from 'node:process';
import { fileURLToPath } from 'node:url';

import pngjs from 'pngjs';

const { PNG } = pngjs;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_DIR = path.join(ROOT, 'assets/game/source/icons/research');
const SIZE = 256;

const sourcePaths = Object.freeze({
  arrow: 'art-source/research-icons/primitives/upgrade-arrow.png',
  cauldron: 'art-source/research-icons/primitives/cauldron.png',
  check: 'assets/game/source/ui/prop_checkmark.png',
  hourglass: 'art-source/research-icons/primitives/hourglass.png',
  lens: 'art-source/research-icons/primitives/research-lens.png',
  pack: 'art-source/research-icons/primitives/seed-pack.png',
  plot: 'art-source/research-icons/primitives/plot.png',
  stall: 'art-source/research-icons/primitives/market-stall.png',
});

const recipes = Object.freeze([
  [
    'icon-research-summon-multiplier.png',
    [
      layer('pack', 84, 22, 104, 122, { shadow: true }),
      layer('pack', 30, 92, 112, 132, { shadow: true }),
      layer('pack', 114, 92, 112, 132, { shadow: true }),
    ],
  ],
  [
    'icon-research-auto-seed-spawn.png',
    [layer('pack', 38, 34, 180, 190, { shadow: true }), checkLayer()],
  ],
  [
    'icon-research-auto-plant.png',
    [mainLayer('plot'), checkLayer()],
  ],
  [
    'icon-research-auto-brew.png',
    [mainLayer('cauldron'), checkLayer()],
  ],
  [
    'icon-research-fast-sell.png',
    [
      layer('stall', 12, 28, 232, 204, { shadow: true }),
      upgradeArrowLayer(),
    ],
  ],
  [
    'icon-research-cost.png',
    [
      layer('lens', 22, 30, 190, 190, { shadow: true }),
      reductionArrowLayer(),
    ],
  ],
  [
    'icon-research-time.png',
    [
      layer('hourglass', 42, 18, 172, 214, { shadow: true }),
      reductionArrowLayer(),
    ],
  ],
  [
    'icon-research-automation-reserve.png',
    [
      layer('pack', 36, 68, 140, 156, { shadow: true }),
      layer('pack', 102, 40, 140, 156, { shadow: true }),
      checkLayer(),
    ],
  ],
  [
    'icon-research-plot-capacity.png',
    capacityLayers('plot'),
  ],
  [
    'icon-research-cauldron-capacity.png',
    capacityLayers('cauldron'),
  ],
  [
    'icon-research-plot-growth.png',
    [mainLayer('plot'), timeOverlayLayer()],
  ],
  [
    'icon-research-cauldron-brewing.png',
    [mainLayer('cauldron'), timeOverlayLayer()],
  ],
  [
    'icon-research-plot-level.png',
    [mainLayer('plot'), upgradeArrowLayer()],
  ],
  [
    'icon-research-cauldron-level.png',
    [mainLayer('cauldron'), upgradeArrowLayer()],
  ],
]);

const requestedRecipeNames = new Set(argv.slice(2));
const unknownRecipeNames = [...requestedRecipeNames].filter(
  (requestedName) => !recipes.some(([fileName]) => fileName === requestedName),
);

if (unknownRecipeNames.length > 0) {
  throw new Error(`Unknown research icon recipe: ${unknownRecipeNames.join(', ')}`);
}

const selectedRecipes =
  requestedRecipeNames.size > 0
    ? recipes.filter(([fileName]) => requestedRecipeNames.has(fileName))
    : recipes;

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
const sources = loadSources(sourcePaths);

for (const [fileName, layers] of selectedRecipes) {
  const canvas = new PNG({ width: SIZE, height: SIZE });

  for (const nextLayer of layers) {
    compositeLayer(canvas, sources[nextLayer.source], nextLayer);
  }

  fs.writeFileSync(path.join(OUTPUT_DIR, fileName), PNG.sync.write(canvas));
}

console.log(`generated ${selectedRecipes.length} research icons from game assets`);

function layer(source, x, y, width, height, options = {}) {
  return Object.freeze({
    source,
    x,
    y,
    width,
    height,
    rotate180: options.rotate180 === true,
    shadow: options.shadow === true,
  });
}

function mainLayer(source) {
  return layer(source, 14, 20, 228, 216, { shadow: true });
}

function checkLayer() {
  return layer('check', 172, 26, 58, 58, { shadow: true });
}

function capacityLayers(source) {
  return [
    layer(source, 94, 34, 140, 140, { shadow: true }),
    layer(source, 18, 82, 164, 164, { shadow: true }),
  ];
}

function timeOverlayLayer() {
  return layer('hourglass', 154, 126, 72, 94, { shadow: true });
}

function upgradeArrowLayer() {
  return layer('arrow', 168, 144, 56, 66, { shadow: true });
}

function reductionArrowLayer() {
  return layer('arrow', 168, 144, 56, 66, {
    rotate180: true,
    shadow: true,
  });
}

function loadSources(paths) {
  return Object.fromEntries(
    Object.entries(paths).map(([key, relativePath]) => [
      key,
      trimTransparent(readPngAsset(relativePath)),
    ]),
  );
}

function readPngAsset(relativePath) {
  const sourcePath = path.join(ROOT, relativePath);
  return PNG.sync.read(fs.readFileSync(sourcePath));
}

function trimTransparent(source) {
  let minX = source.width;
  let minY = source.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const offset = (y * source.width + x) * 4;

      if (source.data[offset + 3] <= 0) {
        continue;
      }

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) {
    return source;
  }

  const padding = 2;
  const cropX = Math.max(0, minX - padding);
  const cropY = Math.max(0, minY - padding);
  const cropRight = Math.min(source.width - 1, maxX + padding);
  const cropBottom = Math.min(source.height - 1, maxY + padding);
  const width = cropRight - cropX + 1;
  const height = cropBottom - cropY + 1;
  const target = new PNG({ width, height });

  for (let y = 0; y < height; y += 1) {
    const sourceStart = ((cropY + y) * source.width + cropX) * 4;
    const sourceEnd = sourceStart + width * 4;
    const targetStart = y * width * 4;
    target.data.set(source.data.subarray(sourceStart, sourceEnd), targetStart);
  }

  return target;
}

function compositeLayer(target, source, nextLayer) {
  const contained = resizeContain(source, nextLayer.width, nextLayer.height);
  const scaled = nextLayer.rotate180 ? rotate180(contained) : contained;
  const x = Math.round(nextLayer.x + (nextLayer.width - scaled.width) / 2);
  const y = Math.round(nextLayer.y + (nextLayer.height - scaled.height) / 2);

  if (nextLayer.shadow) {
    compositeShadow(target, scaled, x + 4, y + 5, 0.36);
  }

  compositeImage(target, scaled, x, y);
}

function rotate180(source) {
  const target = new PNG({ width: source.width, height: source.height });

  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const sourceOffset = (y * source.width + x) * 4;
      const targetOffset =
        ((source.height - y - 1) * source.width + (source.width - x - 1)) * 4;
      target.data.set(source.data.subarray(sourceOffset, sourceOffset + 4), targetOffset);
    }
  }

  return target;
}

function resizeContain(source, maxWidth, maxHeight) {
  const scale = Math.min(maxWidth / source.width, maxHeight / source.height);
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  return resize(source, width, height);
}

function resize(source, width, height) {
  const target = new PNG({ width, height });
  const scaleX = source.width / width;
  const scaleY = source.height / height;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sample = sampleBilinear(source, (x + 0.5) * scaleX - 0.5, (y + 0.5) * scaleY - 0.5);
      const offset = (y * width + x) * 4;
      target.data[offset] = sample.r;
      target.data[offset + 1] = sample.g;
      target.data[offset + 2] = sample.b;
      target.data[offset + 3] = sample.a;
    }
  }

  return target;
}

function compositeShadow(target, source, x, y, opacity) {
  for (let sourceY = 0; sourceY < source.height; sourceY += 1) {
    for (let sourceX = 0; sourceX < source.width; sourceX += 1) {
      const sourceOffset = (sourceY * source.width + sourceX) * 4;
      const sourceAlpha = source.data[sourceOffset + 3] / 255;

      if (sourceAlpha <= 0) {
        continue;
      }

      compositePixel(target, x + sourceX, y + sourceY, 0, 0, 0, sourceAlpha * opacity);
    }
  }
}

function compositeImage(target, source, x, y) {
  for (let sourceY = 0; sourceY < source.height; sourceY += 1) {
    for (let sourceX = 0; sourceX < source.width; sourceX += 1) {
      const sourceOffset = (sourceY * source.width + sourceX) * 4;
      const alpha = source.data[sourceOffset + 3] / 255;

      if (alpha <= 0) {
        continue;
      }

      compositePixel(
        target,
        x + sourceX,
        y + sourceY,
        source.data[sourceOffset],
        source.data[sourceOffset + 1],
        source.data[sourceOffset + 2],
        alpha,
      );
    }
  }
}

function compositePixel(target, x, y, red, green, blue, alpha) {
  if (x < 0 || y < 0 || x >= target.width || y >= target.height || alpha <= 0) {
    return;
  }

  const offset = (y * target.width + x) * 4;
  const existingAlpha = target.data[offset + 3] / 255;
  const outAlpha = alpha + existingAlpha * (1 - alpha);

  if (outAlpha <= 0) {
    return;
  }

  target.data[offset] = Math.round(
    (red * alpha + target.data[offset] * existingAlpha * (1 - alpha)) / outAlpha,
  );
  target.data[offset + 1] = Math.round(
    (green * alpha + target.data[offset + 1] * existingAlpha * (1 - alpha)) / outAlpha,
  );
  target.data[offset + 2] = Math.round(
    (blue * alpha + target.data[offset + 2] * existingAlpha * (1 - alpha)) / outAlpha,
  );
  target.data[offset + 3] = Math.round(outAlpha * 255);
}

function sampleBilinear(source, x, y) {
  const x0 = clamp(Math.floor(x), 0, source.width - 1);
  const y0 = clamp(Math.floor(y), 0, source.height - 1);
  const x1 = clamp(x0 + 1, 0, source.width - 1);
  const y1 = clamp(y0 + 1, 0, source.height - 1);
  const tx = clamp(x - x0, 0, 1);
  const ty = clamp(y - y0, 0, 1);
  const samples = [
    [x0, y0, (1 - tx) * (1 - ty)],
    [x1, y0, tx * (1 - ty)],
    [x0, y1, (1 - tx) * ty],
    [x1, y1, tx * ty],
  ];
  let alpha = 0;
  let red = 0;
  let green = 0;
  let blue = 0;

  for (const [sampleX, sampleY, weight] of samples) {
    const offset = (sampleY * source.width + sampleX) * 4;
    const pixelAlpha = (source.data[offset + 3] / 255) * weight;
    alpha += pixelAlpha;
    red += source.data[offset] * pixelAlpha;
    green += source.data[offset + 1] * pixelAlpha;
    blue += source.data[offset + 2] * pixelAlpha;
  }

  if (alpha <= 0) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  return {
    r: clampByte(red / alpha),
    g: clampByte(green / alpha),
    b: clampByte(blue / alpha),
    a: clampByte(alpha * 255),
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clampByte(value) {
  return clamp(Math.round(value), 0, 255);
}
