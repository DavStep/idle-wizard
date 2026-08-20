import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { captureReleaseTreeState } from './release-tree-state.js';

const tempDirectories = [];

afterEach(async () => {
  await Promise.all(
    tempDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe('release tree state', () => {
  it('detects tracked and untracked changes after a release gate starts', async () => {
    const rootDir = await mkdtemp(path.join(tmpdir(), 'idle-wizard-release-tree-'));
    tempDirectories.push(rootDir);
    runGit(rootDir, ['init']);
    runGit(rootDir, ['config', 'user.email', 'release-test@example.com']);
    runGit(rootDir, ['config', 'user.name', 'Release Test']);
    await writeFile(path.join(rootDir, 'tracked.txt'), 'initial\n');
    runGit(rootDir, ['add', 'tracked.txt']);
    runGit(rootDir, ['commit', '-m', 'initial']);

    const cleanState = await captureReleaseTreeState(rootDir);
    await writeFile(path.join(rootDir, 'tracked.txt'), 'changed\n');
    const trackedChangeState = await captureReleaseTreeState(rootDir);
    await writeFile(path.join(rootDir, 'untracked.txt'), 'new\n');
    const untrackedChangeState = await captureReleaseTreeState(rootDir);

    expect(trackedChangeState).not.toBe(cleanState);
    expect(untrackedChangeState).not.toBe(trackedChangeState);
    expect(await captureReleaseTreeState(rootDir)).toBe(untrackedChangeState);
  });
});

function runGit(rootDir, args) {
  execFileSync('git', args, { cwd: rootDir, stdio: 'ignore' });
}
