import { describe, expect, it } from 'vitest';

import {
  PIXI_PRODUCTION_ASSET_MANIFEST,
  resolvePixiPublicAssetUrl,
} from './PixiProductionAssetManifest.js';

describe('PixiProductionAssetManifest', () => {
  it('excludes retired player-card skins from production and editor discovery', () => {
    expect(
      PIXI_PRODUCTION_ASSET_MANIFEST.some(({ id }) =>
        id.includes('/player-card-'),
      ),
    ).toBe(false);
  });

  it('resolves public production assets against the deployed base path', () => {
    expect(
      resolvePixiPublicAssetUrl(
        '/spine/tutorial-pointer/pointer.skel',
        '/idle-wizard/',
      ),
    ).toBe('/idle-wizard/spine/tutorial-pointer/pointer.skel');
    expect(
      resolvePixiPublicAssetUrl(
        'spine/tutorial-pointer/pointer.atlas',
        '/idle-wizard',
      ),
    ).toBe('/idle-wizard/spine/tutorial-pointer/pointer.atlas');
    expect(
      resolvePixiPublicAssetUrl(
        '/spine/tutorial-pointer/pointer.png',
        '/',
      ),
    ).toBe('/spine/tutorial-pointer/pointer.png');
  });
});
