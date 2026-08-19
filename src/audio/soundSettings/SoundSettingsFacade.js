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
    this.lastMusicVolume = null;
    this.lastSfxVolume = null;
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

  getMusicVolume() {
    return this.preferenceManager.getMusicVolume();
  }

  getSfxVolume() {
    return this.preferenceManager.getSfxVolume();
  }

  setMusicVolume(volume) {
    return this.preferenceManager.setMusicVolume(volume);
  }

  setSfxVolume(volume) {
    return this.preferenceManager.setSfxVolume(volume);
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

  setAppActive(active) {
    for (const facade of [
      this.backgroundMusicFacade,
      this.gardenSoundFacade,
      this.uiClickSoundFacade,
    ]) {
      facade?.setAppActive?.(active);
    }
  }

  syncPreferences(snapshot = this.getSnapshot()) {
    const musicVolume = normalizeVolume(
      snapshot.musicVolume,
      snapshot.musicEnabled,
    );
    const sfxVolume = normalizeVolume(
      snapshot.sfxVolume,
      snapshot.sfxEnabled,
    );

    if (this.lastMusicVolume !== musicVolume) {
      this.lastMusicVolume = musicVolume;
      if (this.backgroundMusicFacade?.setVolume) {
        this.backgroundMusicFacade.setVolume(musicVolume);
      } else {
        this.backgroundMusicFacade?.setEnabled?.(musicVolume > 0);
      }
    }

    if (this.lastSfxVolume === sfxVolume) {
      return;
    }

    this.lastSfxVolume = sfxVolume;
    for (const facade of [
      this.gardenSoundFacade,
      this.uiClickSoundFacade,
    ]) {
      if (facade?.setVolume) {
        facade.setVolume(sfxVolume);
      } else {
        facade?.setEnabled?.(sfxVolume > 0);
      }
    }
  }

  destroy() {
    this.preferenceUnsubscribe?.();
    this.preferenceUnsubscribe = null;
  }
}

function normalizeVolume(volume, legacyEnabled) {
  if (Number.isFinite(Number(volume))) {
    return Math.max(0, Math.min(1, Number(volume)));
  }
  return legacyEnabled === false ? 0 : 1;
}
