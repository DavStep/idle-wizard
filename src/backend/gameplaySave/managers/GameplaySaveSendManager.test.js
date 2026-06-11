import { describe, expect, it, vi } from 'vitest';

import { GameplaySaveSendManager } from './GameplaySaveSendManager.js';

describe('GameplaySaveSendManager', () => {
  it('sends gameplay save JSON through the generated reducer', () => {
    const setPlayerGameplaySave = vi.fn(() => Promise.resolve());
    const manager = new GameplaySaveSendManager();

    manager.connect({
      reducers: {
        setPlayerGameplaySave,
      },
    });
    manager.save({ version: 2, gold: { current: 12 } });

    expect(setPlayerGameplaySave).toHaveBeenCalledWith({
      saveJson: JSON.stringify({ version: 2, gold: { current: 12 } }),
    });
  });

  it('queues the latest save until a connection exists', () => {
    const set_player_gameplay_save = vi.fn(() => Promise.resolve());
    const manager = new GameplaySaveSendManager();

    expect(manager.save({ version: 2, gold: { current: 1 } })).toBe(true);
    manager.save({ version: 2, gold: { current: 2 } });
    manager.connect({
      reducers: {
        set_player_gameplay_save,
      },
    });

    expect(set_player_gameplay_save).toHaveBeenCalledTimes(1);
    expect(set_player_gameplay_save).toHaveBeenCalledWith({
      saveJson: JSON.stringify({ version: 2, gold: { current: 2 } }),
    });
  });
});
