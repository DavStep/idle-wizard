import { Buffer } from 'node:buffer';
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';

import {
  deleteUiEditorAsset,
  inspectUiEditorAsset,
  inspectUiEditorAssetUsage,
  saveUiEditorNineSlice,
} from './ui-editor-nine-slice-plugin.mjs';

test('saves validated nine-slice metadata beside a PNG source asset', async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'idle-wizard-9slice-'));
  const assetDir = path.join(
    rootDir,
    'assets/game/source/ui/root-run-cost-button',
  );
  const assetPath = path.join(assetDir, 'green-button-short.9.png');

  await mkdir(assetDir, { recursive: true });
  await writeFile(assetPath, createPngHeader(281, 169));

  const result = await saveUiEditorNineSlice(
    {
      assetId:
        'source:assets/ui/root-run-cost-button/green-button-short.9.png',
      slice: {
        left: 85,
        top: 100,
        right: 43,
        bottom: 68,
      },
    },
    { rootDir },
  );
  const metadata = JSON.parse(
    await readFile(
      path.join(assetDir, 'green-button-short.9.9slice.json'),
      'utf8',
    ),
  );

  expect(
    result.metadataPath,
  ).toBe(
    'assets/game/source/ui/root-run-cost-button/green-button-short.9.9slice.json',
  );
  expect(metadata.slice).toEqual({
    left: 85,
    top: 100,
    right: 43,
    bottom: 68,
  });
  expect(metadata.asset).toBe('green-button-short.9.png');
  expect(metadata.source.width).toBe(281);
  expect(metadata.source.height).toBe(169);
  expect(metadata.rendering.outputInsets).toEqual({
    left: 85,
    top: 100,
    right: 43,
    bottom: 68,
  });
  expect(metadata.rendering.minimumSize).toEqual({
    width: 129,
    height: 169,
  });
  expect(metadata.editor.sourceAssetPreserved).toBe(true);
});

test('promotes an ordinary PNG to .9.png and updates its references', async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'idle-wizard-9slice-'));
  const assetDir = path.join(rootDir, 'assets/game/source/ui');
  const sourceDir = path.join(rootDir, 'src');

  await mkdir(assetDir, { recursive: true });
  await mkdir(sourceDir, { recursive: true });
  await writeFile(path.join(assetDir, 'panel.png'), createPngHeader(40, 20));
  await writeFile(
    path.join(sourceDir, 'panel.js'),
    'const panel = "source:assets/ui/panel.png";\n',
  );

  const result = await saveUiEditorNineSlice(
    {
      assetId: 'source:assets/ui/panel.png',
      slice: { left: 8, top: 4, right: 8, bottom: 4 },
    },
    { rootDir },
  );
  const source = await readFile(path.join(sourceDir, 'panel.js'), 'utf8');
  const metadata = JSON.parse(
    await readFile(path.join(assetDir, 'panel.9.9slice.json'), 'utf8'),
  );

  expect(result.assetId).toBe('source:assets/ui/panel.9.png');
  expect(result.renamedFromAssetId).toBe('source:assets/ui/panel.png');
  expect(result.changedFiles).toEqual(['src/panel.js']);
  expect(source).toContain('source:assets/ui/panel.9.png');
  expect(metadata.asset).toBe('panel.9.png');
  await expect(access(path.join(assetDir, 'panel.png'))).rejects.toThrow();
  await expect(access(path.join(assetDir, 'panel.9.png'))).resolves.toBeUndefined();
});

test('rejects slice margins that consume the stretchable center', async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'idle-wizard-9slice-'));
  const assetDir = path.join(rootDir, 'assets/game/source/ui');

  await mkdir(assetDir, { recursive: true });
  await writeFile(path.join(assetDir, 'panel.png'), createPngHeader(20, 10));

  await expect(
    saveUiEditorNineSlice(
      {
        assetId: 'source:assets/ui/panel.png',
        slice: {
          left: 10,
          top: 2,
          right: 10,
          bottom: 2,
        },
      },
      { rootDir },
    ),
  ).rejects.toThrow(/leave at least one stretchable source pixel/);
});

test('rejects paths outside the source asset root', async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'idle-wizard-9slice-'));

  await expect(
    saveUiEditorNineSlice(
      {
        assetId: 'source:assets/../../package.json',
        slice: {
          left: 1,
          top: 1,
          right: 1,
          bottom: 1,
        },
      },
      { rootDir },
    ),
  ).rejects.toThrow(/outside the asset root/);
});

