import { HapticPreferenceManager } from './managers/HapticPreferenceManager.js';
import { HapticPulseManager } from './managers/HapticPulseManager.js';

export class HapticsFacade {
  static explain =
    'Adds tiny phone vibrations to touch controls, so presses feel responsive without changing game rules.';

  constructor({ preferenceManager, pulseManager } = {}) {
    this.preferenceManager = preferenceManager ?? new HapticPreferenceManager();
    this.pulseManager =
      pulseManager ??
      new HapticPulseManager({
        preferenceManager: this.preferenceManager,
      });
  }

  getSnapshot() {
    return {
      enabled: this.isEnabled(),
    };
  }

  isEnabled() {
    return this.preferenceManager.isEnabled();
  }

  setEnabled(enabled) {
    this.preferenceManager.setEnabled(enabled);
    return this.getSnapshot();
  }

  toggleEnabled() {
    return this.setEnabled(!this.isEnabled());
  }

  subscribe(listener) {
    return this.preferenceManager.subscribe(() => listener(this.getSnapshot()));
  }

  playUiTap() {
    return this.pulseManager.playUiTap();
  }

  destroy() {
    this.pulseManager.destroy?.();
  }
}
