/* global console */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import pngjs from 'pngjs';

import { ingredientCatalog } from '../src/gameplay/items/ingredientCatalog.js';

const { PNG } = pngjs;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ATLAS_OUTPUT_DIR = path.join(ROOT, 'assets/game/atlas');
const MODULE_OUTPUT_DIR = path.join(ROOT, 'src/assets/generated');
const OUTPUT_IMAGE = path.join(ATLAS_OUTPUT_DIR, 'game-asset-atlas.png');
const OUTPUT_JSON = path.join(ATLAS_OUTPUT_DIR, 'game-asset-atlas.json');
const OUTPUT_MODULE = path.join(
  MODULE_OUTPUT_DIR,
  'game-asset-atlas.generated.js',
);
const MAX_ATLAS_WIDTH = 2048;
const MAX_ATLAS_HEIGHT = 2048;
const SHARED_ATLAS_BASENAME = 'game-shared-atlas';
const SHARED_ATLAS_MAX_DIMENSION = 256;
const SHARED_ATLAS_PADDING = 4;
const SHARED_ATLAS_EDGE_EXTRUDE = 2;
const STARTUP_SOURCE_PATHS = new Set([
  'assets/game/source/ui/idle-witch-craft-splash/splash-screen.png',
  'assets/game/source/ui/root-run-progress/progress-track.9.png',
  'assets/game/source/ui/root-run-progress/progress-fill-mask.9.png',
]);
// Inline SVG crops minify 128px frames down to text size; keep enough gutter for filtering.
const PADDING = 32;
const EDGE_EXTRUDE = Math.max(1, Math.floor(PADDING / 2));
const TRIM_ALPHA_THRESHOLD = 0;
const TRIM_SOURCE_PADDING = 4;

const HERB_ASSETS = [
  ['herb:belladonnaHerb', 'assets/game/source/items/herbs/herb-belladonna.png'],
  ['herb:bloodroseHerb', 'assets/game/source/items/herbs/herb-bloodrose.png'],
  ['herb:briarHerb', 'assets/game/source/items/herbs/herb-briar.png'],
  ['herb:comfreyHerb', 'assets/game/source/items/herbs/herb-comfrey.png'],
  ['herb:dragonpepperHerb', 'assets/game/source/items/herbs/herb-dragonpepper.png'],
  ['herb:dreambellHerb', 'assets/game/source/items/herbs/herb-dreambell.png'],
  ['herb:frostmossHerb', 'assets/game/source/items/herbs/herb-frostmoss.png'],
  ['herb:glowcapHerb', 'assets/game/source/items/herbs/herb-glowcap.png'],
  ['herb:hyssopHerb', 'assets/game/source/items/herbs/herb-hyssop.png'],
  ['herb:lavenderHerb', 'assets/game/source/items/herbs/herb-lavender.png'],
  ['herb:mandrakeHerb', 'assets/game/source/items/herbs/herb-mandrake.png'],
  ['herb:mintHerb', 'assets/game/source/items/herbs/herb-mint.png'],
  ['herb:moonflowerHerb', 'assets/game/source/items/herbs/herb-moonflower.png'],
  ['herb:nettleHerb', 'assets/game/source/items/herbs/herb-nettle.png'],
  ['herb:nightshadeHerb', 'assets/game/source/items/herbs/herb-nightshade.png'],
  ['herb:pearlrootHerb', 'assets/game/source/items/herbs/herb-pearlroot.png'],
  ['herb:sageHerb', 'assets/game/source/items/herbs/herb-sage.png'],
  ['herb:silverleafHerb', 'assets/game/source/items/herbs/herb-silverleaf.png'],
  ['herb:snowdropHerb', 'assets/game/source/items/herbs/herb-snowdrop.png'],
  ['herb:starAniseHerb', 'assets/game/source/items/herbs/herb-star-anise.png'],
  ['herb:sunrootHerb', 'assets/game/source/items/herbs/herb-sunroot.png'],
  ['herb:valerianHerb', 'assets/game/source/items/herbs/herb-valerian.png'],
  ['herb:wormwoodHerb', 'assets/game/source/items/herbs/herb-wormwood.png'],
  ['herb:yarrowHerb', 'assets/game/source/items/herbs/herb-yarrow.png'],
];

