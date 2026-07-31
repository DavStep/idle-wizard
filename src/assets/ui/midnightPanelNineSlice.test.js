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

describe('Night and Day panel nine-slice assets', () => {
  it('keeps the inner panel center free of the exported scratch pixels', () => {
    const panel = readPng('inner-section-panel-midnight.9.png');

    expect([panel.width, panel.height]).toEqual([157, 182]);

    for (let y = 34; y < 80; y += 1) {
      for (let x = 37; x < 65; x += 1) {
        expect(readPixel(panel, x, y)).toEqual(CENTER_COLOR);
      }
    }
  });

  it('keeps the rounded top corners free of bright highlight specks', () => {
    const panel = readPng('inner-section-panel-midnight.9.png');
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
    const panel = readPng('inner-section-panel-midnight.9.png');
    const topCap = readPng('midnight-room-tab-top-cap.9.png');
    const metadata = JSON.parse(
      fs.readFileSync(
        path.join(
          UI_ASSET_DIRECTORY,
          'midnight-room-tab-top-cap.9.9slice.json',
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
    const topCap = readPng('midnight-room-tab-top-cap.9.png');
    const selectedTopCap = readPng(
      'midnight-room-tab-top-cap-selected.9.png',
    );
    const metadata = JSON.parse(
      fs.readFileSync(
        path.join(
          UI_ASSET_DIRECTORY,
          'midnight-room-tab-top-cap-selected.9.9slice.json',
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

  it('uses a flipped 30px room-tab cap for every top-panel theme', () => {
    const roomTab = readPng('midnight-room-tab-top-cap.9.png');
    const topPanel = readPng('midnight-top-panel-background.9.png');
    const metadata = JSON.parse(
      fs.readFileSync(
        path.join(
          UI_ASSET_DIRECTORY,
          'midnight-top-panel-background.9.9slice.json',
        ),
        'utf8',
      ),
    );

    expect([topPanel.width, topPanel.height]).toEqual([
      roomTab.width,
      roomTab.height,
    ]);
    expect(metadata.slice).toEqual({
      left: 30,
      top: 1,
      right: 30,
      bottom: 30,
    });

    const firstVisibleX = (image) => {
      for (let x = 0; x < image.width; x += 1) {
        if (readPixel(image, x, 0)[3] > 8) {
          return x;
        }
      }
      return image.width;
    };

    expect(firstVisibleX(topPanel)).toBe(0);
    expect(firstVisibleX(roomTab)).toBe(40);

    const bottomFirstVisibleX = firstVisibleX({
      data: topPanel.data.subarray(
        (topPanel.height - 1) * topPanel.width * 4,
      ),
      height: 1,
      width: topPanel.width,
    });
    expect(bottomFirstVisibleX).toBeGreaterThanOrEqual(28);
    expect(bottomFirstVisibleX).toBeLessThanOrEqual(31);

    const cornerStartY = topPanel.height - 30;
    let previousInset = 0;
    for (let y = cornerStartY; y < topPanel.height; y += 1) {
      const row = {
        data: topPanel.data.subarray(
          y * topPanel.width * 4,
          (y + 1) * topPanel.width * 4,
        ),
        height: 1,
        width: topPanel.width,
      };
      const inset = firstVisibleX(row);

      expect(inset).toBeGreaterThanOrEqual(previousInset);
      previousInset = inset;
    }
  });

  it('keeps every Day recolor pixel-aligned with its Night source', () => {
    const pairs = [
      [
        'inner-section-panel-midnight.9.png',
        'inner-section-panel-day.9.png',
      ],
      [
        'midnight-room-tab-top-cap.9.png',
        'day-room-tab-top-cap.9.png',
      ],
      [
        'midnight-room-tab-top-cap-selected.9.png',
        'day-room-tab-top-cap-selected.9.png',
      ],
      [
        'midnight-top-panel-background.9.png',
        'day-top-panel-background.9.png',
      ],
    ];

    for (const [nightFile, dayFile] of pairs) {
      const night = readPng(nightFile);
      const day = readPng(dayFile);

      expect([day.width, day.height]).toEqual([
        night.width,
        night.height,
      ]);

      for (let offset = 3; offset < night.data.length; offset += 4) {
        expect(day.data[offset]).toBe(night.data[offset]);
      }
    }

    const inactive = readPng('day-room-tab-top-cap.9.png');
    const selected = readPng(
      'day-room-tab-top-cap-selected.9.png',
    );
    expect(luminance(readPixel(selected, 78, 46))).toBeGreaterThan(
      luminance(readPixel(inactive, 78, 46)),
    );
  });

  it('keeps every themed room-tab and top-panel sidecar aligned', () => {
    const expectedSlices = new Map([
      ['midnight-room-tab-top-cap.9.9slice.json', {
        left: 83,
        top: 91,
        right: 73,
        bottom: 1,
      }],
      ['midnight-room-tab-top-cap-selected.9.9slice.json', {
        left: 83,
        top: 91,
        right: 73,
        bottom: 1,
      }],
      ['day-room-tab-top-cap.9.9slice.json', {
        left: 83,
        top: 91,
        right: 73,
        bottom: 1,
      }],
      ['day-room-tab-top-cap-selected.9.9slice.json', {
        left: 83,
        top: 91,
        right: 73,
        bottom: 1,
      }],
      ['midnight-top-panel-background.9.9slice.json', {
        left: 30,
        top: 1,
        right: 30,
        bottom: 30,
      }],
      ['day-top-panel-background.9.9slice.json', {
        left: 30,
        top: 1,
        right: 30,
        bottom: 30,
      }],
    ]);

    for (const [fileName, slice] of expectedSlices) {
      const metadata = JSON.parse(
        fs.readFileSync(path.join(UI_ASSET_DIRECTORY, fileName), 'utf8'),
      );

      expect(metadata.slice).toEqual(slice);
    }
  });

  it('keeps the Day top-panel antialias fringe warm at its corners', () => {
    const topPanel = readPng('day-top-panel-background.9.png');

    for (let y = 0; y < topPanel.height; y += 1) {
      for (let x = 0; x < topPanel.width; x += 1) {
        const [red, , blue, alpha] = readPixel(topPanel, x, y);

        if (alpha > 0 && alpha < 255) {
          expect(red).toBeGreaterThan(blue);
        }
      }
    }
  });
});
