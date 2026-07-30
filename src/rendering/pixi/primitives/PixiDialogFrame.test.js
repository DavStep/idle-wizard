// @vitest-environment jsdom

import { Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import {
  createPixiThemeSnapshot,
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
  resolvePixiTextStrokeWidth,
} from '../theme/PixiThemeTokens.js';
import {
  installPixiPageTestCanvas,
} from '../pages/workshop/PixiPageTestHarness.js';
import {
  PIXI_DIALOG_BASE_GEOMETRY,
  PIXI_DIALOG_FOOTER_TABS_GEOMETRY,
  PIXI_DIALOG_PALETTE,
  PixiDialogFrame,
  resolveDialogFooterTabLayout,
  setDialogPaperAboveFooterTabs,
} from './PixiDialogFrame.js';

installPixiPageTestCanvas();

function createHarness(options = {}) {
  const inputRegistrations = [];
  const semanticDefinitions = [];
  const inputUnregister = vi.fn();
  const semanticUnregister = vi.fn();
  const assetManager = {
    getTexture: vi.fn(() => Texture.EMPTY),
  };
  const inputRouter = {
    registerPressTarget: vi.fn((displayObject, descriptor) => {
      inputRegistrations.push({ displayObject, descriptor });
      return { unregister: inputUnregister };
    }),
  };
  const semanticRegistry = {
    register: vi.fn((definition) => {
      semanticDefinitions.push(definition);
      return definition;
    }),
    unregister: semanticUnregister,
  };
  const frame = new PixiDialogFrame({
    assetManager,
    inputRouter,
    semanticRegistry,
    closeSemanticId: 'dialog.research.close',
    title: 'Research',
    coreWidth: 304,
    coreHeight: 100,
    ...options,
  });
  return {
    assetManager,
    frame,
    inputRegistrations,
    inputUnregister,
    semanticDefinitions,
    semanticUnregister,
  };
}

describe('PixiDialogFrame', () => {
  it('uses the fixed base width and minimum height contract', () => {
    const frame = new PixiDialogFrame();

    expect(frame).toMatchObject({
      contentBoxWidth: PIXI_DIALOG_BASE_GEOMETRY.coreWidth,
      contentBoxHeight: PIXI_DIALOG_BASE_GEOMETRY.minCoreHeight,
      outerWidth: PIXI_DIALOG_BASE_GEOMETRY.coreWidth,
      outerHeight: PIXI_DIALOG_BASE_GEOMETRY.minCoreHeight,
    });

    frame.setContentBoxSize(304, 20, 20);

    expect(frame).toMatchObject({
      contentBoxWidth: PIXI_DIALOG_BASE_GEOMETRY.contentWidth,
      contentBoxHeight: PIXI_DIALOG_BASE_GEOMETRY.minContentHeight,
      outerWidth: PIXI_DIALOG_BASE_GEOMETRY.coreWidth,
      outerHeight: PIXI_DIALOG_BASE_GEOMETRY.minCoreHeight,
    });
  });

  it('matches the 360-source Root Run shell, paper, title, and close geometry', () => {
    const closeAction = vi.fn();
    const { assetManager, frame } = createHarness({ closeAction });
    const geometry = PIXI_ROOT_RUN_GEOMETRY.dialog;

    expect(assetManager.getTexture).toHaveBeenCalledWith(
      PIXI_ROOT_RUN_ASSETS.dialogTitle,
    );
    expect(PIXI_ROOT_RUN_ASSETS.dialogTitle).toContain(
      'expedition-dialog-title-purple.png',
    );
    expect(frame.outerFrame.position).toMatchObject({ x: -10, y: -10 });
    expect(frame.outerFrame.frameWidth).toBe(324);
    expect(frame.outerFrame.frameHeight).toBe(120);
    expect(frame.shadow.position).toMatchObject({ x: -7, y: -6 });
    expect(frame.shadow.alpha).toBe(0.42);

    expect(frame.paperFrame.position.x).toBeCloseTo(-14 / 3);
    expect(frame.paperFrame.position.y).toBeCloseTo(55 / 3);
    expect(frame.paperFrame.frameWidth).toBeCloseTo(304 + 28 / 3);
    expect(frame.paperFrame.frameHeight).toBeCloseTo(100 - 82 / 3);

    expect(frame.titleFrame.position.y).toBeCloseTo(-91 / 3);
    expect(frame.titleFrame.frameWidth).toBeCloseTo(geometry.titleMinWidth);
    expect(frame.titleFrame.frameHeight).toBeCloseTo(121 / 3);
    expect(frame.titleLabel.fontSize).toBeCloseTo(64 / 3);
    expect(frame.titleLabel.stroke.width).toBeCloseTo(
      resolvePixiTextStrokeWidth(frame.titleLabel.fontSize),
    );

    expect(frame.closeSprite.width).toBeCloseTo(38);
    expect(frame.closeSprite.height).toBeCloseTo(38);
    expect(frame.closeControl.position.x).toBe(152);
    expect(frame.closeControl.position.y).toBeCloseTo(
      100 + 10 + 64 / 3 + 19,
    );
  });

  it('preserves the Expedition title geometry while applying the danger title variant', () => {
    const { frame } = createHarness({ titleVariant: 'danger' });
    const titleFrame = frame.titleFrame;
    const titleSlices = [...titleFrame.sprites];

    expect(frame.titleVariant).toBe('danger');
    expect(titleFrame.filters).toEqual([frame.dangerTitleFilter]);
    expect(frame.dangerTitleFilter).not.toBeNull();

    frame.setTitleVariant('default');

    expect(frame.titleVariant).toBe('default');
    expect(titleFrame.filters).toBeNull();
    expect(frame.titleFrame).toBe(titleFrame);
    expect(frame.titleFrame.sprites).toEqual(titleSlices);
  });

  it('retains every display object while resizing, retitling, and theming', () => {
    const { frame } = createHarness();
    const retainedChildren = [...frame.children];
    const retainedOuterSlices = [...frame.outerFrame.sprites];
    const midnightComic = createPixiThemeSnapshot({
      theme: 'midnight',
      font: 'comic-sans-mono',
    });

    frame
      .setCoreSize(280, 160)
      .setTitle('A much longer retained dialog title')
      .applyTheme(midnightComic);

    expect(frame.children).toEqual(retainedChildren);
    expect(frame.outerFrame.sprites).toEqual(retainedOuterSlices);
    expect(frame.content.position).toMatchObject({ x: 0, y: 0 });
    expect(frame.getModalContentRoots()).toEqual([frame]);
    expect(frame.titleLabel.textObject.style.fontFamily).toBe(
      midnightComic.fontFamily,
    );
    expect(frame.titleLabel.colorToken).toBe(PIXI_DIALOG_PALETTE.titleText);
    expect(frame.getContentTheme()).toMatchObject({
      surface: PIXI_DIALOG_PALETTE.paper,
      text: PIXI_DIALOG_PALETTE.ink,
      muted: PIXI_DIALOG_PALETTE.muted,
      disabled: PIXI_DIALOG_PALETTE.disabled,
      resourceColors: {
        coin: PIXI_DIALOG_PALETTE.coin,
        crystal: PIXI_DIALOG_PALETTE.crystal,
        mana: PIXI_DIALOG_PALETTE.mana,
        herb: PIXI_DIALOG_PALETTE.herb,
      },
    });
  });

  it('models CSS content-box dimensions without rebuilding the frame', () => {
    const { frame } = createHarness();
    const retainedChildren = [...frame.children];

    frame.setContentBoxSize(304, 53, {
      top: 25,
      right: 20,
      bottom: 15,
      left: 20,
    });

    expect(frame.children).toEqual(retainedChildren);
    expect(frame).toMatchObject({
      contentBoxWidth: 304,
      contentBoxHeight: 53,
      coreWidth: 344,
      coreHeight: PIXI_DIALOG_BASE_GEOMETRY.minCoreHeight,
      outerWidth: 344,
      outerHeight: PIXI_DIALOG_BASE_GEOMETRY.minCoreHeight,
      paddingX: 20,
      paddingY: 25,
    });
    expect(frame.content.position).toMatchObject({ x: 20, y: 25 });
    expect(frame.outerFrame).toMatchObject({
      frameWidth: 364,
      frameHeight: 113,
    });
  });

  it('installs one close input and semantic target for its full lifetime', () => {
    const firstAction = vi.fn();
    const secondAction = vi.fn();
    const {
      frame,
      inputRegistrations,
      inputUnregister,
      semanticDefinitions,
      semanticUnregister,
    } = createHarness();

    expect(inputRegistrations).toHaveLength(1);
    expect(semanticDefinitions).toHaveLength(1);
    expect(frame.closeControl.visible).toBe(false);
    expect(inputRegistrations[0].descriptor.enabled()).toBe(false);

    frame.setCloseAction(firstAction);
    expect(frame.closeControl.visible).toBe(true);
    expect(inputRegistrations[0].descriptor.enabled()).toBe(true);
    expect(inputRegistrations[0].descriptor.onActivate('pointer')).toBe(true);
    expect(firstAction).toHaveBeenCalledWith('pointer');
    expect(semanticDefinitions[0].activate('semantic')).toBe(true);
    expect(firstAction).toHaveBeenCalledWith('semantic');

    frame.setCloseAction(secondAction);
    expect(inputRegistrations).toHaveLength(1);
    expect(semanticDefinitions).toHaveLength(1);
    frame.activateClose('replacement');
    expect(secondAction).toHaveBeenCalledWith('replacement');

    frame.setCloseAction(null);
    expect(frame.closeControl.visible).toBe(false);
    expect(frame.activateClose()).toBe(false);

    frame.destroy({ children: true });
    expect(inputUnregister).toHaveBeenCalledOnce();
    expect(semanticUnregister).toHaveBeenCalledWith(
      'dialog.research.close',
      { displayObject: frame.closeControl },
    );
  });

  it('hides the plaque for untitled dialogs without rebuilding it', () => {
    const { frame } = createHarness();
    const retainedTitleFrame = frame.titleFrame;

    frame.setTitle('');

    expect(frame.titleFrame).toBe(retainedTitleFrame);
    expect(frame.titleFrame.visible).toBe(false);
    expect(frame.titleLabel.visible).toBe(false);
  });

  it('derives balanced in-shell footer tabs from the dialog and tab count', () => {
    const { frame } = createHarness();
    const layout = resolveDialogFooterTabLayout({
      coreWidth: frame.coreWidth,
      coreHeight: frame.coreHeight,
      tabCount: 3,
    });

    expect(layout).toMatchObject({
      rowX: PIXI_DIALOG_FOOTER_TABS_GEOMETRY.rowInsetX,
      rowWidth:
        frame.coreWidth -
        PIXI_DIALOG_FOOTER_TABS_GEOMETRY.rowInsetX * 2,
      rowHeight: PIXI_DIALOG_FOOTER_TABS_GEOMETRY.rowHeight,
      gap: 8,
    });
    expect(layout.tabWidth).toBeCloseTo(
      (layout.rowWidth - layout.gap * 2) / 3,
    );
    expect(layout.rowY - layout.paperBottom).toBe(
      PIXI_DIALOG_FOOTER_TABS_GEOMETRY.paperGap,
    );
    expect(
      layout.shellBottom - (layout.rowY + layout.rowHeight),
    ).toBe(PIXI_DIALOG_FOOTER_TABS_GEOMETRY.bottomInset);

    setDialogPaperAboveFooterTabs(frame, layout);
    expect(
      frame.paperFrame.y + frame.paperFrame.frameHeight,
    ).toBeCloseTo(layout.paperBottom);
  });
});
