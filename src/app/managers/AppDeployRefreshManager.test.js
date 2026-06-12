// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { AppDeployRefreshManager } from './AppDeployRefreshManager.js';

function createWindowRef() {
  return {
    fetch: vi.fn(),
    location: {
      href: 'https://example.test/idle-wizard/',
      reload: vi.fn(),
    },
    setInterval: vi.fn(() => 7),
    clearInterval: vi.fn(),
    setTimeout: vi.fn((callback) => {
      callback();
      return 9;
    }),
    clearTimeout: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}

describe('AppDeployRefreshManager', () => {
  it('blocks the stage and reloads after the deploy version changes', async () => {
    const stage = document.createElement('section');
    const windowRef = createWindowRef();
    const fetchVersion = vi
      .fn()
      .mockResolvedValueOnce({ version: 'old-build' })
      .mockResolvedValueOnce({ version: 'new-build' });
    const manager = new AppDeployRefreshManager({
      enabled: true,
      currentVersion: null,
      fetchVersion,
      reloadDelayMs: 0,
      windowRef,
    });

    manager.mount(stage);
    await Promise.resolve();
    await manager.checkNow();

    const gate = stage.querySelector('.app-deploy-refresh');
    expect(gate.hidden).toBe(false);
    expect(gate.textContent).toContain('new version');
    expect(gate.textContent).toContain('refreshing...');
    expect(windowRef.location.reload).toHaveBeenCalledTimes(1);

    manager.unmount();
  });

  it('reloads on the first check when the bundled version is stale', async () => {
    const stage = document.createElement('section');
    const windowRef = createWindowRef();
    const manager = new AppDeployRefreshManager({
      enabled: true,
      currentVersion: 'old-build',
      fetchVersion: vi.fn().mockResolvedValueOnce({ version: 'new-build' }),
      reloadDelayMs: 0,
      windowRef,
    });

    manager.mount(stage);
    await Promise.resolve();

    expect(stage.querySelector('.app-deploy-refresh').hidden).toBe(false);
    expect(windowRef.location.reload).toHaveBeenCalledTimes(1);

    manager.unmount();
  });

  it('fetches the deploy version without cache', async () => {
    const windowRef = createWindowRef();
    windowRef.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ version: 'build-1' }),
    });
    const manager = new AppDeployRefreshManager({
      enabled: true,
      endpoint: '/deploy-version.json',
      windowRef,
    });

    const version = await manager.fetchEndpointVersion();

    expect(version).toEqual({ version: 'build-1' });
    expect(windowRef.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = windowRef.fetch.mock.calls[0];
    expect(url).toMatch(/^https:\/\/example\.test\/deploy-version\.json\?_/);
    expect(options).toEqual({ cache: 'no-store' });
  });
});
