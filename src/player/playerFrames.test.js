import { describe, expect, it } from 'vitest';

import { PLAYER_FRAME_OPTIONS } from './playerFrames.js';

const FRAME_SURFACE_RGB = [172, 119, 76];
const DECORATION_RGB = [112, 74, 54];
const MIN_DECORATION_CONTRAST = 1.75;

describe('player frame colors', () => {
  it('keeps the profile decoration visible after Pixi multiplies each tint', () => {
    for (const option of PLAYER_FRAME_OPTIONS) {
      const surface = multiplyRgbByTint(FRAME_SURFACE_RGB, option.tint);
      const decoration = multiplyRgbByTint(DECORATION_RGB, option.tint);

      expect(
        contrastRatio(surface, decoration),
        `${option.key} background decoration contrast`,
      ).toBeGreaterThanOrEqual(MIN_DECORATION_CONTRAST);
    }
  });
});

function multiplyRgbByTint(rgb, tint) {
  const tintRgb = [tint >> 16, (tint >> 8) & 0xff, tint & 0xff];
  return rgb.map((channel, index) =>
    Math.round((channel * tintRgb[index]) / 255),
  );
}

function contrastRatio(first, second) {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  return (
    (Math.max(firstLuminance, secondLuminance) + 0.05) /
    (Math.min(firstLuminance, secondLuminance) + 0.05)
  );
}

function relativeLuminance([red, green, blue]) {
  const [linearRed, linearGreen, linearBlue] = [red, green, blue].map(
    toLinearChannel,
  );
  return linearRed * 0.2126 + linearGreen * 0.7152 + linearBlue * 0.0722;
}

function toLinearChannel(channel) {
  const normalized = channel / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}
