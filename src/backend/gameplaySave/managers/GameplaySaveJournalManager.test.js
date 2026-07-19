import { describe, expect, it } from 'vitest';

import { GameplaySaveJournalManager } from './GameplaySaveJournalManager.js';

function createStorage() {
  const values = new Map();

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

describe('GameplaySaveJournalManager', () => {
  it('keeps pending saves separate for each player identity', () => {
    const storage = createStorage();
    const first = new GameplaySaveJournalManager({ storage });
    const second = new GameplaySaveJournalManager({ storage });

    first.connect({ toHexString: () => 'player-1' });
    first.save({
      saveJson: '{"coin":1}',
      saveContentKey: 'coin-1',
      baseServerRevision: { empty: true },
    });
    second.connect({ toHexString: () => 'player-2' });

    expect(second.load()).toBeNull();

    second.save({
      saveJson: '{"coin":2}',
      saveContentKey: 'coin-2',
      baseServerRevision: { empty: true },
    });
    first.connect({ toHexString: () => 'player-1' });

    expect(first.load()).toMatchObject({
      saveJson: '{"coin":1}',
      saveContentKey: 'coin-1',
    });
  });

  it('clears malformed journal data without throwing', () => {
    const storage = createStorage();
    const manager = new GameplaySaveJournalManager({ storage });
    const storageKey = manager.createStorageKey('player-1');

    storage.setItem(storageKey, '{broken');
    manager.connect('player-1');

    expect(manager.load()).toBeNull();
    expect(storage.getItem(storageKey)).toBeNull();
  });
});
