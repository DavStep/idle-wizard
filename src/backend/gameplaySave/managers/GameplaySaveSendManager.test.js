import { describe, expect, it, vi } from 'vitest';

import { GameplaySaveSendManager } from './GameplaySaveSendManager.js';
import { GameplaySaveJournalManager } from './GameplaySaveJournalManager.js';

function createStorage() {
  const values = new Map();

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

describe('GameplaySaveSendManager', () => {
  it('sends gameplay save JSON through the generated reducer', () => {
    const setPlayerGameplaySave = vi.fn(() => Promise.resolve());
    const manager = new GameplaySaveSendManager({ syncTimeoutMs: 0 });

    manager.connect({
      reducers: {
        setPlayerGameplaySave,
      },
    });
    manager.setReadyToSend(true);
    manager.save({ version: 2, coin: { current: 12 } });

    expect(setPlayerGameplaySave).toHaveBeenCalledWith({
      saveJson: JSON.stringify({ version: 2, coin: { current: 12 } }),
    });
  });

  it('rejects saves that are too large for the reducer before sending', () => {
    const setPlayerGameplaySave = vi.fn(() => Promise.resolve());
    const onSyncUnhealthy = vi.fn();
    const manager = new GameplaySaveSendManager({
      syncTimeoutMs: 0,
      onSyncUnhealthy,
    });

    manager.connect({
      reducers: {
        setPlayerGameplaySave,
      },
    });
    manager.setReadyToSend(true);

    expect(manager.save({ payload: 'x'.repeat(250_000) })).toBe(false);
    expect(setPlayerGameplaySave).not.toHaveBeenCalled();
    expect(onSyncUnhealthy).toHaveBeenCalledWith({
      reason: 'gameplay_save_too_large',
      error: {
        saveJsonLength: expect.any(Number),
        maxSaveJsonLength: 250_000,
      },
    });
  });

  it('queues the latest save until a connection is hydrated', () => {
    const set_player_gameplay_save = vi.fn(() => Promise.resolve());
    const manager = new GameplaySaveSendManager({ syncTimeoutMs: 0 });

    expect(manager.save({ version: 2, coin: { current: 1 } })).toBe(true);
    manager.save({ version: 2, coin: { current: 2 } });
    manager.connect({
      reducers: {
        set_player_gameplay_save,
      },
    });

    expect(set_player_gameplay_save).not.toHaveBeenCalled();

    manager.setReadyToSend(true);

    expect(set_player_gameplay_save).toHaveBeenCalledTimes(1);
    expect(set_player_gameplay_save).toHaveBeenCalledWith({
      saveJson: JSON.stringify({ version: 2, coin: { current: 2 } }),
    });
  });

  it('drops saves made before server hydration when requested', () => {
    const set_player_gameplay_save = vi.fn(() => Promise.resolve());
    const manager = new GameplaySaveSendManager({ syncTimeoutMs: 0 });

    manager.save({ version: 2, coin: { current: 1 } });
    manager.connect({
      reducers: {
        set_player_gameplay_save,
      },
    });
    manager.discardPreHydrationSave();
    manager.setReadyToSend(true);

    expect(set_player_gameplay_save).not.toHaveBeenCalled();
  });

  it('exposes hydrated pending saves for reconnect hydration', () => {
    const save = { version: 2, coin: { current: 7 } };
    const manager = new GameplaySaveSendManager({ syncTimeoutMs: 0 });

    manager.restorePending(JSON.stringify(save), true);

    expect(manager.getPendingHydratedSave()).toEqual(save);
  });

  it('discards a hydrated pending save when the server accepted that client save or a later one', () => {
    const save = {
      version: 2,
      savedAt: 120,
      clientSaveSessionId: 'session-1',
      clientSaveSequence: 2,
      coin: { current: 7 },
    };
    const manager = new GameplaySaveSendManager({ syncTimeoutMs: 0 });

    manager.restorePending(JSON.stringify(save), true);

    expect(
      manager.discardHydratedSaveIfServerIsAtLeastAsNew({
        version: 3,
        savedAt: 500,
        clientSavedAt: 120,
        clientSaveSessionId: 'session-1',
        clientSaveSequence: 2,
        coin: { current: 7 },
      }),
    ).toBe(true);
    expect(manager.getPendingHydratedSave()).toBeNull();
  });

  it('keeps newer pending cauldron choices even when the server write time is later', () => {
    const save = {
      version: 2,
      savedAt: 121,
      clientSaveSessionId: 'session-1',
      clientSaveSequence: 3,
      brewing: {
        cauldrons: [
          { cauldronNumber: 1, brewQuantity: 1 },
          { cauldronNumber: 2, brewQuantity: 1 },
        ],
      },
    };
    const manager = new GameplaySaveSendManager({ syncTimeoutMs: 0 });

    manager.restorePending(JSON.stringify(save), true);

    expect(
      manager.discardHydratedSaveIfServerIsAtLeastAsNew({
        version: 3,
        savedAt: 500,
        clientSavedAt: 120,
        clientSaveSessionId: 'session-1',
        clientSaveSequence: 2,
        brewing: {
          cauldrons: [
            { cauldronNumber: 1, brewQuantity: 1 },
            { cauldronNumber: 2, brewQuantity: null },
          ],
        },
      }),
    ).toBe(false);
    expect(manager.getPendingHydratedSave()).toEqual(save);
  });

  it('does not expose pre-hydration pending saves for reconnect hydration', () => {
    const manager = new GameplaySaveSendManager({ syncTimeoutMs: 0 });

    manager.restorePending(
      JSON.stringify({ version: 2, coin: { current: 7 } }),
      false,
    );

    expect(manager.getPendingHydratedSave()).toBeNull();
  });

  it('keeps saves made after server hydration across reconnects', () => {
    const failingSetPlayerGameplaySave = vi.fn(() => {
      throw new Error('offline');
    });
    const set_player_gameplay_save = vi.fn(() => Promise.resolve());
    const manager = new GameplaySaveSendManager({ syncTimeoutMs: 0 });

    manager.connect({
      reducers: {
        set_player_gameplay_save: failingSetPlayerGameplaySave,
      },
    });
    manager.setHydrated(true);
    manager.setReadyToSend(true);
    manager.save({ version: 2, coin: { current: 3 } });
    manager.disconnect();
    manager.discardPreHydrationSave();
    manager.connect({
      reducers: {
        set_player_gameplay_save,
      },
    });
    manager.setReadyToSend(true);

    expect(set_player_gameplay_save).toHaveBeenCalledWith({
      saveJson: JSON.stringify({ version: 2, coin: { current: 3 } }),
    });
  });

  it('keeps an in-flight save across disconnects before the reducer ack', async () => {
    let resolveFirstSave;
    const firstSetPlayerGameplaySave = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveFirstSave = resolve;
        }),
    );
    const secondSetPlayerGameplaySave = vi.fn(() => Promise.resolve());
    const manager = new GameplaySaveSendManager({ syncTimeoutMs: 0 });

    manager.connect({
      reducers: {
        setPlayerGameplaySave: firstSetPlayerGameplaySave,
      },
    });
    manager.setHydrated(true);
    manager.setReadyToSend(true);
    manager.save({ version: 2, coin: { current: 3 } });

    expect(firstSetPlayerGameplaySave).toHaveBeenCalledTimes(1);

    manager.disconnect();
    manager.discardPreHydrationSave();
    manager.connect({
      reducers: {
        setPlayerGameplaySave: secondSetPlayerGameplaySave,
      },
    });
    manager.setReadyToSend(true);

    expect(secondSetPlayerGameplaySave).toHaveBeenCalledWith({
      saveJson: JSON.stringify({ version: 2, coin: { current: 3 } }),
    });

    resolveFirstSave();
    await Promise.resolve();
  });

  it('recovers the latest cauldron configuration after a full process restart', () => {
    const storage = createStorage();
    const firstSetPlayerGameplaySave = vi.fn(() => new Promise(() => {}));
    const first = new GameplaySaveSendManager({
      syncTimeoutMs: 0,
      journalManager: new GameplaySaveJournalManager({ storage }),
    });
    const serverSave = {
      version: 3,
      clientSaveSessionId: 'server-session',
      clientSaveSequence: 4,
      brewing: {
        cauldrons: [
          { cauldronNumber: 1, brewQuantity: null },
          { cauldronNumber: 2, brewQuantity: null },
        ],
      },
    };
    const firstChangedSave = {
      version: 3,
      clientSaveSessionId: 'client-session',
      clientSaveSequence: 5,
      brewing: {
        cauldrons: [
          { cauldronNumber: 1, brewQuantity: null },
          {
            cauldronNumber: 2,
            brewQuantity: 4,
            autoBrewEnabled: false,
            autoBrewRecipeKey: 'manaTonic',
          },
        ],
      },
    };
    const latestSave = {
      version: 3,
      clientSaveSessionId: 'client-session',
      clientSaveSequence: 6,
      brewing: {
        cauldrons: [
          { cauldronNumber: 1, brewQuantity: null },
          {
            cauldronNumber: 2,
            brewQuantity: 4,
            autoBrewEnabled: true,
            autoBrewArmed: false,
            autoBrewRecipeKey: 'manaTonic',
          },
        ],
      },
    };

    first.connect(
      { reducers: { setPlayerGameplaySave: firstSetPlayerGameplaySave } },
      'player-1',
    );
    first.discardHydratedSaveIfServerIsAtLeastAsNew(serverSave);
    first.setHydrated(true);
    first.setReadyToSend(true);
    first.save(firstChangedSave);
    first.save(latestSave);

    expect(firstSetPlayerGameplaySave).toHaveBeenCalledTimes(1);

    const replaySave = vi.fn(() => Promise.resolve());
    const restarted = new GameplaySaveSendManager({
      syncTimeoutMs: 0,
      journalManager: new GameplaySaveJournalManager({ storage }),
    });

    restarted.save({
      version: 3,
      clientSaveSessionId: 'new-process-default',
      clientSaveSequence: 1,
      brewing: {
        cauldrons: [
          { cauldronNumber: 1, brewQuantity: null },
          { cauldronNumber: 2, brewQuantity: null },
        ],
      },
    });
    restarted.connect(
      { reducers: { setPlayerGameplaySave: replaySave } },
      'player-1',
    );
    restarted.discardHydratedSaveIfServerIsAtLeastAsNew(firstChangedSave);

    expect(restarted.getPendingHydratedSave()).toEqual(latestSave);

    restarted.setReadyToSend(true);

    expect(replaySave).toHaveBeenCalledWith({
      saveJson: JSON.stringify(latestSave),
    });
  });

  it('does not replay a journal over a save advanced by another session', () => {
    const storage = createStorage();
    const journalManager = new GameplaySaveJournalManager({ storage });
    journalManager.connect('player-1');
    journalManager.save({
      saveJson: JSON.stringify({
        version: 3,
        clientSaveSessionId: 'stale-session',
        clientSaveSequence: 2,
        coin: { current: 10 },
      }),
      baseServerRevision: {
        clientSaveSessionId: 'base-session',
        clientSaveSequence: 8,
      },
    });
    journalManager.disconnect();

    const manager = new GameplaySaveSendManager({
      syncTimeoutMs: 0,
      journalManager,
    });
    manager.connect({ reducers: {} }, 'player-1');

    expect(
      manager.discardHydratedSaveIfServerIsAtLeastAsNew({
        version: 3,
        clientSaveSessionId: 'other-device-session',
        clientSaveSequence: 1,
        coin: { current: 50 },
      }),
    ).toBe(true);
    expect(manager.getPendingHydratedSave()).toBeNull();
    expect(journalManager.load()).toBeNull();
  });

  it('discards pending and in-flight saves after an account takeover', () => {
    const firstSetPlayerGameplaySave = vi.fn(() => new Promise(() => {}));
    const secondSetPlayerGameplaySave = vi.fn(() => Promise.resolve());
    const manager = new GameplaySaveSendManager({ syncTimeoutMs: 0 });

    manager.connect({
      reducers: {
        setPlayerGameplaySave: firstSetPlayerGameplaySave,
      },
    });
    manager.setReadyToSend(true);
    manager.save({ version: 2, coin: { current: 3 } });
    manager.save({ version: 2, coin: { current: 4 } });

    manager.discardPendingSaves();
    manager.disconnect();
    manager.connect({
      reducers: {
        setPlayerGameplaySave: secondSetPlayerGameplaySave,
      },
    });
    manager.setReadyToSend(true);

    expect(firstSetPlayerGameplaySave).toHaveBeenCalledTimes(1);
    expect(secondSetPlayerGameplaySave).not.toHaveBeenCalled();
    expect(manager.pendingSaveJson).toBeNull();
    expect(manager.inFlightSaveJson).toBeNull();
  });

  it('times out a stuck reducer ack and keeps the newest pending save', async () => {
    let timeoutCallback;
    const setTimeoutFn = vi.fn((callback) => {
      timeoutCallback = callback;
      return 'timer-1';
    });
    const clearTimeoutFn = vi.fn();
    const onSyncUnhealthy = vi.fn();
    const setPlayerGameplaySave = vi.fn(() => new Promise(() => {}));
    const manager = new GameplaySaveSendManager({
      syncTimeoutMs: 50,
      setTimeoutFn,
      clearTimeoutFn,
      onSyncUnhealthy,
    });

    manager.connect({
      reducers: {
        setPlayerGameplaySave,
      },
    });
    manager.setReadyToSend(true);

    const flush = manager.saveAndFlush({ version: 2, coin: { current: 1 } });
    manager.save({ version: 2, coin: { current: 2 } });

    expect(setPlayerGameplaySave).toHaveBeenCalledTimes(1);
    expect(setTimeoutFn).toHaveBeenCalledWith(expect.any(Function), 50);

    timeoutCallback();

    await expect(flush).resolves.toBe(false);
    expect(onSyncUnhealthy).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'gameplay_save_timeout' }),
    );
    expect(manager.pendingSaveJson).toBe(
      JSON.stringify({ version: 2, coin: { current: 2 } }),
    );
    expect(manager.syncPromise).toBeNull();
    expect(clearTimeoutFn).not.toHaveBeenCalled();
  });

  it('accepts an observed save revision even while the reducer promise is pending', async () => {
    const setPlayerGameplaySave = vi.fn(() => new Promise(() => {}));
    const manager = new GameplaySaveSendManager({ syncTimeoutMs: 0 });
    const save = {
      version: 3,
      clientSaveSessionId: 'client-session',
      clientSaveSequence: 1,
      coin: { current: 9 },
    };

    manager.connect({
      reducers: {
        setPlayerGameplaySave,
      },
    });
    manager.setReadyToSend(true);

    const flush = manager.saveAndFlush(save);
    let settled = false;
    flush.then(() => {
      settled = true;
    });

    await Promise.resolve();

    expect(setPlayerGameplaySave).toHaveBeenCalledTimes(1);
    expect(settled).toBe(false);

    manager.observeServerSave(save);

    await expect(flush).resolves.toBe(true);
    expect(settled).toBe(true);
  });

  it('keeps the journal until the exact sent revision is observed on the server', async () => {
    const storage = createStorage();
    const journalManager = new GameplaySaveJournalManager({ storage });
    let journalAtReducerCall = null;
    const setPlayerGameplaySave = vi.fn(() => {
      journalAtReducerCall = journalManager.load();
      return Promise.resolve();
    });
    const manager = new GameplaySaveSendManager({
      syncTimeoutMs: 0,
      journalManager,
    });
    const save = {
      version: 3,
      clientSaveSessionId: 'client-session',
      clientSaveSequence: 7,
      coin: { current: 25 },
    };

    manager.connect({ reducers: { setPlayerGameplaySave } }, 'player-1');
    manager.discardHydratedSaveIfServerIsAtLeastAsNew(null);
    manager.setHydrated(true);
    manager.setReadyToSend(true);

    const flush = manager.saveAndFlush(save);
    let settled = false;
    flush.then(() => {
      settled = true;
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(setPlayerGameplaySave).toHaveBeenCalledTimes(1);
    expect(journalAtReducerCall).toMatchObject({ saveJson: JSON.stringify(save) });
    expect(settled).toBe(false);
    expect(journalManager.load()).toMatchObject({ saveJson: JSON.stringify(save) });

    manager.observeServerSave({
      ...save,
      clientSaveSequence: 6,
    });
    await Promise.resolve();

    expect(settled).toBe(false);
    expect(journalManager.load()).not.toBeNull();

    manager.observeServerSave(save);

    await expect(flush).resolves.toBe(true);
    expect(journalManager.load()).toBeNull();
  });

  it('times out after a mismatched server snapshot without clearing recovery state', async () => {
    const storage = createStorage();
    const journalManager = new GameplaySaveJournalManager({ storage });
    let timeoutCallback = null;
    const manager = new GameplaySaveSendManager({
      syncTimeoutMs: 50,
      setTimeoutFn: (callback) => {
        timeoutCallback = callback;
        return 'timer-1';
      },
      journalManager,
    });
    const save = {
      version: 3,
      clientSaveSessionId: 'client-session',
      clientSaveSequence: 9,
      coin: { current: 40 },
    };

    manager.connect(
      { reducers: { setPlayerGameplaySave: () => Promise.resolve() } },
      'player-1',
    );
    manager.discardHydratedSaveIfServerIsAtLeastAsNew(null);
    manager.setHydrated(true);
    manager.setReadyToSend(true);

    const flush = manager.saveAndFlush(save);
    manager.observeServerSave({
      ...save,
      clientSaveSessionId: 'other-session',
    });
    await Promise.resolve();

    expect(timeoutCallback).toEqual(expect.any(Function));
    timeoutCallback();

    await expect(flush).resolves.toBe(false);
    expect(journalManager.load()).toMatchObject({ saveJson: JSON.stringify(save) });
    expect(manager.getPendingHydratedSave()).toEqual(save);
  });

  it('rebases a newer journal only after the prior revision is observed', async () => {
    const storage = createStorage();
    const journalManager = new GameplaySaveJournalManager({ storage });
    const manager = new GameplaySaveSendManager({
      syncTimeoutMs: 0,
      syncIntervalMs: 60_000,
      setTimeoutFn: vi.fn(() => 'timer-1'),
      now: () => 1_000,
      journalManager,
    });
    const firstSave = {
      version: 3,
      clientSaveSessionId: 'client-session',
      clientSaveSequence: 10,
      coin: { current: 50 },
    };
    const latestSave = {
      ...firstSave,
      clientSaveSequence: 11,
      coin: { current: 55 },
    };

    manager.connect(
      { reducers: { setPlayerGameplaySave: () => Promise.resolve() } },
      'player-1',
    );
    manager.discardHydratedSaveIfServerIsAtLeastAsNew(null);
    manager.setHydrated(true);
    manager.setReadyToSend(true);
    manager.save(firstSave);
    const firstSync = manager.syncPromise;
    manager.save(latestSave);
    await Promise.resolve();
    await Promise.resolve();

    expect(journalManager.load()).toMatchObject({
      saveJson: JSON.stringify(latestSave),
      baseServerRevision: { empty: true },
    });

    manager.observeServerSave(firstSave);
    await firstSync;

    expect(journalManager.load()).toMatchObject({
      saveJson: JSON.stringify(latestSave),
      baseServerRevision: {
        clientSaveSessionId: 'client-session',
        clientSaveSequence: 10,
      },
    });
  });

  it('journals a post-hydration baseline before sends are enabled', () => {
    const storage = createStorage();
    const journalManager = new GameplaySaveJournalManager({ storage });
    const setPlayerGameplaySave = vi.fn(() => Promise.resolve());
    const manager = new GameplaySaveSendManager({
      syncTimeoutMs: 0,
      journalManager,
    });
    const save = {
      version: 3,
      clientSaveSessionId: 'fresh-session',
      clientSaveSequence: 1,
      coin: { current: 10 },
    };

    manager.connect({ reducers: { setPlayerGameplaySave } }, 'player-1');
    manager.discardHydratedSaveIfServerIsAtLeastAsNew(null);

    expect(manager.setHydrated).toEqual(expect.any(Function));
    manager.setHydrated(true);
    manager.save(save);

    expect(setPlayerGameplaySave).not.toHaveBeenCalled();
    expect(journalManager.load()).toMatchObject({ saveJson: JSON.stringify(save) });
  });

  it('resends identical content after reconnect when the server row may be empty', async () => {
    const firstReducer = vi.fn(() => Promise.resolve());
    const secondReducer = vi.fn(() => Promise.resolve());
    const manager = new GameplaySaveSendManager({ syncTimeoutMs: 0 });
    const firstSave = {
      version: 3,
      clientSaveSessionId: 'client-session',
      clientSaveSequence: 1,
      coin: { current: 10 },
    };
    const secondSave = {
      ...firstSave,
      clientSaveSequence: 2,
    };

    manager.connect({ reducers: { setPlayerGameplaySave: firstReducer } }, 'player-1');
    manager.setHydrated(true);
    manager.setReadyToSend(true);
    const firstFlush = manager.saveAndFlush(firstSave);
    manager.observeServerSave(firstSave);
    await expect(firstFlush).resolves.toBe(true);

    manager.disconnect();
    manager.connect({ reducers: { setPlayerGameplaySave: secondReducer } }, 'player-1');
    manager.setHydrated(true);
    manager.setReadyToSend(true);
    const secondFlush = manager.saveAndFlush(secondSave);

    expect(secondReducer).toHaveBeenCalledTimes(1);
    manager.observeServerSave(secondSave);
    await expect(secondFlush).resolves.toBe(true);
  });

  it('keeps a rejected save journaled for reconnect recovery', async () => {
    const storage = createStorage();
    const journalManager = new GameplaySaveJournalManager({ storage });
    const manager = new GameplaySaveSendManager({
      syncTimeoutMs: 0,
      journalManager,
    });
    const save = {
      version: 3,
      clientSaveSessionId: 'client-session',
      clientSaveSequence: 8,
      coin: { current: 30 },
    };

    manager.connect(
      {
        reducers: {
          setPlayerGameplaySave: () => Promise.reject(new Error('rejected')),
        },
      },
      'player-1',
    );
    manager.discardHydratedSaveIfServerIsAtLeastAsNew(null);
    manager.setHydrated(true);
    manager.setReadyToSend(true);

    await expect(manager.saveAndFlush(save)).resolves.toBe(false);
    expect(journalManager.load()).toMatchObject({ saveJson: JSON.stringify(save) });
    expect(manager.getPendingHydratedSave()).toEqual(save);
  });

  it('cancels an in-flight flush on disconnect without clearing its journal', async () => {
    const storage = createStorage();
    const journalManager = new GameplaySaveJournalManager({ storage });
    const manager = new GameplaySaveSendManager({
      syncTimeoutMs: 0,
      journalManager,
    });
    const save = {
      version: 3,
      clientSaveSessionId: 'client-session',
      clientSaveSequence: 12,
      coin: { current: 60 },
    };

    manager.connect(
      { reducers: { setPlayerGameplaySave: () => new Promise(() => {}) } },
      'player-1',
    );
    manager.discardHydratedSaveIfServerIsAtLeastAsNew(null);
    manager.setHydrated(true);
    manager.setReadyToSend(true);

    const flush = manager.saveAndFlush(save);
    manager.disconnect();

    await expect(flush).resolves.toBe(false);

    const journalReader = new GameplaySaveJournalManager({ storage });
    journalReader.connect('player-1');
    expect(journalReader.load()).toMatchObject({ saveJson: JSON.stringify(save) });
    expect(manager.getPendingHydratedSave()).toEqual(save);
  });

  it('does not resend saves when only savedAt changed', async () => {
    const setPlayerGameplaySave = vi.fn(() => Promise.resolve());
    const manager = new GameplaySaveSendManager({ syncTimeoutMs: 0 });

    manager.connect({
      reducers: {
        setPlayerGameplaySave,
      },
    });
    manager.setReadyToSend(true);
    const firstSave = {
      version: 3,
      savedAt: 100,
      clientSaveSessionId: 'client-session',
      clientSaveSequence: 1,
      coin: { current: 9 },
    };
    manager.save(firstSave);
    await Promise.resolve();
    manager.observeServerSave(firstSave);
    await manager.syncPromise;
    await Promise.resolve();

    manager.save({
      ...firstSave,
      savedAt: 200,
      clientSaveSequence: 2,
    });
    await Promise.resolve();

    expect(setPlayerGameplaySave).toHaveBeenCalledTimes(1);
  });

  it('throttles repeated sends within the sync interval', async () => {
    let nowMs = 1_000;
    let scheduledFlush;
    const setTimeoutFn = vi.fn((callback, delayMs) => {
      scheduledFlush = callback;
      return { delayMs };
    });
    const setPlayerGameplaySave = vi.fn(() => Promise.resolve());
    const manager = new GameplaySaveSendManager({
      syncTimeoutMs: 0,
      syncIntervalMs: 60_000,
      setTimeoutFn,
      now: () => nowMs,
    });

    manager.connect({
      reducers: {
        setPlayerGameplaySave,
      },
    });
    manager.setReadyToSend(true);
    const firstSave = {
      version: 3,
      clientSaveSessionId: 'client-session',
      clientSaveSequence: 1,
      coin: { current: 1 },
    };
    const secondSave = {
      ...firstSave,
      clientSaveSequence: 2,
      coin: { current: 2 },
    };
    manager.save(firstSave);
    await Promise.resolve();
    manager.observeServerSave(firstSave);
    await manager.syncPromise;
    await Promise.resolve();

    nowMs += 5_000;
    manager.save(secondSave);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(setPlayerGameplaySave).toHaveBeenCalledTimes(1);
    expect(setTimeoutFn).toHaveBeenCalledWith(expect.any(Function), 55_000);

    nowMs += 55_000;
    scheduledFlush();
    await Promise.resolve();

    expect(setPlayerGameplaySave).toHaveBeenCalledTimes(2);
    expect(setPlayerGameplaySave).toHaveBeenLastCalledWith({
      saveJson: JSON.stringify(secondSave),
    });
  });

  it('uses a short default sync interval so reloads lose less recent progress', async () => {
    let nowMs = 1_000;
    let scheduledDelayMs = null;
    const setTimeoutFn = vi.fn((callback, delayMs) => {
      scheduledDelayMs = delayMs;
      return { callback, delayMs };
    });
    const setPlayerGameplaySave = vi.fn(() => Promise.resolve());
    const manager = new GameplaySaveSendManager({
      syncTimeoutMs: 0,
      setTimeoutFn,
      now: () => nowMs,
    });

    manager.connect({
      reducers: {
        setPlayerGameplaySave,
      },
    });
    manager.setReadyToSend(true);
    const firstSave = {
      version: 3,
      clientSaveSessionId: 'client-session',
      clientSaveSequence: 1,
      coin: { current: 1 },
    };
    manager.save(firstSave);
    await Promise.resolve();
    manager.observeServerSave(firstSave);
    await manager.syncPromise;
    await Promise.resolve();

    nowMs += 1_000;
    manager.save({
      ...firstSave,
      clientSaveSequence: 2,
      coin: { current: 2 },
    });
    await Promise.resolve();

    expect(setPlayerGameplaySave).toHaveBeenCalledTimes(1);
    expect(scheduledDelayMs).toBe(4_000);
  });

  it('bypasses the sync interval when a flush is forced', async () => {
    let nowMs = 1_000;
    const setPlayerGameplaySave = vi.fn(() => Promise.resolve());
    const manager = new GameplaySaveSendManager({
      syncTimeoutMs: 0,
      syncIntervalMs: 60_000,
      now: () => nowMs,
    });

    manager.connect({
      reducers: {
        setPlayerGameplaySave,
      },
    });
    manager.setReadyToSend(true);
    const firstSave = {
      version: 3,
      clientSaveSessionId: 'client-session',
      clientSaveSequence: 1,
      coin: { current: 1 },
    };
    const secondSave = {
      ...firstSave,
      clientSaveSequence: 2,
      coin: { current: 2 },
    };
    manager.save(firstSave);
    await Promise.resolve();
    manager.observeServerSave(firstSave);
    await manager.syncPromise;

    nowMs += 5_000;
    const flush = manager.saveAndFlush(secondSave);
    await Promise.resolve();
    manager.observeServerSave(secondSave);
    await expect(flush).resolves.toBe(true);

    expect(setPlayerGameplaySave).toHaveBeenCalledTimes(2);
    expect(setPlayerGameplaySave).toHaveBeenLastCalledWith({
      saveJson: JSON.stringify(secondSave),
    });
  });
});
