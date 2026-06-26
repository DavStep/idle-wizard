/* global console */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import pngjs from 'pngjs';

const { PNG } = pngjs;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_DIR = path.join(ROOT, 'src/assets/generated');
const OUTPUT_IMAGE = path.join(OUTPUT_DIR, 'game-asset-atlas.png');
const OUTPUT_MODULE = path.join(OUTPUT_DIR, 'game-asset-atlas.generated.js');
const MAX_ATLAS_WIDTH = 2048;
// Inline SVG crops minify 128px frames down to text size; keep enough gutter for filtering.
const PADDING = 32;
const EDGE_EXTRUDE = Math.max(1, Math.floor(PADDING / 2));
const TRIM_ALPHA_THRESHOLD = 0;
const TRIM_SOURCE_PADDING = 4;

const HERB_ASSETS = [
  ['herb:belladonnaHerb', 'src/assets/items/herbs/herb-belladonna.png'],
  ['herb:bloodroseHerb', 'src/assets/items/herbs/herb-bloodrose.png'],
  ['herb:briarHerb', 'src/assets/items/herbs/herb-briar.png'],
  ['herb:comfreyHerb', 'src/assets/items/herbs/herb-comfrey.png'],
  ['herb:dragonpepperHerb', 'src/assets/items/herbs/herb-dragonpepper.png'],
  ['herb:dreambellHerb', 'src/assets/items/herbs/herb-dreambell.png'],
  ['herb:frostmossHerb', 'src/assets/items/herbs/herb-frostmoss.png'],
  ['herb:glowcapHerb', 'src/assets/items/herbs/herb-glowcap.png'],
  ['herb:hyssopHerb', 'src/assets/items/herbs/herb-hyssop.png'],
  ['herb:lavenderHerb', 'src/assets/items/herbs/herb-lavender.png'],
  ['herb:mandrakeHerb', 'src/assets/items/herbs/herb-mandrake.png'],
  ['herb:mintHerb', 'src/assets/items/herbs/herb-mint.png'],
  ['herb:moonflowerHerb', 'src/assets/items/herbs/herb-moonflower.png'],
  ['herb:nettleHerb', 'src/assets/items/herbs/herb-nettle.png'],
  ['herb:nightshadeHerb', 'src/assets/items/herbs/herb-nightshade.png'],
  ['herb:pearlrootHerb', 'src/assets/items/herbs/herb-pearlroot.png'],
  ['herb:sageHerb', 'src/assets/items/herbs/herb-sage.png'],
  ['herb:silverleafHerb', 'src/assets/items/herbs/herb-silverleaf.png'],
  ['herb:snowdropHerb', 'src/assets/items/herbs/herb-snowdrop.png'],
  ['herb:starAniseHerb', 'src/assets/items/herbs/herb-star-anise.png'],
  ['herb:sunrootHerb', 'src/assets/items/herbs/herb-sunroot.png'],
  ['herb:valerianHerb', 'src/assets/items/herbs/herb-valerian.png'],
  ['herb:wormwoodHerb', 'src/assets/items/herbs/herb-wormwood.png'],
  ['herb:yarrowHerb', 'src/assets/items/herbs/herb-yarrow.png'],
];

