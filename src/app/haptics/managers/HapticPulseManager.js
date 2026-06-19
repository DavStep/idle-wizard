import { Capacitor } from '@capacitor/core';
import { Haptics } from '@capacitor/haptics';
import { IdleWizardHapticsPlugin } from '../nativeHapticsPlugin.js';

export const UI_TAP_HAPTIC_DURATION_MS = 5;
export const UI_TAP_HAPTIC_AMPLITUDE = 0.5;
export const HAPTIC_MIN_INTERVAL_MS = 40;

export class HapticPulseManager {
  constructor({
    preferenceManager,
    nativeConstantHaptics = IdleWizardHapticsPlugin,
    nativeHaptics = Haptics,
    isNativePlatform = () => Capacitor.isNativePlatform(),
    isNativeConstantPluginAvailable = () =>
      Capacitor.isPluginAvailable('IdleWizardHaptics'),
    isNativePluginAvailable = () => Capacitor.isPluginAvailable('Haptics'),
    navigatorProvider = () => globalThis.navigator,
    now = defaultNow,
  } = {}) {
    this.preferenceManager = preferenceManager;
    this.nativeConstantHaptics = nativeConstantHaptics;
    this.nativeHaptics = nativeHaptics;
    this.isNativePlatform = isNativePlatform;
    this.isNativeConstantPluginAvailable = isNativeConstantPluginAvailable;
    this.isNativePluginAvailable = isNativePluginAvailable;
    this.navigatorProvider = navigatorProvider;
    this.now = now;
    this.lastPulseMs = -HAPTIC_MIN_INTERVAL_MS;
  }

  playUiTap() {
    return this.pulse({
      durationMs: UI_TAP_HAPTIC_DURATION_MS,
      amplitude: UI_TAP_HAPTIC_AMPLITUDE,
      requireActiveGesture: true,
    });
  }

  pulse({ durationMs, amplitude, requireActiveGesture = true } = {}) {
    if (!this.preferenceManager?.isEnabled?.()) {
      return false;
    }

    const nowMs = this.now();
    if (nowMs < this.lastPulseMs + HAPTIC_MIN_INTERVAL_MS) {
      return false;
    }

    const normalizedDurationMs = normalizeDurationMs(durationMs);
    const normalizedAmplitude = normalizeAmplitude(amplitude);
    const played =
      this.pulseNative(normalizedDurationMs, normalizedAmplitude) ||
      this.pulseWeb(normalizedDurationMs, requireActiveGesture);

    if (played) {
      this.lastPulseMs = nowMs;
    }

    return played;
  }

  pulseNative(durationMs, amplitude) {
    if (!this.isNativePlatform()) {
      return false;
    }

    if (this.isNativeConstantPluginAvailable()) {
      try {
        const result = this.nativeConstantHaptics?.playConstant?.({
          durationMs,
          amplitude,
        });
        result?.catch?.(() => {});
        if (result) {
          return true;
        }
      } catch {
        // Fall through to the official Capacitor plugin.
      }
    }

    if (!this.isNativePluginAvailable()) {
      return false;
    }

    try {
      const result = this.nativeHaptics?.vibrate?.({ duration: durationMs });
      result?.catch?.(() => {});
      return Boolean(result);
    } catch {
      return false;
    }
  }

  pulseWeb(durationMs, requireActiveGesture) {
    const navigator = this.navigatorProvider?.();
    if (typeof navigator?.vibrate !== 'function') {
      return false;
    }

    const activation = navigator.userActivation;
    if (activation) {
      if (requireActiveGesture && !activation.isActive) {
        return false;
      }

      if (
        !requireActiveGesture &&
        !activation.isActive &&
        !activation.hasBeenActive
      ) {
        return false;
      }
    }

    try {
      return Boolean(navigator.vibrate(durationMs));
    } catch {
      return false;
    }
  }

  destroy() {
    this.lastPulseMs = -HAPTIC_MIN_INTERVAL_MS;
  }
}

function normalizeDurationMs(durationMs) {
  const value = Number(durationMs);

  if (!Number.isFinite(value)) {
    return UI_TAP_HAPTIC_DURATION_MS;
  }

  return Math.max(1, Math.min(1000, Math.round(value)));
}

function normalizeAmplitude(amplitude) {
  const value = Number(amplitude);

  if (!Number.isFinite(value)) {
    return UI_TAP_HAPTIC_AMPLITUDE;
  }

  return Math.max(0, Math.min(1, value));
}

function defaultNow() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }

  return Date.now();
}