const POTION_ASSETS = [
  ['potion:manaTonic', 'assets/game/source/items/potions/potion-mana-tonic.png'],
  ['potion:minorHealingPotion', 'assets/game/source/items/potions/potion-minor-healing.png'],
  ['potion:nettleVigor', 'assets/game/source/items/potions/potion-nettle-vigor.png'],
  ['potion:calmingDraught', 'assets/game/source/items/potions/potion-calming-draught.png'],
  ['potion:simpleAntidote', 'assets/game/source/items/potions/potion-antidote.png'],
  ['potion:venomDraught', 'assets/game/source/items/potions/potion-venom-draught.png'],
  ['potion:briarWard', 'assets/game/source/items/potions/potion-briar-ward.png'],
  ['potion:lanternTonic', 'assets/game/source/items/potions/potion-lantern-tonic.png'],
  ['potion:healingPotion', 'assets/game/source/items/potions/potion-healing.png'],
  ['potion:moonlitFocus', 'assets/game/source/items/potions/potion-moon-focus.png'],
  ['potion:sunrootStamina', 'assets/game/source/items/potions/potion-stamina.png'],
  ['potion:frostmossCleanse', 'assets/game/source/items/potions/potion-frost-cleanse.png'],
  ['potion:sleepDraught', 'assets/game/source/items/potions/potion-sleep-draught.png'],
  ['potion:elixirOfLife', 'assets/game/source/items/potions/potion-elixir.png'],
  ['potion:starLuckPhiltre', 'assets/game/source/items/potions/potion-star-luck.png'],
  ['potion:dragonCourage', 'assets/game/source/items/potions/potion-dragon-courage.png'],
  ['potion:deepDreamVision', 'assets/game/source/items/potions/potion-deep-dream-vision.png'],
  ['potion:pactWard', 'assets/game/source/items/potions/potion-pact-ward.png'],
  ['potion:ashenMemory', 'assets/game/source/items/potions/potion-ashen-memory.png'],
  ['potion:silverleafQuiet', 'assets/game/source/items/potions/potion-silverleaf-quiet.png'],
  ['potion:emberSight', 'assets/game/source/items/potions/potion-ember-sight.png'],
  ['potion:thornSleep', 'assets/game/source/items/potions/potion-thorn-sleep.png'],
  ['potion:glassMoonElixir', 'assets/game/source/items/potions/potion-glass-moon-elixir.png'],
  ['potion:rootboundResolve', 'assets/game/source/items/potions/potion-rootbound-resolve.png'],
  ['potion:nightOrchardTonic', 'assets/game/source/items/potions/potion-night-orchard-tonic.png'],
  ['potion:starlessCourage', 'assets/game/source/items/potions/potion-starless-courage.png'],
  ['potion:frostveinDraught', 'assets/game/source/items/potions/potion-frostvein-draught.png'],
  ['potion:bloodlightWard', 'assets/game/source/items/potions/potion-bloodlight-ward.png'],
  ['potion:silverleafSalve', 'assets/game/source/items/potions/potion-silverleaf-salve.png'],
  ['potion:yarrowPoultice', 'assets/game/source/items/potions/potion-yarrow-poultice.png'],
  ['potion:hyssopClarity', 'assets/game/source/items/potions/potion-hyssop-clarity.png'],
  ['potion:valerianRest', 'assets/game/source/items/potions/potion-valerian-rest.png'],
  ['potion:comfreyBalm', 'assets/game/source/items/potions/potion-comfrey-balm.png'],
  ['potion:nightshadeVeil', 'assets/game/source/items/potions/potion-nightshade-veil.png'],
  ['potion:belladonnaSight', 'assets/game/source/items/potions/potion-belladonna-sight.png'],
  ['potion:wormwoodPurge', 'assets/game/source/items/potions/potion-wormwood-purge.png'],
  ['potion:snowdropBreath', 'assets/game/source/items/potions/potion-snowdrop-breath.png'],
  ['potion:pearlrootDraught', 'assets/game/source/items/potions/potion-pearlroot-draught.png'],
  ['potion:wastedPotion', 'assets/game/source/items/potions/potion-wasted.png'],
  ['potion:unknownPotion', 'assets/game/source/items/potions/potion-unknown.png'],
];

