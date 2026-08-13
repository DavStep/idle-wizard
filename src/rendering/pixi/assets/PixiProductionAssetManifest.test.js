import { describe, expect, it } from 'vitest';

import {
  PIXI_PRODUCTION_ASSET_MANIFEST,
  PIXI_STARTUP_ASSET_IDS,
  resolvePixiPublicAssetUrl,
} from './PixiProductionAssetManifest.js';

describe('PixiProductionAssetManifest', () => {
  it('marks the loading splash as the startup asset phase', () => {
    expect(PIXI_STARTUP_ASSET_IDS).toEqual([
      'source:assets/ui/idle-witch-craft-splash/splash-screen.png',
      'source:assets/ui/root-run-progress/progress-track.9.png',
      'source:assets/ui/root-run-progress/progress-fill-mask.9.png',
    ]);
    expect(
      PIXI_PRODUCTION_ASSET_MANIFEST.some(({ id }) =>
        PIXI_STARTUP_ASSET_IDS.includes(id),
      ),
    ).toBe(true);
  });

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
