import { readFileSync } from 'node:fs';

import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';

const ASSET_DIR = 'assets/game/source/ui';
const ASSETS = [
  'midnight-top-panel-background.9.png',
  'day-top-panel-background.9.png',
];

describe('top panel background asset generator', () => {
  it('keeps the authored width as the safe horizontal minimum', () => {
    for (const filename of ASSETS) {
      const png = PNG.sync.read(
        readFileSync(`${ASSET_DIR}/${filename}`),
      );
      const metadata = JSON.parse(
        readFileSync(
          `${ASSET_DIR}/${filename.replace(/\.png$/, '')}.9slice.json`,
          'utf8',
        ),
      );
      const outputInsets = metadata.rendering.outputInsets;

      expect(metadata.rendering.minimumCenter, filename).toEqual({
        width: png.width - outputInsets.left - outputInsets.right,
        height: 1,
      });
      expect(metadata.rendering.minimumSize, filename).toEqual({
        width: png.width,
        height: outputInsets.top + outputInsets.bottom + 1,
      });
    }
  });
});
