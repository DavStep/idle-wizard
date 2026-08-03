import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { PNG } from 'pngjs';

const ROOT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const ASSET_DIR = path.join(
  ROOT_DIR,
  'assets/game/source/ui/regular-button',
);
const COLORS = Object.freeze([
  'blue',
  'brown',
  'dark-brown',
  'gray',
  'green',
  'purple',
  'red',
  'yellow',
]);
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

for (const color of COLORS) {
  for (const tier of TIERS) {
    validateAsset(color, tier);
  }
}

process.stdout.write(
  `Validated ${COLORS.length * TIERS.length} canonical regular button assets in ${
    path.relative(ROOT_DIR, ASSET_DIR)
  }\n`,
);

function validateAsset(color, tier) {
  const filename = `${color}-button-${tier.radius}.9.png`;
  const assetPath = path.join(ASSET_DIR, filename);
  const metadataPath = assetPath.replace(/\.png$/i, '.9slice.json');
  const image = PNG.sync.read(readFileSync(assetPath));
  const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
  const expectedPath = path.posix.join(
    'assets/game/source/ui/regular-button',
    filename,
  );

  assertEqual(`${filename} width`, image.width, tier.width);
  assertEqual(`${filename} height`, image.height, tier.height);
  assertEqual(`${filename} metadata asset`, metadata.asset, filename);
  assertEqual(
    `${filename} metadata source path`,
    metadata.source?.path,
    expectedPath,
  );
  assertShape(`${filename} slice`, metadata.slice, tier.slice);
  assertShape(
    `${filename} output insets`,
    metadata.rendering?.outputInsets,
    tier.slice,
  );
  assertShape(
    `${filename} minimum size`,
    metadata.rendering?.minimumSize,
    { width: tier.width, height: tier.height },
  );
  assertShape(
    `${filename} minimum center`,
    metadata.rendering?.minimumCenter,
    { width: 3, height: 3 },
  );
}

function assertShape(label, actual, expected) {
  assertEqual(label, JSON.stringify(actual), JSON.stringify(expected));
}

function assertEqual(label, actual, expected) {
  if (actual !== expected) {
    throw new Error(`${label} must be ${expected}; received ${actual}`);
  }
}
