import { describe, expect, it } from 'vitest';

import {
  getAndroidAssetName,
  rewriteAndroidAssetReferences,
} from './optimize-android-web-assets.js';

describe('Android web asset optimization', () => {
  it('keeps hashed asset names stable while changing the image format', () => {
    expect(getAndroidAssetName('game-atlas-C4ZOzYXU.png')).toBe(
      'game-atlas-C4ZOzYXU.webp',
    );
    expect(() => getAndroidAssetName('game.js')).toThrow(/requires a PNG/u);
  });

  it('rewrites emitted references without touching unrelated public PNGs', () => {
    const content = [
      'const atlas = "/assets/game-atlas-a1.png";',
      'const icon = "/assets/icon-b2.png";',
      'const publicAsset = "/spine/pointer.png";',
    ].join('\n');

    expect(
      rewriteAndroidAssetReferences(content, [
        ['game-atlas-a1.png', 'game-atlas-a1.webp'],
        ['icon-b2.png', 'icon-b2.webp'],
      ]),
    ).toBe(
      [
        'const atlas = "/assets/game-atlas-a1.webp";',
        'const icon = "/assets/icon-b2.webp";',
        'const publicAsset = "/spine/pointer.png";',
      ].join('\n'),
    );
  });
});
