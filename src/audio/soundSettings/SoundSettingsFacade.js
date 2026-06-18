import { SoundPreferenceManager } from './managers/SoundPreferenceManager.js';

export class SoundSettingsFacade {
  static explain =
    'Stores music and sound-effect choices on this device, so feedback audio can be muted without changing game rules.';

  constructor({ preferenceManager, uiClickSoundFacade = null } = {}) {
    this.preferenceManager = preferenceManager ?? new SoundPreferenceManager();
    this.uiClickSoundFacade = uiClickSoundFacade;
    this.lastSfxEnabled = null;
    this.preferenceUnsubscribe = this.preferenceManager.subscribe((snapshot) =>
      this.syncSfxPreference(snapshot),
    );
  }

  getSnapshot() {
    return this.preferenceManager.getSnapshot();
  }

  isMusicEnabled() {
    return this.preferenceManager.isMusicEnabled();
  }

  isSfxEnabled() {
    return this.preferenceManager.isSfxEnabled();
  }

  setMusicEnabled(enabled) {
    return this.preferenceManager.setMusicEnabled(enabled);
  }

  setSfxEnabled(enabled) {
    return this.preferenceManager.setSfxEnabled(enabled);
  }

  toggleMusicEnabled() {
    return this.preferenceManager.toggleMusicEnabled();
  }

  toggleSfxEnabled() {
    return this.preferenceManager.toggleSfxEnabled();
  }

  subscribe(listener) {
    return this.preferenceManager.subscribe(listener);
  }

  syncSfxPreference(snapshot = this.getSnapshot()) {
    const enabled = snapshot.sfxEnabled !== false;

    if (this.lastSfxEnabled === enabled) {
      return;
    }

    this.lastSfxEnabled = enabled;
    this.uiClickSoundFacade?.setEnabled?.(enabled);
  }

  destroy() {
    this.preferenceUnsubscribe?.();
    this.preferenceUnsubscribe = null;
  }
}
