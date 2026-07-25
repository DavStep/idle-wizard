// @vitest-environment jsdom

import { Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { installPixiPageTestCanvas } from '../pages/workshop/PixiPageTestHarness.js';
import { PIXI_ROOT_RUN_ASSETS } from '../theme/PixiThemeTokens.js';
import { PixiInfoButton } from './PixiInfoButton.js';

installPixiPageTestCanvas();

describe('PixiInfoButton', () => {
  it('retains one image-only control and swaps only its action state', () => {
    const unregister = vi.fn();
    const registerPressTarget = vi.fn(() => ({ unregister }));
    const getTexture = vi.fn(() => Texture.EMPTY);
    const firstAction = vi.fn(() => true);
    const secondAction = vi.fn(() => true);
    const button = new PixiInfoButton({
      assetManager: { getTexture },
      inputRouter: { registerPressTarget },
      action: firstAction,
      size: 18,
      label: 'research-info',
    });

    expect(registerPressTarget).toHaveBeenCalledOnce();
    expect(getTexture).toHaveBeenCalledWith(PIXI_ROOT_RUN_ASSETS.info);
    expect(button.icon.width).toBe(18);
    expect(button.icon.height).toBe(18);
    expect(button.textLabel).toBeUndefined();
    expect(button.activate()).toBe(true);
    expect(firstAction).toHaveBeenCalledOnce();

    button.setModel({ enabled: true, action: secondAction });
    expect(registerPressTarget).toHaveBeenCalledOnce();
    expect(button.activate()).toBe(true);
    expect(secondAction).toHaveBeenCalledOnce();

    button.setPressed(true);
    expect(button.icon.scale.x).toBe(0.94);
    button.setEnabled(false);
    expect(button.activate()).toBe(false);

    button.destroy({ children: true });
    expect(unregister).toHaveBeenCalledOnce();
  });
});
