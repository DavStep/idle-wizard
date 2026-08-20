import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export async function captureReleaseTreeState(rootDir) {
  const trackedDiff = captureGit(rootDir, [
    'diff',
    '--binary',
    '--no-ext-diff',
    'HEAD',
    '--',
    '.',
  ]);
  const untrackedPaths = captureGit(rootDir, [
    'ls-files',
    '--others',
    '--exclude-standard',
    '-z',
  ])
    .split('\0')
    .filter(Boolean)
    .sort();
  const hash = createHash('sha256');
  hash.update(trackedDiff);

  for (const relativePath of untrackedPaths) {
    hash.update('\0untracked\0');
    hash.update(relativePath);
    hash.update('\0');
    hash.update(await readFile(path.join(rootDir, relativePath)));
  }

  return hash.digest('hex');
}

function captureGit(rootDir, args) {
  const result = spawnSync('git', args, {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed:\n${result.stderr}`);
  }

  return result.stdout;
}