const INGREDIENT_ASSETS = ingredientCatalog.map((ingredient) => [
  `ingredient:${ingredient.key}`,
  `assets/game/source/items/ingredients/ingredient-${ingredient.assetSlug}.png`,
]);

const TOOL_ASSETS = [
  [
    'tool:herbCuttingScissorsClosed',
    'assets/game/source/icons/tools/herb-cutting-scissors-closed.png',
  ],
  [
    'tool:herbCuttingScissorsOpen',
    'assets/game/source/icons/tools/herb-cutting-scissors-open.png',
  ],
];

const STATUS_ASSETS = [
  ['status:checkDefault', 'assets/game/source/ui/prop_checkmark.png'],
  ['status:lockDefault', 'assets/game/source/ui/prop_lock.png'],
];

const RESEARCH_ASSETS = [
  ['research:autoBrew', 'assets/game/source/icons/research/icon-research-auto-brew.png'],
  ['research:autoPlant', 'assets/game/source/icons/research/icon-research-auto-plant.png'],
  [
    'research:autoSeedSpawn',
    'assets/game/source/icons/research/icon-research-auto-seed-spawn.png',
  ],
  [
    'research:automationReserve',
    'assets/game/source/icons/research/icon-research-automation-reserve.png',
  ],
  [
    'research:cauldronBrewing',
    'assets/game/source/icons/research/icon-research-cauldron-brewing.png',
  ],
  [
    'research:cauldronCapacity',
    'assets/game/source/icons/research/icon-research-cauldron-capacity.png',
  ],
  ['research:cauldronLevel', 'assets/game/source/icons/research/icon-research-cauldron-level.png'],
  ['research:fastSell', 'assets/game/source/icons/research/icon-research-fast-sell.png'],
  ['research:plotCapacity', 'assets/game/source/icons/research/icon-research-plot-capacity.png'],
  ['research:plotGrowth', 'assets/game/source/icons/research/icon-research-plot-growth.png'],
  ['research:plotLevel', 'assets/game/source/icons/research/icon-research-plot-level.png'],
  [
    'research:researchCost',
    'assets/game/source/icons/research/icon-research-cost.png',
  ],
  [
    'research:researchTime',
    'assets/game/source/icons/research/icon-research-time.png',
  ],
  [
    'research:summonMultiplier',
    'assets/game/source/icons/research/icon-research-summon-multiplier.png',
  ],
];

const ASSETS = [
  ['resource:coin', 'assets/game/source/icons/icon-coin.png', 96],
  ['resource:crystal', 'assets/game/source/icons/icon-crystal.png', 96],
  ['resource:emerald', 'assets/game/source/icons/icon-emerald.png', 96],
  ['resource:mana', 'assets/game/source/icons/icon-mana-drop.png', 96],
  ['resource:research', 'assets/game/source/icons/icon-research.png', 96],
  ['resource:ruby', 'assets/game/source/icons/icon-ruby.png', 96],
  ['seed:pack', 'assets/game/source/items/seeds/seed-pack.png', 128, { trimTransparent: true }],
  ...HERB_ASSETS.map(([frameName, filePath]) => [
    frameName,
    filePath,
    128,
    { trimTransparent: true },
  ]),
  ...POTION_ASSETS.map(([frameName, filePath]) => [frameName, filePath, 128]),
  ...INGREDIENT_ASSETS.map(([frameName, filePath]) => [
    frameName,
    filePath,
    128,
    { trimTransparent: true },
  ]),
  ...TOOL_ASSETS.map(([frameName, filePath]) => [
    frameName,
    filePath,
    128,
    { trimTransparent: true },
  ]),
  ...RESEARCH_ASSETS.map(([frameName, filePath]) => [
    frameName,
    filePath,
    128,
    { trimTransparent: true },
  ]),
  ...STATUS_ASSETS.map(([frameName, filePath]) => [
    frameName,
    filePath,
    128,
    { trimTransparent: true },
  ]),
  ['ui:summonCircle', 'assets/game/source/ui/summon-circle.png', 768],
];
const FULL_RESOLUTION_ATLAS_SOURCE_PATHS = new Set([
  'assets/game/source/icons/icon-coin.png',
  'assets/game/source/icons/icon-crystal.png',
  'assets/game/source/icons/icon-emerald.png',
  'assets/game/source/icons/icon-mana-drop.png',
  'assets/game/source/icons/icon-research.png',
  'assets/game/source/icons/icon-ruby.png',
  ...RESEARCH_ASSETS.map(([, sourcePath]) => sourcePath),
  ...STATUS_ASSETS.map(([, sourcePath]) => sourcePath),
]);

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
    edgeExtrude: EDGE_EXTRUDE,
    packed,
  };
}

