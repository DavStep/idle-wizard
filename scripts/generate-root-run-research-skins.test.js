import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import pngjs from 'pngjs';
import { describe, expect, it } from 'vitest';

const { PNG } = pngjs;
const WHITE_SQUIRCLE_SIZES = Object.freeze([
  2, 4, 6, 10, 15, 16, 19, 20, 25, 30, 35, 40, 50, 55, 60, 70, 80, 90,
  114,
]);

describe('Root Run research skin generator', () => {
  it('builds from the checked-in canonical source assets', () => {
    const result = spawnSync(
      process.execPath,
      ['scripts/generate-root-run-research-skins.mjs'],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
      },
    );

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain(
      'generated the locked research source and 3 fixed-size Root Run research skins',
    );
  });

  it('keeps the shared squircle family white and free of Android markers', () => {
    const directory = path.join(
      process.cwd(),
      'assets/game/source/ui/white-squircle',
    );

    for (const size of WHITE_SQUIRCLE_SIZES) {
      const asset = `white-squircle-${size}.9.png`;
      const image = PNG.sync.read(readFileSync(path.join(directory, asset)));
      const metadata = JSON.parse(
        readFileSync(
          path.join(directory, `white-squircle-${size}.9.9slice.json`),
          'utf8',
        ),
      );
      let allVisiblePixelsAreWhite = true;

      for (let offset = 0; offset < image.data.length; offset += 4) {
        if (image.data[offset + 3] === 0) {
          continue;
        }
        allVisiblePixelsAreWhite &&=
          image.data[offset] === 255 &&
          image.data[offset + 1] === 255 &&
          image.data[offset + 2] === 255;
      }

      expect(allVisiblePixelsAreWhite, asset).toBe(true);
      expect(metadata.asset).toBe(asset);
      expect(metadata.cleanup.androidNinePatchBorderStripped).toBe(true);
      expect(metadata.source.width).toBe(image.width);
      expect(metadata.source.height).toBe(image.height);
      expect(
        metadata.slice.left +
          metadata.slice.right +
          metadata.rendering.minimumCenter.width,
      ).toBe(image.width);
      expect(
        metadata.slice.top +
          metadata.slice.bottom +
          metadata.rendering.minimumCenter.height,
      ).toBe(image.height);
    }
  });
});
