import { describe, expect, it, vi } from 'vitest';

import { SoundPreferenceManager } from './managers/SoundPreferenceManager.js';
import { SoundSettingsFacade } from './SoundSettingsFacade.js';

describe('SoundSettingsFacade', () => {
  it('syncs music and sfx preferences to their audio features', () => {
    const backgroundMusicFacade = {
      setEnabled: vi.fn(),
    };
    const uiClickSoundFacade = {
      setEnabled: vi.fn(),
    };
    const gardenSoundFacade = {
      setEnabled: vi.fn(),
    };
    const facade = new SoundSettingsFacade({
      preferenceManager: new SoundPreferenceManager({ storage: memoryStorage() }),
      backgroundMusicFacade,
      gardenSoundFacade,
      uiClickSoundFacade,
    });

    facade.setSfxEnabled(false);
    facade.setMusicEnabled(false);
    facade.setSfxEnabled(true);

    expect(uiClickSoundFacade.setEnabled).toHaveBeenCalledTimes(3);
    expect(uiClickSoundFacade.setEnabled).toHaveBeenNthCalledWith(1, true);
    expect(uiClickSoundFacade.setEnabled).toHaveBeenNthCalledWith(2, false);
    expect(uiClickSoundFacade.setEnabled).toHaveBeenNthCalledWith(3, true);
    expect(gardenSoundFacade.setEnabled).toHaveBeenCalledTimes(3);
    expect(gardenSoundFacade.setEnabled).toHaveBeenNthCalledWith(1, true);
    expect(gardenSoundFacade.setEnabled).toHaveBeenNthCalledWith(2, false);
    expect(gardenSoundFacade.setEnabled).toHaveBeenNthCalledWith(3, true);
    expect(backgroundMusicFacade.setEnabled).toHaveBeenCalledTimes(2);
    expect(backgroundMusicFacade.setEnabled).toHaveBeenNthCalledWith(1, true);
    expect(backgroundMusicFacade.setEnabled).toHaveBeenNthCalledWith(2, false);

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
