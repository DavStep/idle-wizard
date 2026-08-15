#!/usr/bin/env node
/* global console, process */

import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout } from 'node:timers';
import { pathToFileURL, URL } from 'node:url';

export const DEFAULT_OTA_MANIFEST_URL =
  'https://davstep.github.io/idle-wizard/ota/latest.json';

const APP_ID = 'com.idlewizard.game';
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/u;
const CHECKSUM_PATTERN = /^[a-f0-9]{64}$/iu;

export async function verifyPublishedOta({
  expectedVersion,
  fetchRef = globalThis.fetch?.bind(globalThis),
  manifestUrl = DEFAULT_OTA_MANIFEST_URL,
  now = () => Date.now(),
} = {}) {
  assertVersion(expectedVersion, 'expected release version');
  if (!fetchRef) {
    throw new Error('Published OTA verification requires fetch.');
  }

  const manifestRequestUrl = new URL(manifestUrl);
  manifestRequestUrl.searchParams.set('_', String(now()));
  const manifestResponse = await fetchRef(manifestRequestUrl.toString(), {
    cache: 'no-store',
  });
  if (!manifestResponse.ok) {
    throw new Error(`OTA manifest returned HTTP ${manifestResponse.status}.`);
  }

  const manifest = await manifestResponse.json();
  assertManifest({ expectedVersion, manifest, manifestUrl });

  const bundleResponse = await fetchRef(manifest.bundleUrl, { cache: 'no-store' });
  if (!bundleResponse.ok) {
    throw new Error(`OTA bundle returned HTTP ${bundleResponse.status}.`);
  }

  const bundle = Buffer.from(await bundleResponse.arrayBuffer());
  const checksum = createHash('sha256').update(bundle).digest('hex');
  if (bundle.byteLength !== manifest.size) {
    throw new Error(
      `OTA bundle size mismatch: expected ${manifest.size}, received ${bundle.byteLength}.`,
    );
  }
  if (checksum !== manifest.checksum.toLowerCase()) {
    throw new Error(
      `OTA bundle checksum mismatch: expected ${manifest.checksum}, received ${checksum}.`,
    );
  }

  return {
    bundleUrl: manifest.bundleUrl,
    checksum,
    size: bundle.byteLength,
    version: manifest.version,
  };
}

export async function waitForPublishedOta({
  expectedVersion,
  attempts = 6,
  delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  retryDelayMs = 5_000,
  log = () => {},
  ...options
} = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await verifyPublishedOta({ expectedVersion, ...options });
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        log(`OTA ${expectedVersion} is not ready yet (${error.message}); retrying.`);
        await delay(retryDelayMs);
      }
    }
  }

  throw new Error(
    `Published OTA verification failed for ${expectedVersion}: ${lastError?.message ?? 'unknown error'}`,
  );
}

function assertManifest({ expectedVersion, manifest, manifestUrl }) {
  if (
    !manifest
    || manifest.schemaVersion !== 1
    || manifest.appId !== APP_ID
    || manifest.version !== expectedVersion
    || !VERSION_PATTERN.test(manifest.minimumNativeVersion ?? '')
    || !Array.isArray(manifest.platforms)
    || !manifest.platforms.includes('android')
    || !CHECKSUM_PATTERN.test(manifest.checksum ?? '')
    || !Number.isSafeInteger(manifest.size)
    || manifest.size <= 0
  ) {
    throw new Error(`OTA manifest does not describe Android release ${expectedVersion}.`);
  }

  if (compareVersions(manifest.minimumNativeVersion, expectedVersion) > 0) {
    throw new Error(
      `OTA minimum native version ${manifest.minimumNativeVersion} exceeds release ${expectedVersion}.`,
    );
  }

  const expectedBundleUrl = new URL(
    `./bundles/idle-wizard-${expectedVersion}.zip`,
    manifestUrl,
  ).toString();
  if (manifest.bundleUrl !== expectedBundleUrl) {
    throw new Error(
      `OTA bundle URL mismatch: expected ${expectedBundleUrl}, received ${manifest.bundleUrl}.`,
    );
  }
}

function compareVersions(left, right) {
  const leftParts = left.split('.').map(Number);
  const rightParts = right.split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] !== rightParts[index]) {
      return leftParts[index] < rightParts[index] ? -1 : 1;
    }
  }
  return 0;
}

function assertVersion(value, label) {
  if (!VERSION_PATTERN.test(value ?? '')) {
    throw new Error(`Invalid ${label}: ${value ?? '(missing)'}`);
  }
}

if (pathToFileURL(process.argv[1]).href === import.meta.url) {
  const packageInfo = JSON.parse(
    await readFile(path.resolve(process.cwd(), 'package.json'), 'utf8'),
  );
  const result = await waitForPublishedOta({
    expectedVersion: packageInfo.version,
    log: (message) => console.log(message),
  });
  console.log(
    `Published OTA ${result.version} verified (${result.size} bytes, ${result.checksum}).`,
  );
}