const POTION_ASSETS = [
  ['potion:manaTonic', 'src/assets/items/potions/potion-mana-tonic.png'],
  ['potion:minorHealingPotion', 'src/assets/items/potions/potion-minor-healing.png'],
  ['potion:nettleVigor', 'src/assets/items/potions/potion-nettle-vigor.png'],
  ['potion:calmingDraught', 'src/assets/items/potions/potion-calming-draught.png'],
  ['potion:simpleAntidote', 'src/assets/items/potions/potion-antidote.png'],
  ['potion:venomDraught', 'src/assets/items/potions/potion-venom-draught.png'],
  ['potion:briarWard', 'src/assets/items/potions/potion-briar-ward.png'],
  ['potion:lanternTonic', 'src/assets/items/potions/potion-lantern-tonic.png'],
  ['potion:healingPotion', 'src/assets/items/potions/potion-healing.png'],
  ['potion:moonlitFocus', 'src/assets/items/potions/potion-moon-focus.png'],
  ['potion:sunrootStamina', 'src/assets/items/potions/potion-stamina.png'],
  ['potion:frostmossCleanse', 'src/assets/items/potions/potion-frost-cleanse.png'],
  ['potion:sleepDraught', 'src/assets/items/potions/potion-sleep-draught.png'],
  ['potion:elixirOfLife', 'src/assets/items/potions/potion-elixir.png'],
  ['potion:starLuckPhiltre', 'src/assets/items/potions/potion-star-luck.png'],
  ['potion:dragonCourage', 'src/assets/items/potions/potion-dragon-courage.png'],
  ['potion:deepDreamVision', 'src/assets/items/potions/potion-deep-dream-vision.png'],
  ['potion:pactWard', 'src/assets/items/potions/potion-pact-ward.png'],
  ['potion:ashenMemory', 'src/assets/items/potions/potion-ashen-memory.png'],
  ['potion:silverleafQuiet', 'src/assets/items/potions/potion-silverleaf-quiet.png'],
  ['potion:emberSight', 'src/assets/items/potions/potion-ember-sight.png'],
  ['potion:thornSleep', 'src/assets/items/potions/potion-thorn-sleep.png'],
  ['potion:glassMoonElixir', 'src/assets/items/potions/potion-glass-moon-elixir.png'],
  ['potion:rootboundResolve', 'src/assets/items/potions/potion-rootbound-resolve.png'],
  ['potion:nightOrchardTonic', 'src/assets/items/potions/potion-night-orchard-tonic.png'],
  ['potion:starlessCourage', 'src/assets/items/potions/potion-starless-courage.png'],
  ['potion:frostveinDraught', 'src/assets/items/potions/potion-frostvein-draught.png'],
  ['potion:bloodlightWard', 'src/assets/items/potions/potion-bloodlight-ward.png'],
  ['potion:silverleafSalve', 'src/assets/items/potions/potion-silverleaf-salve.png'],
  ['potion:yarrowPoultice', 'src/assets/items/potions/potion-yarrow-poultice.png'],
  ['potion:hyssopClarity', 'src/assets/items/potions/potion-hyssop-clarity.png'],
  ['potion:valerianRest', 'src/assets/items/potions/potion-valerian-rest.png'],
  ['potion:comfreyBalm', 'src/assets/items/potions/potion-comfrey-balm.png'],
  ['potion:nightshadeVeil', 'src/assets/items/potions/potion-nightshade-veil.png'],
  ['potion:belladonnaSight', 'src/assets/items/potions/potion-belladonna-sight.png'],
  ['potion:wormwoodPurge', 'src/assets/items/potions/potion-wormwood-purge.png'],
  ['potion:snowdropBreath', 'src/assets/items/potions/potion-snowdrop-breath.png'],
  ['potion:pearlrootDraught', 'src/assets/items/potions/potion-pearlroot-draught.png'],
  ['potion:wastedPotion', 'src/assets/items/potions/potion-wasted.png'],
  ['potion:unknownPotion', 'src/assets/items/potions/potion-unknown.png'],
  ['potion:generic', 'src/assets/items/potions/potion-generic.png'],
];

const TOOL_ASSETS = [
  ['tool:herbCuttingScissorsClosed', 'src/assets/icons/tools/herb-cutting-scissors-closed.png'],
  ['tool:herbCuttingScissorsOpen', 'src/assets/icons/tools/herb-cutting-scissors-open.png'],
];

const ASSETS = [
  ['resource:coin', 'src/assets/icons/icon-coin.png', 96],
  ['resource:crystal', 'src/assets/icons/icon-crystal.png', 96],
  ['resource:emerald', 'src/assets/icons/icon-emerald.png', 96],
  ['resource:mana', 'src/assets/icons/icon-mana-drop.png', 96],
  ['resource:ruby', 'src/assets/icons/icon-ruby.png', 96],
  ['seed:black', 'src/assets/items/seeds/seed-pack-black.png', 128],
  ['seed:gray', 'src/assets/items/seeds/seed-pack-gray.png', 128],
  ['seed:regular', 'src/assets/items/seeds/seed-pack-regular.png', 128],
  ...HERB_ASSETS.map(([frameName, filePath]) => [
    frameName,
    filePath,
    128,
    { trimTransparent: true },
  ]),
  ...POTION_ASSETS.map(([frameName, filePath]) => [frameName, filePath, 128]),
  ...TOOL_ASSETS.map(([frameName, filePath]) => [frameName, filePath, 128, { trimTransparent: true }]),
  ['ui:summonCircle', 'src/assets/ui/summon-circle.png', 768],
];

function readAsset([frameName, relativePath, maxDimension, options = {}]) {
  const filePath = path.join(ROOT, relativePath);
  const source = PNG.sync.read(fs.readFileSync(filePath));
  const imageSource = options.trimTransparent ? trimTransparentBounds(source) : source;
  const image = prepareImageForAtlas(resizeToMaxDimension(imageSource, maxDimension));

  return {
    frameName,
    relativePath,
    image,
    originalWidth: source.width,
    originalHeight: source.height,
    width: image.width,
    height: image.height,
  };
}

