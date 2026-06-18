import { describe, expect, it, vi } from 'vitest';

import {
  SOUND_SETTINGS_STORAGE_KEY,
  SoundPreferenceManager,
} from './SoundPreferenceManager.js';

describe('SoundPreferenceManager', () => {
  it('defaults music and sfx on when no device preference is stored', () => {
    const manager = new SoundPreferenceManager({ storage: memoryStorage() });

    expect(manager.getSnapshot()).toEqual({
      musicEnabled: true,
      sfxEnabled: true,
    });
  });

  it('persists sound settings as device-local data', () => {
    const storage = memoryStorage();
    const manager = new SoundPreferenceManager({ storage });

    manager.setMusicEnabled(false);
    manager.setSfxEnabled(false);

    expect(JSON.parse(storage.getItem(SOUND_SETTINGS_STORAGE_KEY))).toEqual({
      musicEnabled: false,
      sfxEnabled: false,
    });
    expect(new SoundPreferenceManager({ storage }).getSnapshot()).toEqual({
      musicEnabled: false,
      sfxEnabled: false,
    });
  });

  it('publishes snapshots when a sound preference changes', () => {
    const manager = new SoundPreferenceManager({ storage: memoryStorage() });
    const listener = vi.fn();

    const unsubscribe = manager.subscribe(listener);
    manager.toggleMusicEnabled();
    manager.toggleSfxEnabled();
    unsubscribe();
    manager.toggleMusicEnabled();

    expect(listener).toHaveBeenCalledTimes(3);
    expect(listener).toHaveBeenNthCalledWith(1, {
      musicEnabled: true,
      sfxEnabled: true,
    });
    expect(listener).toHaveBeenNthCalledWith(2, {
      musicEnabled: false,
      sfxEnabled: true,
    });
    expect(listener).toHaveBeenNthCalledWith(3, {
      musicEnabled: false,
      sfxEnabled: false,
    });
  });
});

function memoryStorage() {
  const values = new Map();

  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}
