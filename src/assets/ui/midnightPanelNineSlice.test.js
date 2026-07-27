import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';

const UI_ASSET_DIRECTORY = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../assets/game/source/ui',
);
const CENTER_COLOR = [36, 41, 56, 255];

function readPng(fileName) {
  return PNG.sync.read(
    fs.readFileSync(path.join(UI_ASSET_DIRECTORY, fileName)),
  );
}

function readPixel(image, x, y) {
  const offset = (y * image.width + x) * 4;
  return [...image.data.subarray(offset, offset + 4)];
}

describe('midnight panel nine-slice assets', () => {
  it('keeps the inner panel center free of the exported scratch pixels', () => {
    const panel = readPng('inner-section-panel-midnight-9slice.png');

    expect([panel.width, panel.height]).toEqual([157, 182]);

    for (let y = 34; y < 80; y += 1) {
      for (let x = 37; x < 65; x += 1) {
        expect(readPixel(panel, x, y)).toEqual(CENTER_COLOR);
      }
    }
  });

  it('derives the room-tab top cap from the repaired panel center cut', () => {
    const panel = readPng('inner-section-panel-midnight-9slice.png');
    const topCap = readPng('midnight-room-tab-top-cap-9slice.png');
    const metadata = JSON.parse(
      fs.readFileSync(
        path.join(
          UI_ASSET_DIRECTORY,
          'midnight-room-tab-top-cap-9slice.9slice.json',
        ),
        'utf8',
      ),
    );

    expect([topCap.width, topCap.height]).toEqual([157, 93]);
    expect(metadata.slice).toEqual({
      left: 83,
      top: 91,
      right: 73,
      bottom: 1,
    });

    for (let y = 0; y < topCap.height; y += 1) {
      for (let x = 0; x < topCap.width; x += 1) {
        expect(readPixel(topCap, x, y)).toEqual(readPixel(panel, x, y));
      }
    }
  });
});
