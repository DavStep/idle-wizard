import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PNG } from 'pngjs';

const ROOT_DIRECTORY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ICON_DIRECTORY = path.join(ROOT_DIRECTORY, 'assets/game/source/icons');
const SOURCE_PATH = path.join(ICON_DIRECTORY, 'icon-side-alliance-root-run.png');
const BASE_PATH = path.join(ICON_DIRECTORY, 'icon-alliance-banner-base.png');
const CLOTH_PATH = path.join(ICON_DIRECTORY, 'icon-alliance-banner-cloth-mask.png');
const CLOTH_MIN_X = 25;
const CLOTH_MAX_X = 102;

function getHue(red, green, blue) {
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const delta = maximum - minimum;
  if (delta === 0) {
    return 0;
  }

  let hue;
  if (maximum === red) {
    hue = 60 * (((green - blue) / delta) % 6);
  } else if (maximum === green) {
    hue = 60 * ((blue - red) / delta + 2);
  } else {
    hue = 60 * ((red - green) / delta + 4);
  }
  return hue < 0 ? hue + 360 : hue;
}

function isPurpleCloth(red, green, blue, alpha, x) {
  if (alpha === 0 || x < CLOTH_MIN_X || x > CLOTH_MAX_X) {
    return false;
  }
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const saturation = maximum === 0 ? 0 : (maximum - minimum) / maximum;
  const hue = getHue(red, green, blue);
  return hue >= 272 && hue <= 330 && saturation >= 0.18 && maximum >= 24;
}

const source = PNG.sync.read(fs.readFileSync(SOURCE_PATH));
const base = new PNG({ width: source.width, height: source.height });
const cloth = new PNG({ width: source.width, height: source.height });

for (let offset = 0; offset < source.data.length; offset += 4) {
  const x = (offset / 4) % source.width;
  const red = source.data[offset];
  const green = source.data[offset + 1];
  const blue = source.data[offset + 2];
  const alpha = source.data[offset + 3];

  if (isPurpleCloth(red, green, blue, alpha, x)) {
    const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
    const shade = Math.max(48, Math.min(255, Math.round((luminance / 74) * 255)));
    cloth.data[offset] = shade;
    cloth.data[offset + 1] = shade;
    cloth.data[offset + 2] = shade;
    cloth.data[offset + 3] = alpha;
    continue;
  }

  base.data[offset] = red;
  base.data[offset + 1] = green;
  base.data[offset + 2] = blue;
  base.data[offset + 3] = alpha;
}

fs.writeFileSync(BASE_PATH, PNG.sync.write(base));
fs.writeFileSync(CLOTH_PATH, PNG.sync.write(cloth));
