import { describe, expect, it, vi } from 'vitest';

import { MaintenanceStateManager } from './MaintenanceStateManager.js';

describe('MaintenanceStateManager', () => {
  it('reads maintenance mode from game config snapshots', () => {
    const manager = new MaintenanceStateManager();
    const listener = vi.fn();

    manager.subscribe(listener);
    manager.applyGameConfigSnapshot({
      gameConfigs: [
        {
          configKey: 'maintenance',
          configJson: JSON.stringify({
            mode: 'drain',
            message: 'maintenance soon',
          }),
          updatedAtMs: 12,
        },
      ],
    });

    expect(manager.getSnapshot()).toEqual({
      mode: 'drain',
      message: 'maintenance soon',
      active: true,
      updatedAtMs: 12,
    });
    expect(listener).toHaveBeenLastCalledWith(manager.getSnapshot());
  });

  it('falls back to off for missing or invalid config', () => {
    const manager = new MaintenanceStateManager();

    manager.applyGameConfigSnapshot({
      gameConfigs: [
        {
          configKey: 'maintenance',
          configJson: '{"mode":"bad"}',
          updatedAtMs: 3,
        },
      ],
    });

    expect(manager.getSnapshot()).toMatchObject({
      mode: 'off',
      active: false,
      updatedAtMs: 3,
    });

    manager.applyGameConfigSnapshot({ gameConfigs: [] });

    expect(manager.getSnapshot()).toMatchObject({
      mode: 'off',
      active: false,
      updatedAtMs: 0,
    });
  });

  it('keeps active maintenance state when config disconnects', () => {
    const manager = new MaintenanceStateManager();

    manager.applyGameConfigSnapshot({
      connected: true,
      gameConfigs: [
        {
          configKey: 'maintenance',
          configJson: JSON.stringify({
            mode: 'locked',
            message: 'maintenance in progress',
          }),
          updatedAtMs: 8,
        },
      ],
    });
    manager.applyGameConfigSnapshot({
      connected: false,
      gameConfigs: [],
    });

    expect(manager.getSnapshot()).toMatchObject({
      mode: 'locked',
      active: true,
      updatedAtMs: 8,
    });
  });
});
