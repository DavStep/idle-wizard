import { describe, expect, it, vi } from 'vitest';

import { GameplayPersistenceFacade } from './GameplayPersistenceFacade.js';
import { GAMEPLAY_SAVE_VERSION } from './managers/GameplayMigrationManager.js';

function createSnapshotFacade(snapshot = {}) {
  return {
    getSnapshot: vi.fn(() => snapshot),
    getPersistenceSnapshot: vi.fn(() => snapshot),
    applyPersistenceSnapshot: vi.fn(),
  };
}

function createPersistenceFacade({ storageManager, windowRef, documentRef } = {}) {
  const resourceFacade = createSnapshotFacade();

  return new GameplayPersistenceFacade({
    storageManager,
    manaFacade: resourceFacade,
    coinFacade: resourceFacade,
    crystalFacade: resourceFacade,
    emeraldFacade: resourceFacade,
    rubyFacade: resourceFacade,
    gameplayLogFacade: resourceFacade,
    itemsFacade: resourceFacade,
    researchFacade: resourceFacade,
    automationFacade: resourceFacade,
    seedSummoningFacade: resourceFacade,
    prestigeFacade: resourceFacade,
    visualSettingsFacade: resourceFacade,
    shopFacade: resourceFacade,
    brewingFacade: resourceFacade,
    gardenFacade: resourceFacade,
    tasksFacade: resourceFacade,
    personalTasksFacade: resourceFacade,
    worldNoticeFacade: resourceFacade,
    guildFacade: resourceFacade,
    now: () => 123,
    windowRef,
    documentRef,
  });
}

describe('GameplayPersistenceFacade', () => {
  it('does not build a save when the storage manager cannot save', () => {
    const storageManager = {
      canSave: vi.fn(() => false),
      save: vi.fn(() => true),
      saveAndFlush: vi.fn(() => true),
    };
    const facade = createPersistenceFacade({ storageManager });
    const createSave = vi.spyOn(facade.saveManager, 'createSave');

    expect(facade.save()).toBe(false);
    expect(facade.saveAndFlush()).toBe(false);
    expect(createSave).not.toHaveBeenCalled();
    expect(storageManager.save).not.toHaveBeenCalled();
    expect(storageManager.saveAndFlush).not.toHaveBeenCalled();
  });

  it('autosaves once per minute during active play', () => {
    const storageManager = {
      save: vi.fn(() => true),
    };
    const facade = createPersistenceFacade({ storageManager });

    expect(facade.afterUpdate({ deltaSeconds: 59 })).toBe(false);
    expect(storageManager.save).not.toHaveBeenCalled();

    expect(facade.afterUpdate({ deltaSeconds: 1 })).toBe(true);
    expect(storageManager.save).toHaveBeenCalledTimes(1);
  });

  it('gives rapid saves a stable client session and increasing sequence', () => {
    const facade = createPersistenceFacade();
    const firstSave = facade.createSave();
    const secondSave = facade.createSave();

    expect(firstSave.savedAt).toBe(123);
    expect(secondSave.savedAt).toBe(123);
    expect(firstSave.clientSaveSessionId).toBe(secondSave.clientSaveSessionId);
    expect(firstSave.clientSaveSequence).toBe(1);
    expect(secondSave.clientSaveSequence).toBe(2);
  });

  it('flushes the latest save before page reload and when the page hides', () => {
    const windowListeners = new Map();
    const documentListeners = new Map();
    const windowRef = {
      addEventListener: vi.fn((type, listener) => {
        windowListeners.set(type, listener);
      }),
      removeEventListener: vi.fn(),
    };
    const documentRef = {
      visibilityState: 'visible',
      addEventListener: vi.fn((type, listener) => {
        documentListeners.set(type, listener);
      }),
      removeEventListener: vi.fn(),
    };
    const storageManager = {
      saveAndFlush: vi.fn(() => true),
    };
    const facade = createPersistenceFacade({
      storageManager,
      windowRef,
      documentRef,
    });

    facade.start();

    expect(windowRef.addEventListener).toHaveBeenCalledWith(
      'pagehide',
      expect.any(Function),
    );
    expect(windowRef.addEventListener).toHaveBeenCalledWith(
      'beforeunload',
      expect.any(Function),
    );
    expect(documentRef.addEventListener).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function),
    );

    windowListeners.get('beforeunload')();
    documentListeners.get('visibilitychange')();

    expect(storageManager.saveAndFlush).toHaveBeenCalledTimes(1);

    documentRef.visibilityState = 'hidden';
    documentListeners.get('visibilitychange')();

    expect(storageManager.saveAndFlush).toHaveBeenCalledTimes(2);
    expect(storageManager.saveAndFlush.mock.calls[0][0]).toMatchObject({
      version: GAMEPLAY_SAVE_VERSION,
      savedAt: 123,
    });

    facade.stop();

    expect(windowRef.removeEventListener).toHaveBeenCalledWith(
      'pagehide',
      expect.any(Function),
    );
    expect(windowRef.removeEventListener).toHaveBeenCalledWith(
      'beforeunload',
      expect.any(Function),
    );
    expect(documentRef.removeEventListener).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function),
    );
  });
});
