import { Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import {
  RootRunDevicePreferenceRow,
  RootRunDevicePreferencesPanel,
} from './PixiDeviceSettingsWidgets.js';

describe('RootRunDevicePreferencesPanel', () => {
  it('constructs its nine-slice at a valid initial size before rows are bound', () => {
    const panel = new RootRunDevicePreferencesPanel({
      assetManager: {
        getTexture: () => Texture.EMPTY,
      },
      width: 264,
    });

    expect(panel.background.frameWidth).toBe(264);
    expect(panel.background.frameHeight).toBe(panel.panelHeight);
    expect(panel.panelHeight).toBe(20);

    panel.destroy({ children: true });
  });

  it('toggles from both the preference row and its switch without changing the contract', () => {
    const presses = [];
    const inputRouter = {
      registerPressTarget: vi.fn((displayObject, descriptor) => {
        presses.push({ displayObject, descriptor });
        return vi.fn();
      }),
    };
    const onChange = vi.fn();
    const row = new RootRunDevicePreferenceRow({
      assetManager: {
        getTexture: () => Texture.EMPTY,
      },
      inputRouter,
      preferenceKey: 'music',
      text: 'MUSIC',
      iconAssetId: 'settings-music',
    });
    row.bind({ value: true, onChange });

    const rowPress = presses.find(({ displayObject }) => displayObject === row);
    const togglePress = presses.find(
      ({ displayObject }) => displayObject === row.toggle,
    );

    expect(row.eventMode).toBe('static');
    expect(rowPress.descriptor.enabled()).toBe(true);
    rowPress.descriptor.onPressChange(true);
    expect(row.toggle.pressed).toBe(true);
    rowPress.descriptor.onPressChange(false);
    expect(rowPress.descriptor.onActivate()).toBe(true);
    expect(onChange).toHaveBeenNthCalledWith(1, false);

    expect(togglePress.descriptor.onActivate()).toBe(true);
    expect(onChange).toHaveBeenNthCalledWith(2, true);

    row.destroy({ children: true });
  });
});
