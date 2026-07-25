// @vitest-environment jsdom

import { Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import {
  createPixiThemeSnapshot,
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
} from '../theme/PixiThemeTokens.js';
import {
  installPixiPageTestCanvas,
} from '../pages/workshop/PixiPageTestHarness.js';
import {
  PIXI_DIALOG_PALETTE,
  PixiDialogFrame,
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
    expect(frame.titleLabel.stroke.width).toBeCloseTo(8 / 3);

    expect(frame.closeSprite.width).toBeCloseTo(38);
    expect(frame.closeSprite.height).toBeCloseTo(38);
    expect(frame.closeControl.position.x).toBe(152);
    expect(frame.closeControl.position.y).toBeCloseTo(
      100 + 10 + 64 / 3 + 19,
    );
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
      coreHeight: 93,
      outerWidth: 344,
      outerHeight: 93,
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
});
