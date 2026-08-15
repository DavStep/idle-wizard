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

    const startPromise = app.start();

    expect(events).toEqual(['app-ready', 'render-initialize']);

    finishRender();
    await expect(startPromise).resolves.toBe(app);
    expect(events).toEqual([
      'app-ready',
      'render-initialize',
      'lifecycle-start',
      'update-check',
    ]);
  });
});
