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

installPixiPageTestCanvas();

describe('PixiButton', () => {
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
    expect(button.resolveRootRunVariant()).toBe('tab-inactive');
    expect(getTexture).toHaveBeenCalledWith(
      PIXI_ROOT_RUN_ASSETS.buttonTabInactive,
    );

    getTexture.mockClear();
    button.setSelected(true);
    expect(button.resolveRootRunVariant()).toBe('tab-active');
    expect(getTexture).toHaveBeenCalledWith(
      PIXI_ROOT_RUN_ASSETS.buttonTabActive,
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