function packAssetPages(
  assets,
  {
    maxWidth = MAX_ATLAS_WIDTH,
    maxHeight = MAX_ATLAS_HEIGHT,
    padding = SHARED_ATLAS_PADDING,
    edgeExtrude = SHARED_ATLAS_EDGE_EXTRUDE,
  } = {},
) {
  const sorted = [...assets].sort(
    (first, second) =>
      second.height - first.height ||
      second.width - first.width ||
      first.frameName.localeCompare(second.frameName),
  );
  const pages = [];
  let page = createPageState();

  for (const asset of sorted) {
    if (
      asset.width + padding * 2 > maxWidth ||
      asset.height + padding * 2 > maxHeight
    ) {
      throw new Error(
        `${asset.relativePath} does not fit inside a ${maxWidth}x${maxHeight} atlas page`,
      );
    }

    let nextX = page.cursorX + asset.width + padding;
    if (nextX > maxWidth && page.cursorX > padding) {
      page.cursorX = padding;
      page.cursorY += page.rowHeight + padding;
      page.rowHeight = 0;
      nextX = page.cursorX + asset.width + padding;
    }

    if (
      page.packed.length > 0 &&
      page.cursorY + asset.height + padding > maxHeight
    ) {
      pages.push(finalizePage(page));
      page = createPageState();
      nextX = page.cursorX + asset.width + padding;
    }

    page.packed.push({
      ...asset,
      x: page.cursorX,
      y: page.cursorY,
    });
    page.cursorX = nextX;
    page.rowHeight = Math.max(page.rowHeight, asset.height);
    page.atlasWidth = Math.max(page.atlasWidth, page.cursorX);
  }

  if (page.packed.length > 0) {
    pages.push(finalizePage(page));
  }

  return pages;

  function createPageState() {
    return {
      atlasWidth: 0,
      cursorX: padding,
      cursorY: padding,
      packed: [],
      rowHeight: 0,
    };
  }

  function finalizePage(currentPage) {
    return {
      width: alignToMultiple(currentPage.atlasWidth, 4),
      height: alignToMultiple(
        currentPage.cursorY + currentPage.rowHeight + padding,
        4,
      ),
      edgeExtrude,
      packed: currentPage.packed,
    };
  }
}

