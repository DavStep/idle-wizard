import { describe, expect, it, vi } from 'vitest';
import {
  canReuseMonitorPid,
  probeMonitorProcess,
  probePidAlive,
} from './local-runtime-process.js';

describe('local runtime process probes', () => {
  it('keeps an inaccessible live pid as unknown instead of deleting it', () => {
    const error = Object.assign(new Error('not permitted'), { code: 'EPERM' });
    const kill = vi.fn(() => {
      throw error;
    });

    expect(probePidAlive(123, { kill })).toBeNull();
    expect(canReuseMonitorPid(null, null)).toBe(true);
  });

  it('rejects a pid that is confirmed missing', () => {
    const error = Object.assign(new Error('missing'), { code: 'ESRCH' });
    const kill = vi.fn(() => {
      throw error;
    });

    expect(probePidAlive(123, { kill })).toBe(false);
    expect(canReuseMonitorPid(false, null)).toBe(false);
  });

  it('treats a sandbox-blocked process inspection as unknown', () => {
    const error = Object.assign(new Error('not permitted'), { code: 'EPERM' });
    const spawn = vi.fn(() => ({
      error,
      status: null,
      stdout: '',
    }));

    expect(probeMonitorProcess(123, '/repo/scripts/local-runtime.js', { spawn })).toBeNull();
  });

  it('confirms only the expected monitor command', () => {
    const scriptPath = '/repo/scripts/local-runtime.js';
    const matchingSpawn = vi.fn(() => ({
      error: undefined,
      status: 0,
      stdout: `node ${scriptPath} monitor\n`,
    }));
    const unrelatedSpawn = vi.fn(() => ({
      error: undefined,
      status: 0,
      stdout: 'node other-script.js\n',
    }));

    expect(probeMonitorProcess(123, scriptPath, { spawn: matchingSpawn })).toBe(true);
    expect(probeMonitorProcess(123, scriptPath, { spawn: unrelatedSpawn })).toBe(false);
    expect(canReuseMonitorPid(true, false)).toBe(false);
  });
});