test('finds source asset references with exact file and line context', async () => {
  const rootDir = await createAssetDeletionFixture();

  const result = await inspectUiEditorAsset(
    {
      assetId: 'source:assets/ui/old-button.png',
    },
    { rootDir },
  );

  expect(result.assetPath).toBe(
    'assets/game/source/ui/old-button.png',
  );
  expect(result.sidecarPath).toBe(
    'assets/game/source/ui/old-button.9slice.json',
  );
  expect(result.references).toEqual([
    expect.objectContaining({
      column: 17,
      line: 1,
      occurrences: 1,
      path: 'docs/assets.md',
    }),
    expect.objectContaining({
      line: 1,
      occurrences: 1,
      path: 'src/button.js',
    }),
    expect.objectContaining({
      line: 2,
      occurrences: 1,
      path: 'src/button.js',
    }),
  ]);
});

test('finds unused source assets in one catalogue inspection', async () => {
  const rootDir = await createAssetDeletionFixture();

  const result = await inspectUiEditorAssetUsage(
    {
      assetIds: [
        'source:assets/ui/old-button.png',
        'source:assets/ui/new-button.png',
      ],
    },
    { rootDir },
  );

  expect(result.unusedAssetIds).toEqual([
    'source:assets/ui/new-button.png',
  ]);
});

test('replaces reviewed references and deletes the source asset and sidecar', async () => {
  const rootDir = await createAssetDeletionFixture();

  const result = await deleteUiEditorAsset(
    {
      assetId: 'source:assets/ui/old-button.png',
      replacementAssetId: 'source:assets/ui/new-button.png',
    },
    { rootDir },
  );
  const source = await readFile(
    path.join(rootDir, 'src/button.js'),
    'utf8',
  );
  const docs = await readFile(
    path.join(rootDir, 'docs/assets.md'),
    'utf8',
  );

  expect(source).toContain(
    'assets/game/source/ui/new-button.png',
  );
  expect(source).toContain(
    'source:assets/ui/new-button.png',
  );
  expect(docs).toContain('/ui/new-button.png');
  expect(result.referencesUpdated).toBe(3);
  expect(result.deletedPaths).toEqual([
    'assets/game/source/ui/old-button.png',
    'assets/game/source/ui/old-button.9slice.json',
  ]);
  await expect(
    access(
      path.join(rootDir, 'assets/game/source/ui/old-button.png'),
    ),
  ).rejects.toThrow();
  await expect(
    access(
      path.join(rootDir, 'assets/game/source/ui/new-button.png'),
    ),
  ).resolves.toBeUndefined();
});

test('requires a replacement while a source asset is still referenced', async () => {
  const rootDir = await createAssetDeletionFixture();

  await expect(
    deleteUiEditorAsset(
      {
        assetId: 'source:assets/ui/old-button.png',
      },
      { rootDir },
    ),
  ).rejects.toThrow(/Choose a replacement/);

  await expect(
    access(
      path.join(rootDir, 'assets/game/source/ui/old-button.png'),
    ),
  ).resolves.toBeUndefined();
});

async function createAssetDeletionFixture() {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'idle-wizard-assets-'));
  const assetDir = path.join(rootDir, 'assets/game/source/ui');

  await mkdir(assetDir, { recursive: true });
  await mkdir(path.join(rootDir, 'docs'), { recursive: true });
  await mkdir(path.join(rootDir, 'src'), { recursive: true });
  await writeFile(
    path.join(assetDir, 'old-button.png'),
    createPngHeader(40, 20),
  );
  await writeFile(
    path.join(assetDir, 'old-button.9slice.json'),
    '{}\n',
  );
  await writeFile(
    path.join(assetDir, 'new-button.png'),
    createPngHeader(40, 20),
  );
  await writeFile(
    path.join(assetDir, 'new-button.9slice.json'),
    '{}\n',
  );
  await writeFile(
    path.join(rootDir, 'src/button.js'),
    [
      'const url = "../../../../assets/game/source/ui/old-button.png";',
      'const id = "source:assets/ui/old-button.png";',
      '',
    ].join('\n'),
  );
  await writeFile(
    path.join(rootDir, 'docs/assets.md'),
    'Runtime alias: `/ui/old-button.png`\n',
  );

  return rootDir;
}

function createPngHeader(width, height) {
  const bytes = Buffer.alloc(24);

  Buffer.from([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
  ]).copy(bytes);
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return bytes;
}