function writeAtlas(
  { width, height, edgeExtrude = EDGE_EXTRUDE, packed },
  {
    atlasId = 'atlas:game',
    imageName = path.basename(OUTPUT_IMAGE),
    imagePath = OUTPUT_IMAGE,
    jsonPath = OUTPUT_JSON,
  } = {},
) {
  const atlas = new PNG({ width, height });

  for (const asset of packed) {
    copyImage(asset.image, atlas, asset.x, asset.y);
    extrudeImageEdges(asset.image, atlas, asset.x, asset.y, edgeExtrude);
  }

  fs.mkdirSync(ATLAS_OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(MODULE_OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(imagePath, PNG.sync.write(atlas));
  fs.writeFileSync(
    jsonPath,
    `${JSON.stringify(
      createAtlasJson({ atlasId, imageName, width, height, packed }),
      null,
      2,
    )}\n`,
  );
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

function createFrames(packed) {
  return Object.fromEntries(
    [...packed]
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
}

function createAtlasJson({
  atlasId = 'atlas:game',
  imageName = 'game-asset-atlas.png',
  width,
  height,
  packed,
}) {
  const frames = createFrames(packed);

  return {
    frames: Object.fromEntries(
      Object.entries(frames).map(([name, frame]) => [
        name,
        {
          frame: {
            x: frame.x,
            y: frame.y,
            w: frame.width,
            h: frame.height,
          },
          rotated: false,
          trimmed: false,
          spriteSourceSize: {
            x: 0,
            y: 0,
            w: frame.width,
            h: frame.height,
          },
          sourceSize: {
            w: frame.width,
            h: frame.height,
          },
          originalSourceSize: {
            w: frame.originalWidth,
            h: frame.originalHeight,
          },
          source: frame.source,
        },
      ]),
    ),
    meta: {
      app: 'Idle Wizard asset pipeline',
      atlasId,
      image: imageName,
      format: 'RGBA8888',
      scale: '1',
      size: {
        w: width,
        h: height,
      },
    },
  };
}

function createModule(
  atlasPages,
  atlasBackedSourcePaths,
  standaloneSourcePaths,
) {
  const atlasImports = atlasPages
    .map(
      ({ imageName, jsonName }, index) =>
        `import atlasImage${index}Url from '../../../assets/game/atlas/${imageName}';\n` +
        `import atlasData${index} from '../../../assets/game/atlas/${jsonName}';`,
    )
    .join('\n');
  const standaloneImports = standaloneSourcePaths
    .map(
      (sourcePath, index) =>
        `import standaloneSource${index}Url from '../../../${sourcePath}';`,
    )
    .join('\n');
  const atlasRecords = atlasPages
    .map(
      ({ atlasId }, index) => `  Object.freeze({
    id: ${JSON.stringify(atlasId)},
    imageUrl: atlasImage${index}Url,
    data: atlasData${index},
    size: Object.freeze({
      width: atlasData${index}.meta.size.w,
      height: atlasData${index}.meta.size.h,
    }),
  })`,
    )
    .join(',\n');
  const standaloneRecords = standaloneSourcePaths
    .map(
      (sourcePath, index) => `  Object.freeze({
    id: ${JSON.stringify(sourceAssetIdFromPath(sourcePath))},
    src: standaloneSource${index}Url,
    kind: 'texture',
  })`,
    )
    .join(',\n');
  const atlasBackedSourceIds = atlasBackedSourcePaths
    .map((sourcePath) => JSON.stringify(sourceAssetIdFromPath(sourcePath)))
    .join(',\n  ');

  return `${atlasImports}
${standaloneImports}

export const gameAssetAtlases = Object.freeze([
${atlasRecords}
]);

const primaryAtlas = gameAssetAtlases[0];
const ATLAS_BACKED_SOURCE_IDS = new Set([
  ${atlasBackedSourceIds}
]);

export const gameAssetAtlasImageUrl = primaryAtlas.imageUrl;
export const gameAssetAtlasSize = primaryAtlas.size;
export const gameAssetAtlasFrames = Object.freeze(
  Object.fromEntries(
    gameAssetAtlases.flatMap((atlas) =>
      Object.entries(atlas.data.frames).map(([name, data]) => [
        name,
        Object.freeze({
          atlasId: atlas.id,
          imageUrl: atlas.imageUrl,
          atlasWidth: atlas.size.width,
          atlasHeight: atlas.size.height,
          x: data.frame.x,
          y: data.frame.y,
          width: data.frame.w,
          height: data.frame.h,
          originalWidth: data.originalSourceSize.w,
          originalHeight: data.originalSourceSize.h,
          source: data.source,
        }),
      ]),
    ),
  ),
);

export const gameAtlasBackedSourceAssets = Object.freeze(
  Object.entries(gameAssetAtlasFrames)
    .filter(([, frame]) => ATLAS_BACKED_SOURCE_IDS.has(
      \`source:\${frame.source.replace(/^assets\\/game\\/source\\//, 'assets/')}\`,
    ))
    .map(([frameName, frame]) =>
      Object.freeze({
        id: \`source:\${frame.source.replace(/^assets\\/game\\/source\\//, 'assets/')}\`,
        src: frame.imageUrl,
        kind: 'atlas-frame',
        atlasId: frame.atlasId,
        frameName,
      }),
    ),
);

export const gameStandaloneSourceAssets = Object.freeze([
${standaloneRecords}
]);

export const gameAssetAtlasPixiData = Object.freeze({
  frames: Object.freeze(primaryAtlas.data.frames),
  meta: Object.freeze({
    ...primaryAtlas.data.meta,
    image: primaryAtlas.imageUrl,
  }),
});
`;
}

function collectSourcePngPaths() {
  const sourceRoot = path.join(ROOT, 'assets/game/source');
  const pending = [sourceRoot];
  const sourcePaths = [];

  while (pending.length > 0) {
    const directory = pending.pop();
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        pending.push(filePath);
      } else if (entry.isFile() && entry.name.endsWith('.png')) {
        sourcePaths.push(path.relative(ROOT, filePath).replaceAll(path.sep, '/'));
      }
    }
  }

  return sourcePaths.sort();
}

function sourceAssetIdFromPath(sourcePath) {
  return `source:${sourcePath.replace(/^assets\/game\/source\//, 'assets/')}`;
}

function isSharedAtlasCandidate(sourcePath, primarySourcePaths) {
  if (
    primarySourcePaths.has(sourcePath) ||
    STARTUP_SOURCE_PATHS.has(sourcePath) ||
    sourcePath.endsWith('.9.png')
  ) {
    return false;
  }

  const source = PNG.sync.read(fs.readFileSync(path.join(ROOT, sourcePath)));
  return (
    source.width <= SHARED_ATLAS_MAX_DIMENSION &&
    source.height <= SHARED_ATLAS_MAX_DIMENSION
  );
}

function clearGeneratedSharedAtlasPages() {
  if (!fs.existsSync(ATLAS_OUTPUT_DIR)) {
    return;
  }

  const sharedPagePattern = new RegExp(
    `^${SHARED_ATLAS_BASENAME}-\\d+\\.(?:json|png)$`,
  );
  for (const entry of fs.readdirSync(ATLAS_OUTPUT_DIR, { withFileTypes: true })) {
    if (entry.isFile() && sharedPagePattern.test(entry.name)) {
      fs.unlinkSync(path.join(ATLAS_OUTPUT_DIR, entry.name));
    }
  }
}

function nextPowerOfTwo(value) {
  let result = 1;

  while (result < value) {
    result *= 2;
  }

  return result;
}

function alignToMultiple(value, multiple) {
  return Math.ceil(value / multiple) * multiple;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clampByte(value) {
  return clamp(Math.round(value), 0, 255);
}

const sourcePngPaths = collectSourcePngPaths();
const primarySourcePaths = new Set(ASSETS.map(([, sourcePath]) => sourcePath));
const sharedSourcePaths = sourcePngPaths.filter((sourcePath) =>
  isSharedAtlasCandidate(sourcePath, primarySourcePaths),
);
const sharedAssets = sharedSourcePaths.map((sourcePath) =>
  readAsset([sourceAssetIdFromPath(sourcePath), sourcePath, null]),
);
const primaryAssets = ASSETS.map(readAsset);
const primaryPage = {
  atlasId: 'atlas:game',
  imageName: path.basename(OUTPUT_IMAGE),
  imagePath: OUTPUT_IMAGE,
  jsonName: path.basename(OUTPUT_JSON),
  jsonPath: OUTPUT_JSON,
  packed: packAssets(primaryAssets),
};
const sharedPages = packAssetPages(sharedAssets).map((packed, index) => {
  const pageName = `${SHARED_ATLAS_BASENAME}-${index}`;
  return {
    atlasId: `atlas:shared-${index}`,
    imageName: `${pageName}.png`,
    imagePath: path.join(ATLAS_OUTPUT_DIR, `${pageName}.png`),
    jsonName: `${pageName}.json`,
    jsonPath: path.join(ATLAS_OUTPUT_DIR, `${pageName}.json`),
    packed,
  };
});
const atlasPages = [primaryPage, ...sharedPages];
const atlasBackedSourcePaths = new Set([
  ...sharedSourcePaths,
  ...[...primarySourcePaths].filter(
    (sourcePath) => !FULL_RESOLUTION_ATLAS_SOURCE_PATHS.has(sourcePath),
  ),
]);
const standaloneSourcePaths = sourcePngPaths.filter(
  (sourcePath) => !atlasBackedSourcePaths.has(sourcePath),
);

clearGeneratedSharedAtlasPages();
for (const page of atlasPages) {
  writeAtlas(page.packed, page);
}
fs.writeFileSync(
  OUTPUT_MODULE,
  createModule(
    atlasPages,
    [...atlasBackedSourcePaths].sort(),
    standaloneSourcePaths,
  ),
);
console.log(
  `built ${atlasPages.length} game atlas pages with ${
    primaryAssets.length + sharedAssets.length
  } frames; ${standaloneSourcePaths.length} source PNGs remain standalone`,
);
