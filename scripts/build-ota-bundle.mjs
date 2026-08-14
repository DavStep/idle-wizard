#!/usr/bin/env node
/* global console, process */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  copyFile,
  mkdtemp,
  mkdir,
  readFile,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL, URL } from 'node:url';

const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

export async function buildOtaBundle({
  rootDir = process.cwd(),
  sourceDir = 'tmp/ota-dist',
  publishDir = 'dist',
  zip = createZip,
} = {}) {
  const packageInfo = await readJson(path.join(rootDir, 'package.json'));
  const config = await readJson(path.join(rootDir, 'ota.config.json'));
  const version = normalizeVersion(packageInfo.version, 'package version');
  const minimumNativeVersion = normalizeVersion(
    config.minimumNativeVersion,
    'minimum native version',
  );
  const absoluteSourceDir = path.resolve(rootDir, sourceDir);
  const absolutePublishDir = path.resolve(rootDir, publishDir);
  const indexPath = path.join(absoluteSourceDir, 'index.html');
  const deployVersionPath = path.join(absoluteSourceDir, 'deploy-version.json');

  await assertFile(indexPath, 'OTA source index.html');
  const deployVersion = await readJson(deployVersionPath);
  if (typeof deployVersion.version !== 'string' || !deployVersion.version.trim()) {
    throw new Error('OTA deploy-version.json is missing its build version.');
  }

  const temporaryDir = await mkdtemp(path.join(tmpdir(), 'idle-wizard-ota-'));
  const temporaryZip = path.join(temporaryDir, `idle-wizard-${version}.zip`);
  const bundleRelativePath = `bundles/idle-wizard-${version}.zip`;
  const otaPublishDir = path.join(absolutePublishDir, 'ota');
  const bundlePublishPath = path.join(otaPublishDir, bundleRelativePath);

  try {
    await zip({ sourceDir: absoluteSourceDir, outputPath: temporaryZip });
    const archive = await readFile(temporaryZip);
    const checksum = createHash('sha256').update(archive).digest('hex');
    const manifestUrl = new URL(config.manifestUrl);
    const bundleUrl = new URL(bundleRelativePath, manifestUrl).toString();

    await mkdir(path.dirname(bundlePublishPath), { recursive: true });
    await copyFile(temporaryZip, bundlePublishPath);
    await writeFile(
      path.join(otaPublishDir, 'latest.json'),
      `${JSON.stringify(
        {
          schemaVersion: config.schemaVersion,
          appId: config.appId,
          version,
          deployVersion: deployVersion.version,
          minimumNativeVersion,
          platforms: config.platforms,
          bundleUrl,
          checksum,
          size: archive.byteLength,
        },
        null,
        2,
      )}\n`,
    );

    return {
      bundlePath: bundlePublishPath,
      checksum,
      manifestPath: path.join(otaPublishDir, 'latest.json'),
      version,
    };
  } finally {
    await rm(temporaryDir, { recursive: true, force: true });
  }
}

function createZip({ sourceDir, outputPath }) {
  execFileSync('zip', ['-q', '-r', outputPath, '.'], {
    cwd: sourceDir,
    stdio: 'inherit',
  });
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function assertFile(filePath, label) {
  try {
    if ((await stat(filePath)).isFile()) {
      return;
    }
  } catch {
    // The focused error below gives the caller the missing build prerequisite.
  }
  throw new Error(`${label} is missing at ${filePath}.`);
}

function normalizeVersion(value, label) {
  const version = typeof value === 'string' ? value.trim() : '';
  if (!VERSION_PATTERN.test(version)) {
    throw new Error(`Invalid ${label}: ${value ?? '(missing)'}`);
  }
  return version;
}

if (pathToFileURL(process.argv[1]).href === import.meta.url) {
  const result = await buildOtaBundle(parseOptions(process.argv.slice(2)));
  console.log(`OTA ${result.version} ready: ${result.manifestPath}`);
}

function parseOptions(args) {
  const options = {};
  for (const argument of args) {
    if (argument.startsWith('--source=')) {
      options.sourceDir = argument.slice('--source='.length);
    } else if (argument.startsWith('--publish=')) {
      options.publishDir = argument.slice('--publish='.length);
    } else {
      throw new Error(`Unknown OTA bundle option: ${argument}`);
    }
  }
  return options;
}
