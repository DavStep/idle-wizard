import { describe, expect, it, vi } from 'vitest';

import {
  HAPTIC_MIN_INTERVAL_MS,
  HapticPulseManager,
  UI_TAP_HAPTIC_DURATION_MS,
} from './HapticPulseManager.js';

describe('HapticPulseManager', () => {
  it('uses native Capacitor haptics before web vibration', () => {
    const nativeHaptics = { vibrate: vi.fn(() => Promise.resolve()) };
    const webVibrate = vi.fn(() => true);
    const manager = new HapticPulseManager({
      preferenceManager: enabledPreference(true),
      nativeHaptics,
      isNativePlatform: () => true,
      isNativePluginAvailable: () => true,
      navigatorProvider: () => activeNavigator(webVibrate),
    });

    expect(manager.playUiTap()).toBe(true);

    expect(nativeHaptics.vibrate).toHaveBeenCalledWith({
      duration: UI_TAP_HAPTIC_DURATION_MS,
    });
    expect(webVibrate).not.toHaveBeenCalled();
  });

  it('falls back to web vibration during an active gesture', () => {
    const webVibrate = vi.fn(() => true);
    const manager = new HapticPulseManager({
      preferenceManager: enabledPreference(true),
      isNativePlatform: () => false,
      isNativePluginAvailable: () => false,
      navigatorProvider: () => activeNavigator(webVibrate),
    });

    expect(manager.playUiTap()).toBe(true);
    expect(webVibrate).toHaveBeenCalledWith(UI_TAP_HAPTIC_DURATION_MS);
  });

  it('does not vibrate when disabled or when activation is missing', () => {
    const webVibrate = vi.fn(() => true);
    const disabledManager = new HapticPulseManager({
      preferenceManager: enabledPreference(false),
      isNativePlatform: () => false,
      isNativePluginAvailable: () => false,
      navigatorProvider: () => activeNavigator(webVibrate),
    });
    const inactiveManager = new HapticPulseManager({
      preferenceManager: enabledPreference(true),
      isNativePlatform: () => false,
      isNativePluginAvailable: () => false,
      navigatorProvider: () => ({
        vibrate: webVibrate,
        userActivation: { isActive: false, hasBeenActive: true },
      }),
    });

    expect(disabledManager.playUiTap()).toBe(false);
    expect(inactiveManager.playUiTap()).toBe(false);
    expect(webVibrate).not.toHaveBeenCalled();
  });

  it('throttles dense haptic requests', () => {
    const webVibrate = vi.fn(() => true);
    let now = 1000;
    const manager = new HapticPulseManager({
      preferenceManager: enabledPreference(true),
      isNativePlatform: () => false,
      isNativePluginAvailable: () => false,
      navigatorProvider: () => activeNavigator(webVibrate),
      now: () => now,
    });

    manager.playUiTap();
    now += HAPTIC_MIN_INTERVAL_MS - 1;
    manager.playUiTap();
    now += 1;
    manager.playUiTap();

    expect(webVibrate).toHaveBeenCalledTimes(2);
  });
});

function enabledPreference(enabled) {
  return {
    isEnabled: () => enabled,
  };
}

function activeNavigator(vibrate) {
  return {
    vibrate,
    userActivation: { isActive: true, hasBeenActive: true },
  };
}
