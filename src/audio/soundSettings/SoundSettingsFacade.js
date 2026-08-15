import { SoundPreferenceManager } from './managers/SoundPreferenceManager.js';

export class SoundSettingsFacade {
  static explain =
    'Stores music and sound-effect choices on this device, so feedback audio can be muted without changing game rules.';

  constructor({
    preferenceManager,
    backgroundMusicFacade = null,
    gardenSoundFacade = null,
    uiClickSoundFacade = null,
  } = {}) {
    this.preferenceManager = preferenceManager ?? new SoundPreferenceManager();
    this.backgroundMusicFacade = backgroundMusicFacade;
    this.gardenSoundFacade = gardenSoundFacade;
    this.uiClickSoundFacade = uiClickSoundFacade;
    this.lastMusicEnabled = null;
    this.lastSfxEnabled = null;
    this.preferenceUnsubscribe = this.preferenceManager.subscribe((snapshot) =>
      this.syncPreferences(snapshot),
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

  syncPreferences(snapshot = this.getSnapshot()) {
    const musicEnabled = snapshot.musicEnabled !== false;
    const enabled = snapshot.sfxEnabled !== false;

    if (this.lastMusicEnabled !== musicEnabled) {
      this.lastMusicEnabled = musicEnabled;
      this.backgroundMusicFacade?.setEnabled?.(musicEnabled);
    }

    if (this.lastSfxEnabled === enabled) {
      return;
    }

    this.lastSfxEnabled = enabled;
    this.gardenSoundFacade?.setEnabled?.(enabled);
    this.uiClickSoundFacade?.setEnabled?.(enabled);
  }

  destroy() {
    this.preferenceUnsubscribe?.();
    this.preferenceUnsubscribe = null;
  }
}
