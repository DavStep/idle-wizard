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
    manager.setReadyToSend(true);
    manager.save({ version: 2, gold: { current: 12 } });

    expect(setPlayerGameplaySave).toHaveBeenCalledWith({
      saveJson: JSON.stringify({ version: 2, gold: { current: 12 } }),
    });
  });

  it('queues the latest save until a connection is hydrated', () => {
    const set_player_gameplay_save = vi.fn(() => Promise.resolve());
    const manager = new GameplaySaveSendManager();

    expect(manager.save({ version: 2, gold: { current: 1 } })).toBe(true);
    manager.save({ version: 2, gold: { current: 2 } });
    manager.connect({
      reducers: {
        set_player_gameplay_save,
      },
    });

    expect(set_player_gameplay_save).not.toHaveBeenCalled();

    manager.setReadyToSend(true);

    expect(set_player_gameplay_save).toHaveBeenCalledTimes(1);
    expect(set_player_gameplay_save).toHaveBeenCalledWith({
      saveJson: JSON.stringify({ version: 2, gold: { current: 2 } }),
    });
  });

  it('drops saves made before server hydration when requested', () => {
    const set_player_gameplay_save = vi.fn(() => Promise.resolve());
    const manager = new GameplaySaveSendManager();

    manager.save({ version: 2, gold: { current: 1 } });
    manager.connect({
      reducers: {
        set_player_gameplay_save,
      },
    });
    manager.discardPreHydrationSave();
    manager.setReadyToSend(true);

    expect(set_player_gameplay_save).not.toHaveBeenCalled();
  });

  it('keeps saves made after server hydration across reconnects', () => {
    const failingSetPlayerGameplaySave = vi.fn(() => {
      throw new Error('offline');
    });
    const set_player_gameplay_save = vi.fn(() => Promise.resolve());
    const manager = new GameplaySaveSendManager();

    manager.connect({
      reducers: {
        set_player_gameplay_save: failingSetPlayerGameplaySave,
      },
    });
    manager.setReadyToSend(true);
    manager.save({ version: 2, gold: { current: 3 } });
    manager.disconnect();
    manager.discardPreHydrationSave();
    manager.connect({
      reducers: {
        set_player_gameplay_save,
      },
    });
    manager.setReadyToSend(true);

    expect(set_player_gameplay_save).toHaveBeenCalledWith({
      saveJson: JSON.stringify({ version: 2, gold: { current: 3 } }),
    });
  });
});
