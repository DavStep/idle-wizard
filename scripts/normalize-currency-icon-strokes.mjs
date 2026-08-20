import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const ROOT_DIRECTORY = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const ICON_DIRECTORY = path.join(ROOT_DIRECTORY, 'assets/game/source/icons');
const COIN_ICON_FILE = 'icon-coin.png';
const TARGET_ICON_FILES = [
  'icon-amber.png',
  'icon-amethyst.png',
  'icon-emerald.png',
  'icon-mana-drop.png',
  'icon-ruby.png',
];
const ALPHA_THRESHOLD = 16;
const DARK_CONTOUR_LUMINANCE = 35;
const DARK_RING_COVERAGE = 0.9;

const coin = readIcon(COIN_ICON_FILE);
const referenceThickness = measureExteriorDarkContourWidth(coin);
const referenceColor = measureContourColor(coin, referenceThickness);

if (referenceThickness !== 5) {
  throw new Error(
    `Expected ${COIN_ICON_FILE} to own a 5px contour, received ${referenceThickness}px.`,
  );
}

for (const fileName of TARGET_ICON_FILES) {
  const image = readIcon(fileName);
  const exterior = collectExteriorPixels(image);

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const offset = (y * image.width + x) * 4;

      if (image.data[offset + 3] <= ALPHA_THRESHOLD) {
        continue;
      }

      const distance = distanceFromExterior(x, y, exterior);

      if (distance < 1 || distance > referenceThickness) {
        continue;
      }

      image.data[offset] = referenceColor.red;
      image.data[offset + 1] = referenceColor.green;
      image.data[offset + 2] = referenceColor.blue;
    }
  }

  const outputPath = path.join(ICON_DIRECTORY, fileName);
  fs.writeFileSync(outputPath, PNG.sync.write(image));
  const actualThickness = measureExteriorDarkContourWidth(image);

  if (actualThickness !== referenceThickness) {
    throw new Error(
      `${fileName} resolved to ${actualThickness}px instead of ${referenceThickness}px.`,
    );
  }

  process.stdout.write(`${fileName}: ${actualThickness}px contour\n`);
}

function readIcon(fileName) {
  return PNG.sync.read(fs.readFileSync(path.join(ICON_DIRECTORY, fileName)));
}

function measureContourColor(image, thickness) {
  const exterior = collectExteriorPixels(image);
  const totals = { blue: 0, count: 0, green: 0, red: 0 };

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const offset = (y * image.width + x) * 4;

      if (image.data[offset + 3] <= ALPHA_THRESHOLD) {
        continue;
      }

      const distance = distanceFromExterior(x, y, exterior);

      if (distance < 1 || distance > thickness) {
        continue;
      }

      totals.red += image.data[offset];
      totals.green += image.data[offset + 1];
      totals.blue += image.data[offset + 2];
      totals.count += 1;
    }
  }

  return {
    red: Math.round(totals.red / totals.count),
    green: Math.round(totals.green / totals.count),
    blue: Math.round(totals.blue / totals.count),
  };
}

function measureExteriorDarkContourWidth(image) {
  const exterior = collectExteriorPixels(image);
  const ringTotals = Array.from({ length: 16 }, () => ({ dark: 0, total: 0 }));

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const offset = (y * image.width + x) * 4;

      if (image.data[offset + 3] <= ALPHA_THRESHOLD) {
        continue;
      }

      const distance = distanceFromExterior(x, y, exterior);

      if (distance < 1 || distance >= ringTotals.length) {
        continue;
      }

      const luminance =
        image.data[offset] * 0.2126
        + image.data[offset + 1] * 0.7152
        + image.data[offset + 2] * 0.0722;
      ringTotals[distance].total += 1;
      ringTotals[distance].dark += luminance < DARK_CONTOUR_LUMINANCE ? 1 : 0;
    }
  }

  let thickness = 0;

  for (const ring of ringTotals.slice(1)) {
    if (ring.total === 0 || ring.dark / ring.total <= DARK_RING_COVERAGE) {
      break;
    }

    thickness += 1;
  }

  return thickness;
}

function collectExteriorPixels(image) {
  const exterior = [];

  for (let y = -1; y <= image.height; y += 1) {
    for (let x = -1; x <= image.width; x += 1) {
      if (
        x < 0
        || y < 0
        || x >= image.width
        || y >= image.height
        || image.data[(y * image.width + x) * 4 + 3] <= ALPHA_THRESHOLD
      ) {
        exterior.push([x, y]);
      }
    }
  }

  return exterior;
}

function distanceFromExterior(x, y, exterior) {
  return Math.floor(
    Math.sqrt(
      exterior.reduce(
        (closest, [exteriorX, exteriorY]) =>
          Math.min(
            closest,
            (x - exteriorX) ** 2 + (y - exteriorY) ** 2,
          ),
        Number.POSITIVE_INFINITY,
      ),
    ),
  );
}
