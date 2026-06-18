export const SOUND_SETTINGS_STORAGE_KEY = 'idle-wizard:sound';
export const DEFAULT_SOUND_SETTINGS = Object.freeze({
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
    return this.snapshot.musicEnabled;
  }

  isSfxEnabled() {
    return this.snapshot.sfxEnabled;
  }

  setMusicEnabled(enabled) {
    return this.setPreference('musicEnabled', enabled);
  }

  setSfxEnabled(enabled) {
    return this.setPreference('sfxEnabled', enabled);
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

  setPreference(key, enabled) {
    const nextEnabled = Boolean(enabled);

    if (this.snapshot[key] === nextEnabled) {
      return this.getSnapshot();
    }

    this.snapshot = {
      ...this.snapshot,
      [key]: nextEnabled,
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

  return {
    musicEnabled:
      typeof value.musicEnabled === 'boolean'
        ? value.musicEnabled
        : DEFAULT_SOUND_SETTINGS.musicEnabled,
    sfxEnabled:
      typeof value.sfxEnabled === 'boolean'
        ? value.sfxEnabled
        : DEFAULT_SOUND_SETTINGS.sfxEnabled,
  };
}

function getDefaultStorage() {
  try {
    return globalThis.window?.localStorage ?? null;
  } catch {
    return null;
  }
}
