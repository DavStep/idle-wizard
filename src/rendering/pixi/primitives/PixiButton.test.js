// @vitest-environment jsdom

import { Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { installPixiPageTestCanvas } from '../pages/workshop/PixiPageTestHarness.js';
import {
  createPixiThemeSnapshot,
  PIXI_ROOT_RUN_ASSETS,
  PIXI_UI_GEOMETRY,
} from '../theme/PixiThemeTokens.js';
import { PixiButton } from './PixiButton.js';
import { getPixiButtonAssetId } from './PixiButtonStyle.js';

installPixiPageTestCanvas();

describe('PixiButton', () => {
  it('selects color and corner size independently from one base widget', () => {
    const getTexture = vi.fn(() => Texture.EMPTY);
    const button = new PixiButton({
      assetManager: { getTexture },
      color: 'blue',
      sizeTier: 30,
      variant: 'regular',
    });

    expect(getTexture).toHaveBeenCalledWith(
      getPixiButtonAssetId('blue', 30),
    );

    getTexture.mockClear();
    button.setColor('purple').setSizeTier(15);

    expect(button.color).toBe('purple');
    expect(button.sizeTier).toBe(15);
    expect(getTexture).toHaveBeenCalledWith(
      getPixiButtonAssetId('purple', 15),
    );

    button.destroy({ children: true });
  });

  it('uses the current brown regular-button skin for the default variant', () => {
    const getTexture = vi.fn(() => Texture.EMPTY);
    const button = new PixiButton({
      assetManager: { getTexture },
    });

    expect(button.resolveRootRunVariant()).toBe('brown');
    expect(getTexture).toHaveBeenCalledWith(
      'source:assets/ui/regular-button/brown-button-50.9.png',
    );

    button.destroy({ children: true });
  });

  it.each(['yellow', 'green', 'red', 'gray', 'brown-dark', 'brown-light'])(
    'uses the gray asset without a shader for disabled %s buttons',
    (variant) => {
      const getTexture = vi.fn(() => Texture.EMPTY);
      const button = new PixiButton({
        assetManager: { getTexture },
        variant,
      });

      getTexture.mockClear();
      button.setEnabled(false);

      expect(getTexture).toHaveBeenCalledWith(
        PIXI_ROOT_RUN_ASSETS.buttonGrayNineSlice,
      );
      expect(button.rootRunFrame.filters).toBeNull();

      button.destroy({ children: true });
    },
  );

  it('uses the red Root Run skin for enabled danger buttons', () => {
    const getTexture = vi.fn(() => Texture.EMPTY);
    const button = new PixiButton({
      assetManager: { getTexture },
      variant: 'red',
    });

    expect(getTexture).toHaveBeenCalledWith(
      PIXI_ROOT_RUN_ASSETS.buttonRedNineSlice,
    );

    button.destroy({ children: true });
  });

  it('uses the current Root Run brown skins for popup tabs in every player theme', () => {
    const getTexture = vi.fn(() => Texture.EMPTY);
    const button = new PixiButton({
      assetManager: { getTexture },
      variant: 'tab',
    });

    getTexture.mockClear();
    button.applyTheme(createPixiThemeSnapshot({ theme: 'black' }));
    expect(button.resolveRootRunVariant()).toBe('brown-dark');
    expect(getTexture).toHaveBeenCalledWith(
      PIXI_ROOT_RUN_ASSETS.buttonBrownDark,
    );

    getTexture.mockClear();
    button.setSelected(true);
    expect(button.resolveRootRunVariant()).toBe('brown-light');
    expect(getTexture).toHaveBeenCalledWith(
      PIXI_ROOT_RUN_ASSETS.buttonBrownLight,
    );

    button.destroy({ children: true });
  });

  it('keeps regular-button and text-tab notifications tangent to the top-right edges', () => {
    const getTexture = vi.fn(() => Texture.EMPTY);
    const button = new PixiButton({
      assetManager: { getTexture },
      width: 100,
      height: 30,
      variant: 'green',
    });

    button.setNotification(true);

    expect(PIXI_UI_GEOMETRY).toMatchObject({
      notificationSize: 12,
      notificationOutset: 0,
      notificationTabInset: 4,
    });
    expect(button.notificationBadge.root.position).toMatchObject({
      x: 94,
      y: 6,
    });

    button.setVariant('tab');

    expect(button.notificationBadge.root.position).toMatchObject({
      x: 94,
      y: 6,
    });

    button.destroy({ children: true });
  });

  it('keeps a tab notification visible while the tab is selected', () => {
    const button = new PixiButton({
      assetManager: { getTexture: vi.fn(() => Texture.EMPTY) },
      variant: 'tab',
    });

    button.setNotification(true);
    button.setSelected(true);

    expect(button.notification).toBe(true);
    expect(button.notificationBadge.root.visible).toBe(true);
    expect(button.notificationBadge.root.renderable).toBe(true);

    button.destroy({ children: true });
  });
});
