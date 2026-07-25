#!/usr/bin/env node
/* global console, process */

import { spawnSync } from 'node:child_process';
import {
  readdir,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TEXT_ASSET_EXTENSIONS = new Set([
  '.atlas',
  '.css',
  '.html',
  '.js',
  '.json',
  '.map',
  '.mjs',
  '.txt',
]);

export function getAndroidAssetName(fileName) {
  if (!/\.png$/iu.test(fileName)) {
    throw new Error(`Android web asset optimizer requires a PNG: ${fileName}`);
  }
  return fileName.replace(/\.png$/iu, '.webp');
}

export function rewriteAndroidAssetReferences(content, replacements) {
  let rewritten = content;
  for (const [sourceName, outputName] of replacements) {
    rewritten = rewritten.replaceAll(sourceName, outputName);
  }
  return rewritten;
}

export async function optimizeAndroidWebAssets({
  distDir = path.resolve('dist'),
  cwebpPath = 'cwebp',
  runCommand = spawnSync,
} = {}) {
  const assetsDir = path.join(distDir, 'assets');
  const assetEntries = await readdir(assetsDir, { withFileTypes: true });
  const pngNames = assetEntries
    .filter((entry) => entry.isFile() && /\.png$/iu.test(entry.name))
    .map((entry) => entry.name)
    .sort();

  if (pngNames.length === 0) {
    return {
      converted: 0,
      sourceBytes: 0,
      outputBytes: 0,
    };
  }

  const replacements = pngNames.map((sourceName) => [
    sourceName,
    getAndroidAssetName(sourceName),
  ]);
  let sourceBytes = 0;
  let outputBytes = 0;

  for (const [sourceName, outputName] of replacements) {
    const sourcePath = path.join(assetsDir, sourceName);
    const outputPath = path.join(assetsDir, outputName);
    const temporaryPath = `${outputPath}.tmp`;
    sourceBytes += (await stat(sourcePath)).size;

    const result = runCommand(
      cwebpPath,
      [
        '-quiet',
        '-q',
        '90',
        '-alpha_q',
        '100',
        '-m',
        '6',
        sourcePath,
        '-o',
        temporaryPath,
      ],
      {
        encoding: 'utf8',
      },
    );
    if (result.status !== 0) {
      throw new Error(
        `cwebp failed for ${sourceName}: `
          + (result.stderr || result.stdout || `exit ${result.status}`),
      );
    }

    await rename(temporaryPath, outputPath);
    outputBytes += (await stat(outputPath)).size;
  }

  const textFiles = await collectTextFiles(distDir);
  const staleReferences = [];
  for (const filePath of textFiles) {
    const content = await readFile(filePath, 'utf8');
    const rewritten = rewriteAndroidAssetReferences(content, replacements);
    if (rewritten !== content) {
      await writeFile(filePath, rewritten);
    }
    for (const [sourceName] of replacements) {
      if (rewritten.includes(sourceName)) {
        staleReferences.push(
          `${sourceName} in ${path.relative(distDir, filePath)}`,
        );
      }
    }
  }

  if (staleReferences.length > 0) {
    throw new Error(
      `Android asset rewrite left stale references:\n${staleReferences.join('\n')}`,
    );
  }

  await Promise.all(
    pngNames.map((sourceName) => unlink(path.join(assetsDir, sourceName))),
  );

  return {
    converted: pngNames.length,
    sourceBytes,
    outputBytes,
  };
}

async function collectTextFiles(rootDir) {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(rootDir, entry.name);
      if (entry.isDirectory()) {
        return collectTextFiles(entryPath);
      }
      return entry.isFile()
        && TEXT_ASSET_EXTENSIONS.has(path.extname(entry.name))
        ? [entryPath]
        : [];
    }),
  );
  return nested.flat();
}

async function run() {
  const result = await optimizeAndroidWebAssets();
  const savedBytes = result.sourceBytes - result.outputBytes;
  console.log(
    `Optimized ${result.converted} Android PNG assets to WebP `
      + `(${formatBytes(result.sourceBytes)} -> `
      + `${formatBytes(result.outputBytes)}, `
      + `${formatBytes(savedBytes)} saved).`,
  );
}

function formatBytes(bytes) {
  const megabytes = bytes / (1024 * 1024);
  return `${megabytes.toFixed(1)} MB`;
}

const isMain =
  process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  run().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
