import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const settingsAssetDirectory = path.resolve(
  testDirectory,
  '../../../assets/game/source/ui/root-run-settings',
);

const PEER_FILL = [99, 73, 52, 255];
const PEER_STROKE = [190, 151, 119, 255];
const PEER_OUTLINE = [0, 0, 0, 255];

describe('settings preference icons', () => {
  it.each([
    ['theme-night', 1_500, 400, 400],
    ['theme-day', 1_500, 400, 400],
    ['friend-requests', 900, 300, 400],
    ['alliance-invitations', 900, 300, 400],
  ])(
    'keeps the %s icon in the sound/music/vibration art family',
    (iconName, minimumFill, minimumStroke, minimumOutline) => {
      const icon = PNG.sync.read(
        fs.readFileSync(
          path.join(
            settingsAssetDirectory,
            `settings-icon-${iconName}.png`,
          ),
        ),
      );

      expect(icon).toMatchObject({ width: 128, height: 116 });
      expect(countPixels(icon, PEER_FILL)).toBeGreaterThan(minimumFill);
      expect(countPixels(icon, PEER_STROKE)).toBeGreaterThan(minimumStroke);
      expect(countPixels(icon, PEER_OUTLINE)).toBeGreaterThan(minimumOutline);
      expect(countTransparentPixels(icon)).toBeGreaterThan(4_000);
    },
  );
});

function countPixels(icon, rgba) {
  let count = 0;
  for (let index = 0; index < icon.data.length; index += 4) {
    if (
      icon.data[index] === rgba[0] &&
      icon.data[index + 1] === rgba[1] &&
      icon.data[index + 2] === rgba[2] &&
      icon.data[index + 3] === rgba[3]
    ) {
      count += 1;
    }
  }
  return count;
}

function countTransparentPixels(icon) {
  let count = 0;
  for (let index = 3; index < icon.data.length; index += 4) {
    if (icon.data[index] === 0) {
      count += 1;
    }
  }
  return count;
}
