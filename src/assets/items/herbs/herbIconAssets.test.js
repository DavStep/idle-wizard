import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';

const sourceHerbDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../assets/game/source/items/herbs',
);

function inspectAlpha(filename) {
  const png = PNG.sync.read(fs.readFileSync(path.join(sourceHerbDirectory, filename)));
  let visiblePixelCount = 0;
  let partialPixelCount = 0;

  for (let index = 3; index < png.data.length; index += 4) {
    const alpha = png.data[index];
    if (alpha === 0) {
      continue;
    }

    visiblePixelCount += 1;
    if (alpha < 255) {
      partialPixelCount += 1;
    }
  }

  return {
    height: png.height,
    partialAlphaRatio: partialPixelCount / visiblePixelCount,
    width: png.width,
  };
}

describe('herb icon source assets', () => {
  it.each(['herb-sage.png', 'herb-lavender.png'])(
    'keeps %s crisp and atlas-ready',
    (filename) => {
      const asset = inspectAlpha(filename);

      expect(asset.width).toBe(256);
      expect(asset.height).toBe(256);
      expect(asset.partialAlphaRatio).toBeLessThan(0.25);
    },
  );
});
