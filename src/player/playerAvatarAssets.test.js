import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';

import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';

import {
  PLAYER_AVATAR_CUTS,
  PLAYER_AVATAR_SIZE,
} from '../../scripts/build-player-avatar-assets.mjs';
import { getPlayerCharacterOptions } from './playerCharacters.js';

describe('player avatar assets', () => {
  it('provides one square normalized cut for every selectable character', () => {
    const characterKeys = getPlayerCharacterOptions().map(({ key }) => key);

    expect(Object.keys(PLAYER_AVATAR_CUTS).sort()).toEqual(
      [...characterKeys].sort(),
    );
    for (const key of characterKeys) {
      const avatar = readPng(
        `assets/game/source/avatars/${key}.png`,
      );
      expect(
        [avatar.width, avatar.height],
        key,
      ).toEqual([PLAYER_AVATAR_SIZE, PLAYER_AVATAR_SIZE]);
    }
  });

  it('keeps Elara as the unchanged crop reference and preserves her full art', () => {
    const source = readPng('assets/game/source/characters/elara.png');
    const avatar = readPng('assets/game/source/avatars/elara.png');

    expect([source.width, source.height]).toEqual([87, 108]);
    for (let y = 0; y < PLAYER_AVATAR_SIZE; y += 1) {
      for (let x = 0; x < PLAYER_AVATAR_SIZE; x += 1) {
        expect(readPixel(avatar, x, y)).toEqual(
          readPixel(source, x, y + 8),
        );
      }
    }
  });

  it('keeps selectable character silhouettes free of pale export matte', () => {
    const characterKeys = getPlayerCharacterOptions().map(({ key }) => key);

    for (const key of characterKeys) {
      const character = readPng(
        `assets/game/source/characters/${key}.png`,
      );
      expect(
        countPaleMattePixels(character),
        key,
      ).toBeLessThanOrEqual(16);
    }
  });
});

function readPng(relativePath) {
  return PNG.sync.read(
    readFileSync(`${cwd()}/${relativePath}`),
  );
}

function readPixel(image, x, y) {
  const index = (y * image.width + x) * 4;
  return Array.from(image.data.subarray(index, index + 4));
}

function countPaleMattePixels(image) {
  let count = 0;

  for (let index = 0; index < image.data.length; index += 4) {
    const red = image.data[index];
    const green = image.data[index + 1];
    const blue = image.data[index + 2];
    const alpha = image.data[index + 3];
    if (
      alpha > 0 &&
      alpha < 240 &&
      red > 205 &&
      green > 205 &&
      blue > 205
    ) {
      count += 1;
    }
  }

  return count;
}
