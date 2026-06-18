import { describe, expect, it, vi } from 'vitest';

import {
  HAPTICS_STORAGE_KEY,
  HapticPreferenceManager,
} from './HapticPreferenceManager.js';

describe('HapticPreferenceManager', () => {
  it('defaults haptics on when no device preference is stored', () => {
    const manager = new HapticPreferenceManager({ storage: memoryStorage() });

    expect(manager.isEnabled()).toBe(true);
  });

  it('persists the enabled preference as device-local data', () => {
    const storage = memoryStorage();
    const manager = new HapticPreferenceManager({ storage });

    manager.setEnabled(false);

    expect(JSON.parse(storage.getItem(HAPTICS_STORAGE_KEY))).toEqual({
      enabled: false,
    });
    expect(new HapticPreferenceManager({ storage }).isEnabled()).toBe(false);
  });

  it('publishes snapshots when the preference changes', () => {
    const manager = new HapticPreferenceManager({ storage: memoryStorage() });
    const listener = vi.fn();

    const unsubscribe = manager.subscribe(listener);
    manager.setEnabled(false);
    unsubscribe();
    manager.setEnabled(true);

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenNthCalledWith(1, { enabled: true });
    expect(listener).toHaveBeenNthCalledWith(2, { enabled: false });
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
