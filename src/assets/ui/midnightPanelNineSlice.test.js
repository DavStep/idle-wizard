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
const CORNER_HIGHLIGHT_MAX_LUMINANCE = 48;

function readPng(fileName) {
  return PNG.sync.read(
    fs.readFileSync(path.join(UI_ASSET_DIRECTORY, fileName)),
  );
}

function readPixel(image, x, y) {
  const offset = (y * image.width + x) * 4;
  return [...image.data.subarray(offset, offset + 4)];
}

function luminance([red, green, blue]) {
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
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

  it('keeps the rounded top corners free of bright highlight specks', () => {
    const panel = readPng('inner-section-panel-midnight-9slice.png');
    const cornerXs = [
      ...Array.from({ length: 58 }, (_, index) => index),
      ...Array.from({ length: 58 }, (_, index) => 99 + index),
    ];

    for (let y = 0; y < 56; y += 1) {
      for (const x of cornerXs) {
        const pixel = readPixel(panel, x, y);

        if (pixel[3] === 255) {
          expect(luminance(pixel)).toBeLessThanOrEqual(
            CORNER_HIGHLIGHT_MAX_LUMINANCE,
          );
        }
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

  it('keeps the selected top cap lighter with identical nine-slice geometry', () => {
    const topCap = readPng('midnight-room-tab-top-cap-9slice.png');
    const selectedTopCap = readPng(
      'midnight-room-tab-top-cap-selected-9slice.png',
    );
    const metadata = JSON.parse(
      fs.readFileSync(
        path.join(
          UI_ASSET_DIRECTORY,
          'midnight-room-tab-top-cap-selected-9slice.9slice.json',
        ),
        'utf8',
      ),
    );

    expect([selectedTopCap.width, selectedTopCap.height]).toEqual([
      topCap.width,
      topCap.height,
    ]);
    expect(metadata.slice).toEqual({
      left: 83,
      top: 91,
      right: 73,
      bottom: 1,
    });
    expect(readPixel(topCap, 78, 46)).toEqual([36, 41, 56, 255]);
    expect(readPixel(selectedTopCap, 78, 46)).toEqual([47, 54, 72, 255]);

    for (let y = 0; y < topCap.height; y += 1) {
      for (let x = 0; x < topCap.width; x += 1) {
        expect(readPixel(selectedTopCap, x, y)[3]).toBe(
          readPixel(topCap, x, y)[3],
        );
      }
    }
  });
});
