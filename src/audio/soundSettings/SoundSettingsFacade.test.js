import { describe, expect, it, vi } from 'vitest';

import { SoundPreferenceManager } from './managers/SoundPreferenceManager.js';
import { SoundSettingsFacade } from './SoundSettingsFacade.js';

describe('SoundSettingsFacade', () => {
  it('syncs music and sfx preferences to their audio features', () => {
    const backgroundMusicFacade = {
      setAppActive: vi.fn(),
      setVolume: vi.fn(),
    };
    const uiClickSoundFacade = {
      setAppActive: vi.fn(),
      setVolume: vi.fn(),
    };
    const gardenSoundFacade = {
      setAppActive: vi.fn(),
      setVolume: vi.fn(),
    };
    const facade = new SoundSettingsFacade({
      preferenceManager: new SoundPreferenceManager({ storage: memoryStorage() }),
      backgroundMusicFacade,
      gardenSoundFacade,
      uiClickSoundFacade,
    });

    facade.setSfxVolume(0.42);
    facade.setMusicVolume(0.25);
    facade.setSfxVolume(0.78);

    expect(uiClickSoundFacade.setVolume.mock.calls).toEqual([
      [1],
      [0.42],
      [0.78],
    ]);
    expect(gardenSoundFacade.setVolume.mock.calls).toEqual([
      [1],
      [0.42],
      [0.78],
    ]);
    expect(backgroundMusicFacade.setVolume.mock.calls).toEqual([
      [1],
      [0.25],
    ]);

    facade.setAppActive(false);
    facade.setAppActive(true);

    for (const audioFacade of [
      backgroundMusicFacade,
      gardenSoundFacade,
      uiClickSoundFacade,
    ]) {
      expect(audioFacade.setAppActive.mock.calls).toEqual([[false], [true]]);
    }

    facade.destroy();
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
