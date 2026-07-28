import { describe, expect, it, vi } from 'vitest';
import {
  REQUIRED_RELEASE_WORKFLOWS,
  waitForReleaseWorkflows,
} from './release-github-actions.js';

describe('release GitHub Actions gate', () => {
  it('waits for every required workflow on the release commit', async () => {
    const commitSha = '1234567890abcdef';
    const listWorkflowRuns = vi.fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ databaseId: 101, headSha: commitSha }])
      .mockResolvedValueOnce([{ databaseId: 202, headSha: commitSha }]);
    const watchWorkflowRun = vi.fn().mockResolvedValue();
    const delay = vi.fn().mockResolvedValue();

    await waitForReleaseWorkflows({
      commitSha,
      listWorkflowRuns,
      watchWorkflowRun,
      pollIntervalMs: 1,
      maxLookupAttempts: 2,
      delay,
    });

    expect(listWorkflowRuns.mock.calls).toEqual([
      [REQUIRED_RELEASE_WORKFLOWS[0], commitSha],
      [REQUIRED_RELEASE_WORKFLOWS[0], commitSha],
      [REQUIRED_RELEASE_WORKFLOWS[1], commitSha],
    ]);
    expect(watchWorkflowRun.mock.calls).toEqual([
      [101, REQUIRED_RELEASE_WORKFLOWS[0]],
      [202, REQUIRED_RELEASE_WORKFLOWS[1]],
    ]);
    expect(delay).toHaveBeenCalledOnce();
  });

  it('does not watch later workflows when a required workflow fails', async () => {
    const commitSha = 'abcdef1234567890';
    const listWorkflowRuns = vi.fn()
      .mockResolvedValue([{ databaseId: 303, headSha: commitSha }]);
    const watchWorkflowRun = vi.fn().mockRejectedValue(new Error('Checks failed'));

    await expect(waitForReleaseWorkflows({
      commitSha,
      listWorkflowRuns,
      watchWorkflowRun,
    })).rejects.toThrow('Checks failed');

    expect(listWorkflowRuns).toHaveBeenCalledOnce();
    expect(watchWorkflowRun).toHaveBeenCalledOnce();
  });

  it('fails when a required workflow never appears for the release commit', async () => {
    const delay = vi.fn().mockResolvedValue();

    await expect(waitForReleaseWorkflows({
      commitSha: 'fedcba0987654321',
      listWorkflowRuns: vi.fn().mockResolvedValue([]),
      watchWorkflowRun: vi.fn(),
      maxLookupAttempts: 2,
      pollIntervalMs: 1,
      delay,
    })).rejects.toThrow('Checks did not appear');

    expect(delay).toHaveBeenCalledOnce();
  });
});
