import { describe, expect, it } from 'vitest';

import {
  classifyExistingPreview,
  getPreviewRunPlan,
  waitForPreviewRelease,
} from './preview-level20-state.js';

describe('classifyExistingPreview', () => {
  it('reuses a listening preview whose recorded process is still running', () => {
    expect(classifyExistingPreview({
      portListening: true,
      recordedProcessRunning: true,
    })).toBe('managed');
  });

  it('rejects a listening port not owned by the recorded preview process', () => {
    expect(classifyExistingPreview({
      portListening: true,
      recordedProcessRunning: false,
    })).toBe('occupied');
  });

  it('rebuilds assets without starting another managed preview process', () => {
    expect(getPreviewRunPlan('managed')).toEqual({
      rebuildAssets: true,
      startFrontend: false,
    });
  });

  it('waits for the preview listener to release before completing stop', async () => {
    const listeningStates = [true, true, false];
    const waits = [];

    await expect(waitForPreviewRelease({
      isListening: async () => listeningStates.shift() ?? false,
      wait: async () => waits.push('waited'),
      maxAttempts: 4,
    })).resolves.toBe(true);

    expect(waits).toEqual(['waited', 'waited']);
  });
});
