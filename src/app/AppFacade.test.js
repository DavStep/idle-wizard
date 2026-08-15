import { describe, expect, it, vi } from 'vitest';

import { AppFacade } from './AppFacade.js';

describe('AppFacade live-update startup ordering', () => {
  it('marks an OTA bundle ready before renderer initialization begins', async () => {
    const events = [];
    let finishRender;
    const app = Object.create(AppFacade.prototype);
    app.disposed = false;
    app.startPromise = null;
    app.playerFacade = {};
    app.liveUpdateManager = {
      notifyAppReady: vi.fn(() => {
        events.push('app-ready');
        return Promise.resolve({});
      }),
      start: vi.fn(() => {
        events.push('update-check');
        return Promise.resolve({ status: 'up_to_date' });
      }),
    };
    app.renderFacade = {
      initialize: vi.fn(() => {
        events.push('render-initialize');
        return new Promise((resolve) => {
          finishRender = resolve;
        });
      }),
    };
    app.lifecycleManager = {
      start: vi.fn(() => events.push('lifecycle-start')),
    };
    app.backgroundMusicFacade = {
      start: vi.fn(() => events.push('music-start')),
    };

    const startPromise = app.start();

    expect(events).toEqual(['app-ready', 'render-initialize']);

    finishRender();
    await expect(startPromise).resolves.toBe(app);
    expect(events).toEqual([
      'app-ready',
      'render-initialize',
      'music-start',
      'lifecycle-start',
      'update-check',
    ]);
  });

  it('waits for gameplay before showing the mandatory update dialog', async () => {
    const app = Object.create(AppFacade.prototype);
    app.disposed = false;
    app.playable = false;
    app.liveUpdateInProgress = false;
    app.liveUpdateCheckResult = null;
    app.liveUpdateManager = {
      start: vi.fn(() => Promise.resolve({
        status: 'available',
        size: 24 * 1024 * 1024,
        version: '0.4.0',
      })),
    };
    app.liveUpdateGateManager = {
      showAvailable: vi.fn(),
    };

    await app.checkForLiveUpdate();
    expect(app.liveUpdateGateManager.showAvailable).not.toHaveBeenCalled();

    app.handlePlayable();
    expect(app.liveUpdateGateManager.showAvailable).toHaveBeenCalledWith({
      size: 24 * 1024 * 1024,
      version: '0.4.0',
      onUpdate: expect.any(Function),
    });
  });

  it('downloads, flushes the save, and then activates the update', async () => {
    const events = [];
    const app = Object.create(AppFacade.prototype);
    app.disposed = false;
    app.liveUpdateInProgress = false;
    app.liveUpdateCheckResult = {
      status: 'available',
      size: 24 * 1024 * 1024,
      version: '0.4.0',
    };
    app.liveUpdateGateManager = {
      showDownloading: vi.fn(),
      showPreparing: vi.fn(),
      showError: vi.fn(),
    };
    app.liveUpdateManager = {
      downloadUpdate: vi.fn(async ({ onProgress }) => {
        events.push('download');
        onProgress({
          downloadedBytes: 12 * 1024 * 1024,
          totalBytes: 24 * 1024 * 1024,
          progress: 0.5,
        });
      }),
      activateUpdate: vi.fn(() => {
        events.push('activate');
        return Promise.resolve();
      }),
    };
    app.gameplayFacade = {
      savePersistenceSnapshotAndFlush: vi.fn(() => {
        events.push('save');
        return Promise.resolve(true);
      }),
    };

    await expect(app.installLiveUpdate()).resolves.toBe(true);

    expect(events).toEqual(['download', 'save', 'activate']);
    expect(app.liveUpdateGateManager.showPreparing).toHaveBeenCalledOnce();
    expect(app.liveUpdateGateManager.showError).not.toHaveBeenCalled();
  });
});