function trimTransparentBounds(source) {
  let minX = source.width;
  let minY = source.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const offset = (y * source.width + x) * 4;

      if (source.data[offset + 3] <= TRIM_ALPHA_THRESHOLD) {
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

  const cropX = Math.max(0, minX - TRIM_SOURCE_PADDING);
  const cropY = Math.max(0, minY - TRIM_SOURCE_PADDING);
  const cropRight = Math.min(source.width - 1, maxX + TRIM_SOURCE_PADDING);
  const cropBottom = Math.min(source.height - 1, maxY + TRIM_SOURCE_PADDING);
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

function prepareImageForAtlas(image) {
  bleedTransparentPixels(image);
  return image;
}

function resizeToMaxDimension(source, maxDimension) {
  const largestSide = Math.max(source.width, source.height);

  if (!maxDimension || largestSide <= maxDimension) {
    return source;
  }

  const scale = maxDimension / largestSide;
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const target = new PNG({ width, height });

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sample = sampleBilinear(source, (x + 0.5) / scale - 0.5, (y + 0.5) / scale - 0.5);
      const offset = (y * width + x) * 4;
      target.data[offset] = sample.r;
      target.data[offset + 1] = sample.g;
      target.data[offset + 2] = sample.b;
      target.data[offset + 3] = sample.a;
    }
  }

  return target;
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

function packAssets(assets) {
  const packed = [];
  const sorted = [...assets].sort(
    (first, second) =>
      second.height - first.height ||
      second.width - first.width ||
      first.frameName.localeCompare(second.frameName),
  );
  let cursorX = PADDING;
  let cursorY = PADDING;
  let rowHeight = 0;
  let atlasWidth = 0;

  for (const asset of sorted) {
    const nextX = cursorX + asset.width + PADDING;

    if (nextX > MAX_ATLAS_WIDTH && cursorX > PADDING) {
      cursorX = PADDING;
      cursorY += rowHeight + PADDING;
      rowHeight = 0;
    }

    packed.push({
      ...asset,
      x: cursorX,
      y: cursorY,
    });

    cursorX += asset.width + PADDING;
    rowHeight = Math.max(rowHeight, asset.height);
    atlasWidth = Math.max(atlasWidth, cursorX);
  }

  const atlasHeight = cursorY + rowHeight + PADDING;

  return {
    width: nextPowerOfTwo(atlasWidth),
    height: nextPowerOfTwo(atlasHeight),
    packed,
  };
}

function writeAtlas({ width, height, packed }) {
  const atlas = new PNG({ width, height });

  for (const asset of packed) {
    copyImage(asset.image, atlas, asset.x, asset.y);
    extrudeImageEdges(asset.image, atlas, asset.x, asset.y, EDGE_EXTRUDE);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_IMAGE, PNG.sync.write(atlas));
  fs.writeFileSync(OUTPUT_MODULE, createModule({ width, height, packed }));
}

function copyImage(source, target, targetX, targetY) {
  for (let y = 0; y < source.height; y += 1) {
    const sourceStart = y * source.width * 4;
    const sourceEnd = sourceStart + source.width * 4;
    const targetStart = ((targetY + y) * target.width + targetX) * 4;
    target.data.set(source.data.subarray(sourceStart, sourceEnd), targetStart);
  }
}

function extrudeImageEdges(source, target, targetX, targetY, distance) {
  for (let y = -distance; y < source.height + distance; y += 1) {
    for (let x = -distance; x < source.width + distance; x += 1) {
      if (x >= 0 && x < source.width && y >= 0 && y < source.height) {
        continue;
      }

      const sourceX = clamp(x, 0, source.width - 1);
      const sourceY = clamp(y, 0, source.height - 1);
      const targetPixelX = targetX + x;
      const targetPixelY = targetY + y;

      if (
        targetPixelX < 0 ||
        targetPixelY < 0 ||
        targetPixelX >= target.width ||
        targetPixelY >= target.height
      ) {
        continue;
      }

      copyPixel(source, sourceX, sourceY, target, targetPixelX, targetPixelY);
    }
  }
}

function bleedTransparentPixels(image) {
  const pixelCount = image.width * image.height;
  const nearestOpaquePixels = new Int32Array(pixelCount);
  nearestOpaquePixels.fill(-1);

  const queue = new Int32Array(pixelCount);
  let readIndex = 0;
  let writeIndex = 0;

  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    const offset = pixelIndex * 4;

    if (image.data[offset + 3] > 0) {
      nearestOpaquePixels[pixelIndex] = pixelIndex;
      queue[writeIndex] = pixelIndex;
      writeIndex += 1;
    }
  }

  while (readIndex < writeIndex) {
    const pixelIndex = queue[readIndex];
    readIndex += 1;

    const x = pixelIndex % image.width;
    const y = Math.floor(pixelIndex / image.width);
    const nearestOpaquePixel = nearestOpaquePixels[pixelIndex];

    visitTransparentNeighbor(x - 1, y, nearestOpaquePixel);
    visitTransparentNeighbor(x + 1, y, nearestOpaquePixel);
    visitTransparentNeighbor(x, y - 1, nearestOpaquePixel);
    visitTransparentNeighbor(x, y + 1, nearestOpaquePixel);
  }

  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    const offset = pixelIndex * 4;
    const nearestOpaquePixel = nearestOpaquePixels[pixelIndex];

    if (image.data[offset + 3] !== 0 || nearestOpaquePixel < 0) {
      continue;
    }

    const sourceOffset = nearestOpaquePixel * 4;
    image.data[offset] = image.data[sourceOffset];
    image.data[offset + 1] = image.data[sourceOffset + 1];
    image.data[offset + 2] = image.data[sourceOffset + 2];
  }

  function visitTransparentNeighbor(x, y, nearestOpaquePixel) {
    if (x < 0 || y < 0 || x >= image.width || y >= image.height) {
      return;
    }

    const pixelIndex = y * image.width + x;

    if (nearestOpaquePixels[pixelIndex] >= 0) {
      return;
    }

    nearestOpaquePixels[pixelIndex] = nearestOpaquePixel;
    queue[writeIndex] = pixelIndex;
    writeIndex += 1;
  }
}

