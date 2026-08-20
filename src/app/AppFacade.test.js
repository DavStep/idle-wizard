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
      start: vi.fn((options) => events.push(['lifecycle-start', options])),
      resumeBackendConnectionFlow: vi.fn(() => events.push('backend-start')),
    };
    app.backgroundMusicFacade = {
      start: vi.fn(() => events.push('music-start')),
    };

    const startPromise = app.start();

    expect(events).toEqual(['app-ready', 'render-initialize']);
    await Promise.resolve();
    expect(events).toEqual(['app-ready', 'render-initialize', 'update-check']);

    finishRender();
    await expect(startPromise).resolves.toBe(app);
    expect(events).toEqual([
      'app-ready',
      'render-initialize',
      'update-check',
      'music-start',
      ['lifecycle-start', {
        connectBackend: false,
        loadingStatus: 'Checking for updates...',
      }],
      'backend-start',
    ]);
  });

  it('shows the mandatory update dialog before gameplay can start', async () => {
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

    await expect(app.checkForLiveUpdate()).resolves.toBe(false);
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
    app.playable = true;
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
      hide: vi.fn(),
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
    app.lifecycleManager = {
      resumeBackendConnectionFlow: vi.fn(),
    };

    await expect(app.installLiveUpdate()).resolves.toBe(true);

    expect(events).toEqual(['download', 'save', 'activate']);
    expect(app.liveUpdateGateManager.showPreparing).toHaveBeenCalledOnce();
    expect(app.liveUpdateGateManager.showError).not.toHaveBeenCalled();
    expect(app.liveUpdateGateManager.hide).toHaveBeenCalledOnce();
    expect(app.lifecycleManager.resumeBackendConnectionFlow).toHaveBeenCalledOnce();
  });

  it('activates a startup update without saving an unhydrated account', async () => {
    const app = Object.create(AppFacade.prototype);
    app.disposed = false;
    app.playable = false;
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
      hide: vi.fn(),
    };
    app.liveUpdateManager = {
      downloadUpdate: vi.fn(() => Promise.resolve()),
      activateUpdate: vi.fn(() => Promise.resolve()),
    };
    app.gameplayFacade = {
      savePersistenceSnapshotAndFlush: vi.fn(),
    };
    app.lifecycleManager = {
      resumeBackendConnectionFlow: vi.fn(),
    };

    await expect(app.installLiveUpdate()).resolves.toBe(true);

    expect(app.gameplayFacade.savePersistenceSnapshotAndFlush).not.toHaveBeenCalled();
    expect(app.liveUpdateManager.activateUpdate).toHaveBeenCalledOnce();
    expect(app.lifecycleManager.resumeBackendConnectionFlow).toHaveBeenCalledOnce();
  });

  it('blocks startup when the native APK is below the minimum version', () => {
    const app = Object.create(AppFacade.prototype);
    app.disposed = false;
    app.liveUpdateInProgress = false;
    app.liveUpdateCheckResult = {
      status: 'native_update_required',
      minimumNativeVersion: '0.4.0',
    };
    app.liveUpdateGateManager = {
      showNativeUpdateRequired: vi.fn(),
    };

    expect(app.presentLiveUpdateIfReady()).toBe(true);
    expect(app.liveUpdateGateManager.showNativeUpdateRequired).toHaveBeenCalledWith({
      minimumVersion: '0.4.0',
    });
  });

  it('runs a fresh update probe when settings requests one', async () => {
    const app = Object.create(AppFacade.prototype);
    app.disposed = false;
    app.liveUpdateInProgress = false;
    app.liveUpdateCheckResult = { status: 'up_to_date', version: '0.3.49' };
    app.liveUpdateManager = {
      checkNow: vi.fn(() =>
        Promise.resolve({
          status: 'available',
          size: 24 * 1024 * 1024,
          version: '0.4.0',
        }),
      ),
    };

    await expect(app.checkForLiveUpdateManually()).resolves.toEqual({
      status: 'available',
      size: 24 * 1024 * 1024,
      version: '0.4.0',
    });
    expect(app.liveUpdateManager.checkNow).toHaveBeenCalledOnce();
    expect(app.liveUpdateCheckResult).toMatchObject({
      status: 'available',
      version: '0.4.0',
    });
  });
});
