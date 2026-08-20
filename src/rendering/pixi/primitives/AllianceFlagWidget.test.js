import { describe, expect, it } from 'vitest';
import { Texture } from 'pixi.js';

import {
  ALLIANCE_FLAG_ASSETS,
  ALLIANCE_FLAG_GEOMETRY,
  AllianceFlagWidget,
} from './AllianceFlagWidget.js';

describe('AllianceFlagWidget', () => {
  it('uses the canonical single-tail Root Run Alliance pennant geometry', () => {
    expect(ALLIANCE_FLAG_ASSETS).toEqual({
      base: 'source:assets/icons/icon-alliance-banner-base.png',
      cloth: 'source:assets/icons/icon-alliance-banner-cloth-mask.png',
      emblem: 'source:assets/icons/icon-alliance-banner-emblem.png',
    });
    expect(ALLIANCE_FLAG_GEOMETRY).toEqual({
      sourceWidth: 128,
      sourceHeight: 128,
      emblemSize: 61.6,
      emblemY: 60,
    });
  });

  it('swaps among normalized emblem textures while preserving the larger geometry', () => {
    const requested = [];
    const assetManager = {
      getTexture(assetId) {
        requested.push(assetId);
        return Texture.WHITE;
      },
    };
    const flag = new AllianceFlagWidget({
      assetManager,
      emblemId: 'owl',
    });

    expect(flag.emblemId).toBe('owl');
    expect(requested).toContain(
      'source:assets/icons/icon-alliance-emblem-owl.png',
    );
    flag.setEmblem('not-real');
    expect(flag.emblemId).toBe('unity');
    expect(flag.emblem.width).toBe(61.6);

    flag.destroy({ children: true });
  });
});
