/* global console */

import childProcess from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import pngjs from 'pngjs';

const { PNG } = pngjs;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_DIR = path.join(ROOT, 'src/assets/icons/research');
const SIZE = 256;
const TEMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'idle-wizard-research-icons-'));

const sourcePaths = Object.freeze({
  cauldron: 'src/assets/icons/icon-brewing-cauldron-tab.webp',
  check: 'src/assets/icons/status/check-01.png',
  coin: 'src/assets/icons/icon-coin.png',
  crystal: 'src/assets/icons/icon-crystal.png',
  emerald: 'src/assets/icons/icon-emerald.png',
  mana: 'src/assets/icons/icon-mana-drop.png',
  market: 'src/assets/icons/icon-shop-market-stall-tab.webp',
  plot: 'src/assets/icons/icon-garden-plot-tab.webp',
  potionBox: 'src/assets/icons/icon-potion-box.png',
  research: 'src/assets/icons/icon-research-telescope-tab.webp',
  ruby: 'src/assets/icons/icon-ruby.png',
  seedBox: 'src/assets/icons/icon-seed-box.png',
  seedPack: 'src/assets/items/seeds/seed-pack-regular.png',
});

const recipes = Object.freeze([
  [
    'icon-research-summon-multiplier.png',
    [
      layer('seedPack', 50, 44, 83, 122, { shadow: true }),
      layer('seedPack', 93, 32, 83, 122, { shadow: true }),
      layer('seedPack', 134, 50, 83, 122, { shadow: true }),
      layer('mana', 159, 152, 38, 56, { shadow: true }),
    ],
  ],
  [
    'icon-research-auto-seed-spawn.png',
    [
      layer('seedPack', 66, 50, 104, 146, { shadow: true }),
      layer('mana', 140, 142, 48, 70, { shadow: true }),
      layer('check', 154, 34, 62, 62, { shadow: true }),
    ],
  ],
  [
    'icon-research-auto-plant.png',
    [
      layer('plot', 25, 44, 188, 188, { shadow: true }),
      layer('seedPack', 135, 119, 55, 78, { shadow: true }),
      layer('check', 156, 38, 58, 58, { shadow: true }),
    ],
  ],
  [
    'icon-research-auto-harvest.png',
    [
      layer('plot', 25, 44, 188, 188, { shadow: true }),
      layer('seedBox', 142, 126, 54, 54, { shadow: true }),
      layer('check', 156, 38, 58, 58, { shadow: true }),
    ],
  ],
  [
    'icon-research-auto-brew.png',
    [
      layer('cauldron', 19, 35, 196, 196, { shadow: true }),
      layer('mana', 153, 140, 44, 64, { shadow: true }),
      layer('check', 157, 34, 58, 58, { shadow: true }),
    ],
  ],
  [
    'icon-research-auto-bottle.png',
    [
      layer('cauldron', 18, 35, 196, 196, { shadow: true }),
      layer('potionBox', 143, 132, 58, 58, { shadow: true }),
      layer('check', 157, 34, 58, 58, { shadow: true }),
    ],
  ],
  [
    'icon-research-fast-sell.png',
    [
      layer('market', 24, 45, 184, 184, { shadow: true }),
      layer('coin', 145, 132, 62, 62, { shadow: true }),
    ],
  ],
  [
    'icon-research-cost.png',
    [
      layer('research', 24, 34, 185, 185, { shadow: true }),
      layer('coin', 143, 138, 62, 62, { shadow: true }),
    ],
  ],
  [
    'icon-research-time.png',
    [
      layer('research', 26, 33, 184, 184, { shadow: true }),
      layer('ruby', 145, 136, 62, 62, { shadow: true }),
    ],
  ],
  [
    'icon-research-automation-reserve.png',
    [
      layer('mana', 75, 35, 92, 134, { shadow: true }),
      layer('seedPack', 129, 108, 68, 96, { shadow: true }),
      layer('check', 155, 34, 58, 58, { shadow: true }),
    ],
  ],
  [
    'icon-research-plot-capacity.png',
    [
      layer('plot', 25, 44, 188, 188, { shadow: true }),
      layer('ruby', 145, 135, 62, 62, { shadow: true }),
    ],
  ],
  [
    'icon-research-cauldron-capacity.png',
    [
      layer('cauldron', 20, 35, 196, 196, { shadow: true }),
      layer('ruby', 147, 136, 62, 62, { shadow: true }),
    ],
  ],
  [
    'icon-research-plot-growth.png',
    [
      layer('plot', 25, 44, 188, 188, { shadow: true }),
      layer('research', 128, 120, 74, 74, { shadow: true }),
    ],
  ],
  [
    'icon-research-cauldron-brewing.png',
    [
      layer('cauldron', 20, 35, 196, 196, { shadow: true }),
      layer('research', 132, 120, 74, 74, { shadow: true }),
    ],
  ],
  [
    'icon-research-plot-level.png',
    [
      layer('plot', 25, 44, 188, 188, { shadow: true }),
      layer('emerald', 147, 133, 58, 78, { shadow: true }),
    ],
  ],
  [
    'icon-research-cauldron-level.png',
    [
      layer('cauldron', 20, 35, 196, 196, { shadow: true }),
      layer('emerald', 150, 133, 58, 78, { shadow: true }),
    ],
  ],
]);

try {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const sources = loadSources(sourcePaths);

  for (const [fileName, layers] of recipes) {
    const canvas = new PNG({ width: SIZE, height: SIZE });

    for (const nextLayer of layers) {
      compositeLayer(canvas, sources[nextLayer.source], nextLayer);
    }

    fs.writeFileSync(path.join(OUTPUT_DIR, fileName), PNG.sync.write(canvas));
  }

  console.log(`generated ${recipes.length} research icons from game assets`);
} finally {
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });
}

function layer(source, x, y, width, height, options = {}) {
  return Object.freeze({
    source,
    x,
    y,
    width,
    height,
    shadow: options.shadow === true,
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

  if (relativePath.endsWith('.webp')) {
    const pngPath = path.join(TEMP_DIR, `${path.basename(relativePath, '.webp')}.png`);
    childProcess.execFileSync('sips', ['-s', 'format', 'png', sourcePath, '--out', pngPath], {
      stdio: 'ignore',
    });
    return PNG.sync.read(fs.readFileSync(pngPath));
  }

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
  const scaled = resizeContain(source, nextLayer.width, nextLayer.height);
  const x = Math.round(nextLayer.x + (nextLayer.width - scaled.width) / 2);
  const y = Math.round(nextLayer.y + (nextLayer.height - scaled.height) / 2);

  if (nextLayer.shadow) {
    compositeShadow(target, scaled, x + 4, y + 5, 0.36);
  }

  compositeImage(target, scaled, x, y);
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
