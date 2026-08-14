import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { buildOtaBundle } from './build-ota-bundle.mjs';

const temporaryRoots = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe('buildOtaBundle', () => {
  it('publishes a checksum-bound manifest beside the Android web bundle', async () => {
    const rootDir = await mkdtemp(path.join(tmpdir(), 'idle-wizard-ota-test-'));
    temporaryRoots.push(rootDir);
    await mkdir(path.join(rootDir, 'tmp/ota-dist'), { recursive: true });
    await writeFile(
      path.join(rootDir, 'package.json'),
      JSON.stringify({ version: '0.3.49' }),
    );
    await writeFile(
      path.join(rootDir, 'ota.config.json'),
      JSON.stringify({
        schemaVersion: 1,
        appId: 'com.idlewizard.game',
        minimumNativeVersion: '0.3.48',
        platforms: ['android'],
        manifestUrl: 'https://davstep.github.io/idle-wizard/ota/latest.json',
      }),
    );
    await writeFile(path.join(rootDir, 'tmp/ota-dist/index.html'), '<main></main>');
    await writeFile(
      path.join(rootDir, 'tmp/ota-dist/deploy-version.json'),
      JSON.stringify({ version: 'build-123', releaseVersion: '0.3.49' }),
    );

    const result = await buildOtaBundle({
      rootDir,
      zip: async ({ outputPath }) => writeFile(outputPath, 'zip payload'),
    });
    const manifest = JSON.parse(await readFile(result.manifestPath, 'utf8'));

    expect(manifest).toMatchObject({
      schemaVersion: 1,
      appId: 'com.idlewizard.game',
      version: '0.3.49',
      deployVersion: 'build-123',
      minimumNativeVersion: '0.3.48',
      platforms: ['android'],
      bundleUrl:
        'https://davstep.github.io/idle-wizard/ota/bundles/idle-wizard-0.3.49.zip',
      size: 11,
    });
    expect(manifest.checksum).toMatch(/^[a-f0-9]{64}$/);
    await expect(readFile(result.bundlePath, 'utf8')).resolves.toBe('zip payload');
  });
});
