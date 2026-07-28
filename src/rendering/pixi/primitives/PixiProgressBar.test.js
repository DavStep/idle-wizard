// @vitest-environment jsdom

import {
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  PIXI_PROGRESS_VISUALS,
  PIXI_UI_GEOMETRY,
  createPixiThemeSnapshot,
} from '../theme/PixiThemeTokens.js';
import {
  PIXI_CAPSULE_ASSETS,
} from './PixiCapsuleSkin.js';

let PixiProgressBar;
let RetainedProgressBar;
let NineSliceSprite;
let Texture;

beforeAll(async () => {
  globalThis.HTMLCanvasElement.prototype.getContext = () => ({
    createLinearGradient: () => ({
      addColorStop() {},
    }),
    fillRect() {},
  });
  ({ PixiProgressBar } = await import('./PixiProgressBar.js'));
  ({ RetainedProgressBar } = await import(
    '../pages/workshop/RetainedPageKit.js'
  ));
  ({ NineSliceSprite, Texture } = await import('pixi.js'));
});

describe('PixiProgressBar', () => {
  it('uses the frozen 8px-content, 10px-total Root Run geometry', () => {
    const progress = new PixiProgressBar({
      width: 100,
      progress: 0.5,
      tone: 'green',
    });

    expect(PIXI_UI_GEOMETRY).toMatchObject({
      progressRailBorderWidth: 1,
      progressHeight: 8,
      progressTotalHeight: 10,
      progressTopPanelHeight: 12,
      progressTopPanelTotalHeight: 14,
      progressKnobSize: 14,
    });
    expect(progress).toMatchObject({
      barWidth: 100,
      barHeight: 10,
      tone: 'green',
      fillColor: PIXI_PROGRESS_VISUALS.tones.green.fill,
      fillEdgeColor: PIXI_PROGRESS_VISUALS.tones.green.edge,
    });
    expect(progress.railGraphic.getLocalBounds()).toMatchObject({
      minX: 0,
      minY: 0,
      maxX: 100,
      maxY: 10,
    });
    expect(progress.fillGraphic.getLocalBounds()).toMatchObject({
      minX: 1,
      minY: 1,
      maxX: 50,
      maxY: 9,
    });

    progress.destroy({ children: true });
  });

  it('uses the inner rail width for ranges and normalizes unknown tones', () => {
    const progress = new PixiProgressBar({
      width: 100,
      tone: 'unknown',
    });

    progress.setRange(0.25, 0.75);

    expect(progress.tone).toBe('root');
    expect(progress.fillGraphic.getLocalBounds()).toMatchObject({
      minX: 25.5,
      minY: 1,
      maxX: 74.5,
      maxY: 9,
    });

    progress.destroy({ children: true });
  });

  it('preserves global gradient and notched player styles', () => {
    const progress = new PixiProgressBar({
      width: 100,
      progress: 0.5,
      tone: 'yellow',
    });

    progress.applyTheme(
      createPixiThemeSnapshot({ progressBar: 'gradient' }),
    );
    expect(progress.gradient).not.toBeNull();
    expect(progress.fillColor).toBe(progress.gradient);
    expect(progress.fillEdgeColor).toBe(
      PIXI_PROGRESS_VISUALS.tones.root.edge,
    );

    progress.applyTheme(
      createPixiThemeSnapshot({ progressBar: 'notched' }),
    );
    expect(progress.gradient).toBeNull();
    expect(progress.fillColor).toBe('#b79a6b');
    expect(progress.fillEdgeColor).toBeNull();

    progress.destroy({ children: true });
  });

  it('keeps rails and fill edges backed by the Root Run capsule assets', () => {
    const getTexture = vi.fn(() => Texture.EMPTY);
    const progress = new PixiProgressBar({
      assetManager: { getTexture },
      width: 100,
      progress: 0.5,
    });

    expect(getTexture).toHaveBeenNthCalledWith(
      1,
      PIXI_CAPSULE_ASSETS.track,
    );
    expect(getTexture).toHaveBeenNthCalledWith(
      2,
      PIXI_CAPSULE_ASSETS.fillMask,
    );
    expect(progress.railGraphic.sprite).toBeInstanceOf(
      NineSliceSprite,
    );
    expect(progress.fillMask.sprite).toBeInstanceOf(
      NineSliceSprite,
    );
    expect(progress.fillGraphic.effects).toContain(
      progress.fillAlphaMask,
    );
    expect(progress.fillAlphaMask).toMatchObject({
      pipe: 'alphaMask',
      mask: progress.fillMask,
      channel: 'alpha',
    });

    progress.destroy({ children: true });
  });

  it('backs retained page progress with the same shared primitive', () => {
    const retained = new RetainedProgressBar({
      label: 'retained-progress',
      tone: 'blue',
    });

    retained.setBounds(4, 8, 80);
    retained.setProgress(0.25);

    expect(retained.root).toBeInstanceOf(PixiProgressBar);
    expect(retained).toMatchObject({
      width: 80,
      height: 10,
      progress: 0.25,
      tone: 'blue',
    });
    expect(retained.root.position).toMatchObject({ x: 4, y: 8 });
    expect(retained.fill.getLocalBounds()).toMatchObject({
      minX: 1,
      minY: 1,
      maxX: 20.5,
      maxY: 9,
    });

    retained.destroy();
  });
});
