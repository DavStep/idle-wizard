// @vitest-environment jsdom
/* global process */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { PNG } from 'pngjs';
import { Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

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

const SPLASH_SOURCE_PATH = resolve(
  process.cwd(),
  'assets/game/source/ui/idle-witch-craft-splash/splash-screen.png',
);
const TITLE_EDIT_BOUNDS = Object.freeze({
  left: 100,
  top: 145,
  right: 720,
  bottom: 610,
});
const APPROVED_BACKGROUND_HASH =
  'f0dd127413758ddf177183ac60b55a76379362725343740f07f61412e31ffade';

describe('PixiLoadingSplash', () => {
  it('preserves the approved background pixels outside the title edit', () => {
    const splash = PNG.sync.read(readFileSync(SPLASH_SOURCE_PATH));
    const backgroundPixels = [];

    expect([splash.width, splash.height]).toEqual([818, 1923]);

    for (let y = 0; y < splash.height; y += 1) {
      for (let x = 0; x < splash.width; x += 1) {
        const isTitleEdit =
          x >= TITLE_EDIT_BOUNDS.left &&
          x <= TITLE_EDIT_BOUNDS.right &&
          y >= TITLE_EDIT_BOUNDS.top &&
          y <= TITLE_EDIT_BOUNDS.bottom;
        if (isTitleEdit) {
          continue;
        }
        const pixelOffset = (y * splash.width + x) * 4;
        backgroundPixels.push(
          splash.data[pixelOffset],
          splash.data[pixelOffset + 1],
          splash.data[pixelOffset + 2],
        );
      }
    }

    expect(
      createHash('sha256')
        .update(Uint8Array.from(backgroundPixels))
        .digest('hex'),
    ).toBe(APPROVED_BACKGROUND_HASH);
  });

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
      uiScale: 1,
      safeInsets: { top: 47, right: 0, bottom: 0, left: 0 },
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
    expect(splash.loadingLabel.text).toBe('Loading');
    expect(splash.statusLabel.text).toBe('Loading assets...');
    expect(splash.statusLabel.fontSize).toBe(10);
    expect(splash.statusLabel.y).toBeGreaterThan(splash.loadingLabel.y);
    expect(splash.statusLabel.y).toBeLessThan(splash.progressBar.y);
    expect(splash.versionLabel.text).toMatch(/^v\d+\.\d+\.\d+$/u);
    expect(splash.versionLabel.fontFamily).toBe(
      splash.loadingLabel.fontFamily,
    );
    expect(splash.versionLabel.textObject.style.fontFamily).toBe(
      splash.loadingLabel.textObject.style.fontFamily,
    );
    expect(splash.versionLabel.position).toMatchObject({ x: 12, y: 59 });
    expect(splash.progressBar).toBeInstanceOf(PixiProgressBar);
    expect(splash.progressBar.barHeight).toBe(
      PIXI_UI_GEOMETRY.progressTotalHeight,
    );
    expect(splash.progressBar.theme.progress.key).toBe('gradient');
    expect(splash.progressBar.end).toBe(0.5);

    splash.destroy({ children: true });
  });

  it('shows phase and issue detail under the fixed Loading label', () => {
    const splash = new PixiLoadingSplash({
      assets: {
        getTexture: () => Texture.EMPTY,
      },
    });

    splash.setStatus('Connecting user...');
    expect(splash.loadingLabel.text).toBe('Loading');
    expect(splash.statusLabel.text).toBe('Connecting user...');

    splash.setText('Issue: Server is paused.');
    expect(splash.loadingLabel.text).toBe('Loading');
    expect(splash.statusLabel.text).toBe('Issue: Server is paused.');

    splash.destroy({ children: true });
  });

  it('preserves an indeterminate range through viewport layout', () => {
    const splash = new PixiLoadingSplash({
      assets: {
        getTexture: () => Texture.EMPTY,
      },
    });

    splash.setProgressRange(0.36, 0.64);
    splash.layout({
      viewportPx: { width: 390, height: 844 },
      sourceHeight: 844,
      sourceOffsetX: 0,
      sourceScale: 1,
      stageLogicalWidth: 390,
    });

    expect(splash.progressBar.start).toBe(0.36);
    expect(splash.progressBar.end).toBe(0.64);

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

  it('shows a compact connected identity and keeps the full value for copy', () => {
    const fullIdentity = '12345678abcdef12345678abcdef12345678';
    let identity = {
      toHexString: () => fullIdentity,
    };
    const splash = new PixiLoadingSplash({
      assets: {
        getTexture: () => Texture.EMPTY,
      },
      getUserId: () => identity,
    });
    splash.layout({
      viewportPx: { width: 390, height: 844 },
      sourceHeight: 844,
      sourceOffsetX: 0,
      sourceScale: 1,
      uiScale: 1,
      safeInsets: { top: 47, right: 0, bottom: 0, left: 0 },
      stageLogicalWidth: 390,
    });

    expect(splash.userIdLabel.text).toBe('12345678…12345678');
    expect(splash.userIdLabel.visible).toBe(true);
    expect(splash.copyButton.textLabel.text).toBe('Copy');
    expect(splash.copyButton.visible).toBe(true);
    expect(splash.versionLabel.y).toBe(59);
    expect(splash.copyButton.x).toBe(320);
    expect(splash.copyButton.y).toBe(splash.versionLabel.y);
    expect(splash.userIdLabel.y).toBe(splash.copyButton.y + 12);

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    return splash.copyUserId().then(() => {
      expect(writeText).toHaveBeenCalledWith(fullIdentity);
      expect(splash.copyButton.textLabel.text).toBe('Copied');

      identity = null;
      splash.setProgress(0.25);
      expect(splash.userIdLabel.visible).toBe(false);
      expect(splash.copyButton.visible).toBe(false);

      splash.destroy({ children: true });
    });
  });
});
