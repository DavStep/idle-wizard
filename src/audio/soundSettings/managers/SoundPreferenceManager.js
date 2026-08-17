export const SOUND_SETTINGS_STORAGE_KEY = 'idle-wizard:sound';
export const DEFAULT_SOUND_SETTINGS = Object.freeze({
  musicVolume: 1,
  sfxVolume: 1,
  musicEnabled: true,
  sfxEnabled: true,
});

export class SoundPreferenceManager {
  constructor({ storage = getDefaultStorage() } = {}) {
    this.storage = storage;
    this.snapshot = this.loadSnapshot();
    this.listeners = new Set();
  }

  getSnapshot() {
    return { ...this.snapshot };
  }

  isMusicEnabled() {
    return this.snapshot.musicVolume > 0;
  }

  isSfxEnabled() {
    return this.snapshot.sfxVolume > 0;
  }

  getMusicVolume() {
    return this.snapshot.musicVolume;
  }

  getSfxVolume() {
    return this.snapshot.sfxVolume;
  }

  setMusicVolume(volume) {
    return this.setVolume('musicVolume', 'musicEnabled', volume);
  }

  setSfxVolume(volume) {
    return this.setVolume('sfxVolume', 'sfxEnabled', volume);
  }

  setMusicEnabled(enabled) {
    return this.setMusicVolume(enabled === false ? 0 : 1);
  }

  setSfxEnabled(enabled) {
    return this.setSfxVolume(enabled === false ? 0 : 1);
  }

  toggleMusicEnabled() {
    return this.setMusicEnabled(!this.isMusicEnabled());
  }

  toggleSfxEnabled() {
    return this.setSfxEnabled(!this.isSfxEnabled());
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  setVolume(volumeKey, enabledKey, volume) {
    const nextVolume = normalizeVolume(volume);
    const nextEnabled = nextVolume > 0;

    if (
      this.snapshot[volumeKey] === nextVolume &&
      this.snapshot[enabledKey] === nextEnabled
    ) {
      return this.getSnapshot();
    }

    this.snapshot = {
      ...this.snapshot,
      [volumeKey]: nextVolume,
      [enabledKey]: nextEnabled,
    };
    this.saveSnapshot();
    this.emit();
    return this.getSnapshot();
  }

  emit() {
    const snapshot = this.getSnapshot();

    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  loadSnapshot() {
    if (!this.storage) {
      return { ...DEFAULT_SOUND_SETTINGS };
    }

    try {
      const raw = this.storage.getItem(SOUND_SETTINGS_STORAGE_KEY);
      if (!raw) {
        return { ...DEFAULT_SOUND_SETTINGS };
      }

      return normalizeSoundSettings(JSON.parse(raw));
    } catch {
      return { ...DEFAULT_SOUND_SETTINGS };
    }
  }

  saveSnapshot() {
    if (!this.storage) {
      return;
    }

    try {
      this.storage.setItem(SOUND_SETTINGS_STORAGE_KEY, JSON.stringify(this.snapshot));
    } catch {
      // Device preference persistence is best-effort.
    }
  }
}

function normalizeSoundSettings(value) {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_SOUND_SETTINGS };
  }

  const musicVolume = normalizeStoredVolume(
    value.musicVolume,
    value.musicEnabled,
    DEFAULT_SOUND_SETTINGS.musicVolume,
  );
  const sfxVolume = normalizeStoredVolume(
    value.sfxVolume,
    value.sfxEnabled,
    DEFAULT_SOUND_SETTINGS.sfxVolume,
  );
  return {
    musicVolume,
    sfxVolume,
    musicEnabled: musicVolume > 0,
    sfxEnabled: sfxVolume > 0,
  };
}

function normalizeStoredVolume(volume, legacyEnabled, fallback) {
  if (Number.isFinite(Number(volume))) {
    return normalizeVolume(volume);
  }
  if (typeof legacyEnabled === 'boolean') {
    return legacyEnabled ? 1 : 0;
  }
  return fallback;
}

function normalizeVolume(volume) {
  const numeric = Number(volume);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(0, Math.min(1, numeric));
}

function getDefaultStorage() {
  try {
    return globalThis.window?.localStorage ?? null;
  } catch {
    return null;
  }
}
