// @vitest-environment jsdom

import { Texture } from 'pixi.js';
import { describe, expect, it } from 'vitest';

import { PixiAssetManager } from '../../assets/PixiAssetManager.js';
import { installPixiPageTestCanvas } from '../../pages/workshop/PixiPageTestHarness.js';
import { PixiProgressBar } from '../../primitives/PixiProgressBar.js';
import {
  createPixiThemeSnapshot,
  PIXI_FONT_FAMILIES,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import { PixiLoadingSplash } from './PixiLoadingSplash.js';

installPixiPageTestCanvas();

describe('PixiLoadingSplash', () => {
  it('constructs after the startup-only asset phase', async () => {
    const assets = new PixiAssetManager({
      assets: { load: async () => Texture.EMPTY },
      fontFaceSet: {
        load: async () => [{}],
        ready: Promise.resolve(),
      },
    });

    await assets.loadCritical();

    const splash = new PixiLoadingSplash({ assets });
    expect(splash.art.texture).toBe(Texture.EMPTY);

    splash.destroy({ children: true });
    assets.destroy();
  });

  it('reuses the fixed game font and shared gradient progress rail', () => {
    const splash = new PixiLoadingSplash({
      assets: {
        getTexture: () => Texture.EMPTY,
      },
    });
    const projection = {
      viewportPx: { width: 390, height: 844 },
      sourceHeight: 2170 / 3,
      sourceOffsetX: 0,
      sourceScale: 3,
      stageLogicalWidth: 1080,
    };

    splash.applyTheme(
      createPixiThemeSnapshot({
        font: 'comic-sans-mono',
        progressBar: 'regular',
      }),
    );
    splash.layout(projection);
    splash.setProgress(0.5);

    expect(splash.loadingLabel.fontFamily).toBe(
      PIXI_FONT_FAMILIES['lilita-one'],
    );
    expect(splash.loadingLabel.textObject.style.fontFamily).toBe(
      PIXI_FONT_FAMILIES['lilita-one'],
    );
    expect(splash.progressBar).toBeInstanceOf(PixiProgressBar);
    expect(splash.progressBar.barHeight).toBe(
      PIXI_UI_GEOMETRY.progressTotalHeight,
    );
    expect(splash.progressBar.theme.progress.key).toBe('gradient');
    expect(splash.progressBar.end).toBe(0.5);

    splash.destroy({ children: true });
  });

  it('keeps splash art and loading chrome inside the authored game bounds on wide screens', () => {
    const splash = new PixiLoadingSplash({
      assets: {
        getTexture: () => Texture.EMPTY,
      },
    });
    const stageLogicalWidth = 3472;
    const authoredOffsetX =
      (stageLogicalWidth - PIXI_UI_GEOMETRY.authoredWidth) / 2;

    splash.layout({
      viewportPx: { width: 1440, height: 900 },
      sourceHeight: PIXI_UI_GEOMETRY.authoredHeight / 3,
      sourceOffsetX: authoredOffsetX / 3,
      sourceScale: 3,
      stageLogicalWidth,
    });

    expect(splash.art.x - splash.art.width / 2).toBe(0);
    expect(splash.art.x + splash.art.width / 2).toBe(
      PIXI_UI_GEOMETRY.sourceWidth,
    );
    expect(splash.progressBar.x).toBeGreaterThanOrEqual(0);
    expect(splash.progressBar.x + splash.progressBar.barWidth).toBeLessThanOrEqual(
      PIXI_UI_GEOMETRY.sourceWidth,
    );

    splash.destroy({ children: true });
  });
});
