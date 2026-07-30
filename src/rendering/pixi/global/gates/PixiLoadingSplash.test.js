// @vitest-environment jsdom

import { Texture } from 'pixi.js';
import { describe, expect, it } from 'vitest';

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
});
