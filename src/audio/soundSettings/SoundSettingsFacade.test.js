import { describe, expect, it, vi } from 'vitest';

import { SoundPreferenceManager } from './managers/SoundPreferenceManager.js';
import { SoundSettingsFacade } from './SoundSettingsFacade.js';

describe('SoundSettingsFacade', () => {
  it('syncs the sfx preference to the ui click sound facade', () => {
    const uiClickSoundFacade = {
      setEnabled: vi.fn(),
    };
    const facade = new SoundSettingsFacade({
      preferenceManager: new SoundPreferenceManager({ storage: memoryStorage() }),
      uiClickSoundFacade,
    });

    facade.setSfxEnabled(false);
    facade.setMusicEnabled(false);
    facade.setSfxEnabled(true);

    expect(uiClickSoundFacade.setEnabled).toHaveBeenCalledTimes(3);
    expect(uiClickSoundFacade.setEnabled).toHaveBeenNthCalledWith(1, true);
    expect(uiClickSoundFacade.setEnabled).toHaveBeenNthCalledWith(2, false);
    expect(uiClickSoundFacade.setEnabled).toHaveBeenNthCalledWith(3, true);

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
