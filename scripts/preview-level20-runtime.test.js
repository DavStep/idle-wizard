import { describe, expect, it, vi } from 'vitest';

import {
  createPreviewBackendTarget,
  createPreviewBuildEnvironment,
  createPreviewPublishPlan,
  prepareLevel20Preview,
} from './preview-level20-runtime.js';

describe('level 20 preview runtime', () => {
  it('publishes this checkout even when the backend port already listens', async () => {
    const calls = [];
    const startBackend = vi.fn();

    await prepareLevel20Preview({
      isBackendListening: vi.fn().mockResolvedValue(true),
      startBackend,
      publishBackend: vi.fn(async () => calls.push('publish')),
      buildAssets: vi.fn(async () => calls.push('build')),
    });

    expect(startBackend).not.toHaveBeenCalled();
    expect(calls).toEqual(['publish', 'build']);
  });

  it('fails closed before building when publishing fails', async () => {
    const buildAssets = vi.fn();

    await expect(
      prepareLevel20Preview({
        isBackendListening: vi.fn().mockResolvedValue(true),
        startBackend: vi.fn(),
        publishBackend: vi.fn().mockRejectedValue(new Error('publish failed')),
        buildAssets,
      }),
    ).rejects.toThrow('publish failed');

    expect(buildAssets).not.toHaveBeenCalled();
  });

  it('publishes and embeds the same port-scoped database target', () => {
    const target = createPreviewBackendTarget(55176);
    const environment = createPreviewBuildEnvironment(
      {
        VITE_SPACETIME_URI: 'wss://wrong.example',
        VITE_SPACETIME_DATABASE: 'wrong-database',
      },
      target,
    );
    const publishPlan = createPreviewPublishPlan(target);

    expect(target).toEqual({
      databaseName: 'idle-wizard-level20-55176',
      httpUri: 'http://127.0.0.1:3000',
      websocketUri: 'ws://127.0.0.1:3000',
    });
    expect(environment).toMatchObject({
      VITE_SPACETIME_URI: target.websocketUri,
      VITE_SPACETIME_DATABASE: target.databaseName,
    });
    expect(publishPlan.args).toContain(target.databaseName);
    expect(publishPlan.args).toContain(target.httpUri);
  });
});