function copyPixel(source, sourceX, sourceY, target, targetX, targetY) {
  const sourceOffset = (sourceY * source.width + sourceX) * 4;
  const targetOffset = (targetY * target.width + targetX) * 4;
  target.data[targetOffset] = source.data[sourceOffset];
  target.data[targetOffset + 1] = source.data[sourceOffset + 1];
  target.data[targetOffset + 2] = source.data[sourceOffset + 2];
  target.data[targetOffset + 3] = source.data[sourceOffset + 3];
}

function createModule({ width, height, packed }) {
  const frames = Object.fromEntries(
    packed
      .sort((first, second) => first.frameName.localeCompare(second.frameName))
      .map((asset) => [
        asset.frameName,
        {
          x: asset.x,
          y: asset.y,
          width: asset.width,
          height: asset.height,
          originalWidth: asset.originalWidth,
          originalHeight: asset.originalHeight,
          source: asset.relativePath,
        },
      ]),
  );

  return `import atlasImageUrl from './game-asset-atlas.png';

export const gameAssetAtlasImageUrl = atlasImageUrl;
export const gameAssetAtlasSize = Object.freeze(${JSON.stringify({ width, height }, null, 2)});
export const gameAssetAtlasFrames = Object.freeze(${JSON.stringify(frames, null, 2)});

export const gameAssetAtlasPixiData = Object.freeze({
  frames: Object.freeze(
    Object.fromEntries(
      Object.entries(gameAssetAtlasFrames).map(([name, frame]) => [
        name,
        Object.freeze({
          frame: Object.freeze({
            x: frame.x,
            y: frame.y,
            w: frame.width,
            h: frame.height,
          }),
          rotated: false,
          trimmed: false,
          spriteSourceSize: Object.freeze({
            x: 0,
            y: 0,
            w: frame.width,
            h: frame.height,
          }),
          sourceSize: Object.freeze({
            w: frame.width,
            h: frame.height,
          }),
        }),
      ]),
    ),
  ),
  meta: Object.freeze({
    image: atlasImageUrl,
    format: 'RGBA8888',
    scale: '1',
    size: Object.freeze({
      w: gameAssetAtlasSize.width,
      h: gameAssetAtlasSize.height,
    }),
  }),
});
`;
}

function nextPowerOfTwo(value) {
  let result = 1;

  while (result < value) {
    result *= 2;
  }

  return result;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clampByte(value) {
  return clamp(Math.round(value), 0, 255);
}

const assets = ASSETS.map(readAsset);
writeAtlas(packAssets(assets));
console.log(
  `built ${path.relative(ROOT, OUTPUT_IMAGE)} with ${assets.length} frames`,
);
