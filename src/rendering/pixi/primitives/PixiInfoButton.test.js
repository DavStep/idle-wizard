// @vitest-environment jsdom

import { Texture } from 'pixi.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { installPixiPageTestCanvas } from '../pages/workshop/PixiPageTestHarness.js';
import { PIXI_ROOT_RUN_ASSETS } from '../theme/PixiThemeTokens.js';
import { PixiInfoButton } from './PixiInfoButton.js';

installPixiPageTestCanvas();

describe('PixiInfoButton', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

    const pressTarget = registerPressTarget.mock.calls[0][1];
    expect(pressTarget.fallbackHitTest).toBe(true);
    pressTarget.onPressChange(true);
    expect(button.visual.scale.x).toBe(0.94);
    expect(button.icon.width).toBe(18);
    expect(button.icon.height).toBe(18);
    pressTarget.onPressChange(false, { confirmed: false });
    expect(button.visual.scale.x).toBe(1);
    expect(button.icon.width).toBe(18);
    expect(button.icon.height).toBe(18);
    button.setEnabled(false);
    expect(button.activate()).toBe(false);

    button.destroy({ children: true });
    expect(unregister).toHaveBeenCalledOnce();
  });

  it('uses the shared confirmed-release snap without resizing the icon', () => {
    const requestAnimationFrame = vi.fn(() => 17);
    const cancelAnimationFrame = vi.fn();
    vi.stubGlobal('requestAnimationFrame', requestAnimationFrame);
    vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrame);
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false })),
    );
    const button = new PixiInfoButton({
      assetManager: { getTexture: () => Texture.EMPTY },
      size: 18,
    });

    button.emit('pointerdown');
    button.emit('pointerup');

    expect(requestAnimationFrame).toHaveBeenCalledOnce();
    expect(button.visual.scale.x).toBe(0.94);
    expect(button.icon.width).toBe(18);
    expect(button.icon.height).toBe(18);

    button.destroy({ children: true });
    expect(cancelAnimationFrame).toHaveBeenCalledWith(17);
  });

  it('settles immediately after release when reduced motion is requested', () => {
    const requestAnimationFrame = vi.fn(() => 17);
    vi.stubGlobal('requestAnimationFrame', requestAnimationFrame);
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true })),
    );
    const button = new PixiInfoButton({
      assetManager: { getTexture: () => Texture.EMPTY },
      size: 18,
    });

    button.emit('pointerdown');
    button.emit('pointerup');

    expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(button.visual.scale.x).toBe(1);
    expect(button.icon.width).toBe(18);
    expect(button.icon.height).toBe(18);

    button.destroy({ children: true });
  });
});
