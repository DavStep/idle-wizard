// @vitest-environment jsdom

import { Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { installPixiPageTestCanvas } from '../pages/workshop/PixiPageTestHarness.js';
import {
  createPixiThemeSnapshot,
  PIXI_ROOT_RUN_ASSETS,
  PIXI_UI_GEOMETRY,
} from '../theme/PixiThemeTokens.js';
import { PixiBaseButton } from './PixiBaseButton.js';
import { PixiTextButton } from './PixiTextButton.js';
import { getPixiButtonSkin } from './PixiButtonStyle.js';
import { PixiTabButton } from './PixiTabButton.js';

installPixiPageTestCanvas();

describe('PixiTabButton', () => {
  it('extends the base button with selected popup-tab skins', () => {
    const getTexture = vi.fn(() => Texture.EMPTY);
    const button = new PixiTabButton({
      assetManager: { getTexture },
    });

    expect(button).toBeInstanceOf(PixiBaseButton);
    expect(button).toBeInstanceOf(PixiTextButton);
    expect(button.variant).toBe('tab');
    expect(button.buttonHeight).toBe(PIXI_UI_GEOMETRY.tabHeight);

    getTexture.mockClear();
    button.applyTheme(createPixiThemeSnapshot({ theme: 'black' }));
    expect(button.resolveRootRunVariant()).toBe('brown-dark');
    expect(getTexture).toHaveBeenCalledWith(
      PIXI_ROOT_RUN_ASSETS.buttonBrownDark,
    );

    getTexture.mockClear();
    button.setSelected(true);
    expect(button.resolveRootRunVariant()).toBe('brown');
    expect(button.activeSkin.assetId).toBe(
      PIXI_ROOT_RUN_ASSETS.buttonBrownLight,
    );
    expect(getTexture).toHaveBeenCalledWith(
      PIXI_ROOT_RUN_ASSETS.buttonBrownLight,
    );

    button.destroy({ children: true });
  });

  it('inherits fitted base geometry without changing the notification contract', () => {
    const button = new PixiTabButton({
      assetManager: { getTexture: vi.fn(() => Texture.EMPTY) },
      width: 100,
    });
    const baseSkin = getPixiButtonSkin({
      color: 'brown-dark',
      height: PIXI_UI_GEOMETRY.tabHeight,
      sizeTier: 50,
      width: 100,
    });

    expect(button.rootRunFrame.borderInsets).toEqual(
      baseSkin.borderInsets,
    );
    expect(button.activeSkin.borderInsets).toEqual(baseSkin.borderInsets);

    button.setNotification(true);
    button.setSelected(true);

    expect(button.notificationBadge.root.position).toMatchObject({
      x: 94,
      y: 6,
    });
    expect(button.notificationBadge.root.visible).toBe(true);
    expect(button.notificationBadge.root.renderable).toBe(true);

    button.destroy({ children: true });
  });
});
