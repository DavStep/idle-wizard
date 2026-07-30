import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  getAndroidAssetName,
  optimizeAndroidWebAssets,
  rewriteAndroidAssetReferences,
} from './optimize-android-web-assets.js';

describe('Android web asset optimization', () => {
  it('keeps Android packaging outside the shared web dist directory', async () => {
    const packageInfo = JSON.parse(
      await readFile(new URL('../package.json', import.meta.url), 'utf8'),
    );
    const capacitorConfig = JSON.parse(
      await readFile(new URL('../capacitor.config.json', import.meta.url), 'utf8'),
    );

    expect(capacitorConfig.webDir).toBe('tmp/android-dist');
    expect(packageInfo.scripts['mobile:sync:prod']).toContain(
      '--outDir=tmp/android-dist',
    );
    expect(packageInfo.scripts['mobile:sync:prod']).toContain(
      'optimize-android-web-assets.js tmp/android-dist',
    );
  });

  it('keeps hashed asset names stable while changing the image format', () => {
    expect(getAndroidAssetName('game-atlas-C4ZOzYXU.png')).toBe(
      'game-atlas-C4ZOzYXU.webp',
    );
    expect(() => getAndroidAssetName('game.js')).toThrow(/requires a PNG/u);
  });

  it('rewrites emitted references without touching unrelated public PNGs', () => {
    const content = [
      'const atlas = "/assets/game-atlas-a1.png";',
      'const icon = "/assets/icon-b2.png";',
      'const publicAsset = "/spine/pointer.png";',
    ].join('\n');

    expect(
      rewriteAndroidAssetReferences(content, [
        ['game-atlas-a1.png', 'game-atlas-a1.webp'],
        ['icon-b2.png', 'icon-b2.webp'],
      ]),
    ).toBe(
      [
        'const atlas = "/assets/game-atlas-a1.webp";',
        'const icon = "/assets/icon-b2.webp";',
        'const publicAsset = "/spine/pointer.png";',
      ].join('\n'),
    );
  });

  it('allows overlapping optimizers to finish without sharing temporary files', async () => {
    const distDir = await mkdtemp(
      path.join(tmpdir(), 'idle-wizard-android-assets-'),
    );
    const assetsDir = path.join(distDir, 'assets');
    await mkdir(assetsDir);
    await writeFile(path.join(assetsDir, 'icon-a1.png'), 'png');
    await writeFile(
      path.join(distDir, 'index.js'),
      'const icon = "/assets/icon-a1.png";',
    );
    const runCommand = (_command, args) => {
      writeFileSync(args.at(-1), 'webp');
      return { status: 0, stderr: '', stdout: '' };
    };

    try {
      const results = await Promise.allSettled([
        optimizeAndroidWebAssets({ distDir, runCommand }),
        optimizeAndroidWebAssets({ distDir, runCommand }),
      ]);
      expect(results).toEqual([
        expect.objectContaining({ status: 'fulfilled' }),
        expect.objectContaining({ status: 'fulfilled' }),
      ]);
      await expect(
        readFile(path.join(distDir, 'index.js'), 'utf8'),
      ).resolves.toContain('icon-a1.webp');
    } finally {
      await rm(distDir, { recursive: true, force: true });
    }
  });
});
