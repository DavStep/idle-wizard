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

  it('projects sound preferences through the full-width percentage slider', () => {
    const presses = [];
    const inputRouter = {
      registerPressTarget: vi.fn((displayObject, descriptor) => {
        presses.push({ displayObject, descriptor });
        return vi.fn();
      }),
      registerGestureSurface: vi.fn(() => vi.fn()),
    };
    const onChange = vi.fn();
    const row = new RootRunDevicePreferenceRow({
      assetManager: {
        getTexture: () => Texture.EMPTY,
      },
      controlKind: 'slider',
      inputRouter,
      preferenceKey: 'sfx',
      text: 'SOUND',
      iconAssetId: 'settings-sound',
    });
    vi.spyOn(row.textLabel, 'measuredHeight', 'get').mockReturnValue(19);
    vi.spyOn(row.textLabel, 'measuredWidth', 'get').mockReturnValue(46);
    row.setBounds(0, 0, 244);
    row.bind({ value: 64, onChange });

    const sliderPress = presses.find(
      ({ displayObject }) => displayObject === row.slider,
    );

    expect(row.toggle).toBeNull();
    expect(row.slider.controlWidth).toBe(126);
    expect(row.slider.x).toBe(118);
    expect(row.icon.width).toBe(36);
    expect(row.slider.value).toBe(64);
    expect(sliderPress.descriptor.onActivate({ localX: 0 })).toBe(true);
    expect(onChange).toHaveBeenCalledWith(0);

    expect(sliderPress.descriptor.onActivate({ localX: 63 })).toBe(true);
    expect(onChange).toHaveBeenLastCalledWith(50);

    row.destroy({ children: true });
  });

  it('fits long preference labels into the space before their control', () => {
    const row = new RootRunDevicePreferenceRow({
      assetManager: {
        getTexture: () => Texture.EMPTY,
      },
      preferenceKey: 'friendRequests',
      text: 'FRIEND REQUESTS',
      iconAssetId: 'settings-friend-requests',
    });
    vi.spyOn(row.textLabel, 'measuredWidth', 'get').mockImplementation(
      () => row.textLabel.fontSize * 9,
    );
    vi.spyOn(row.textLabel, 'measuredHeight', 'get').mockImplementation(
      () => row.textLabel.fontSize,
    );

    row.setBounds(0, 0, 262);

    expect(row.textLabel.fontSize).toBeLessThanOrEqual(19);
    expect(row.textLabel.fontSize).toBeGreaterThanOrEqual(15);
    expect(row.textLabel.measuredWidth).toBeLessThanOrEqual(
      row.control.x - row.textLabel.x - 6,
    );

    row.setBounds(0, 0, 251);

    expect(row.textLabel.fontSize).toBe(15);
    expect(row.textLabel.measuredWidth).toBeLessThanOrEqual(
      row.control.x - row.textLabel.x - 6,
    );

    row.destroy({ children: true });
  });
});
