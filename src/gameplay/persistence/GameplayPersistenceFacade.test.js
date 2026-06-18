import { describe, expect, it, vi } from 'vitest';

import { GameplayPersistenceFacade } from './GameplayPersistenceFacade.js';

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
    goldFacade: resourceFacade,
    crystalFacade: resourceFacade,
    rubyFacade: resourceFacade,
    gameplayLogFacade: resourceFacade,
    itemsFacade: resourceFacade,
    researchFacade: resourceFacade,
    prestigeFacade: resourceFacade,
    visualSettingsFacade: resourceFacade,
    shopFacade: resourceFacade,
    brewingFacade: resourceFacade,
    gardenFacade: resourceFacade,
    tasksFacade: resourceFacade,
    now: () => 123,
    windowRef,
    documentRef,
  });
}

describe('GameplayPersistenceFacade', () => {
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
      version: 3,
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
