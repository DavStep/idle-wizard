import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_OTA_MANIFEST_URL,
  verifyPublishedOta,
  waitForPublishedOta,
} from './verify-published-ota.mjs';

const VERSION = '0.3.52';
const BUNDLE_URL =
  'https://davstep.github.io/idle-wizard/ota/bundles/idle-wizard-0.3.52.zip';
const BUNDLE = Buffer.from('valid OTA bundle fixture');
const CHECKSUM = createHash('sha256').update(BUNDLE).digest('hex');

function createManifest(overrides = {}) {
  return {
    schemaVersion: 1,
    appId: 'com.idlewizard.game',
    version: VERSION,
    deployVersion: 'release-fixture',
    minimumNativeVersion: '0.3.49',
    platforms: ['android'],
    bundleUrl: BUNDLE_URL,
    checksum: CHECKSUM,
    size: BUNDLE.byteLength,
    ...overrides,
  };
}

function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
  };
}

function bundleResponse(body = BUNDLE, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    arrayBuffer: vi.fn().mockResolvedValue(body),
  };
}

describe('published Android OTA release verification', () => {
  it('verifies the exact release manifest and checksum-bound bundle', async () => {
    const fetchRef = vi.fn()
      .mockResolvedValueOnce(jsonResponse(createManifest()))
      .mockResolvedValueOnce(bundleResponse());

    await expect(verifyPublishedOta({
      expectedVersion: VERSION,
      fetchRef,
      now: () => 123,
    })).resolves.toEqual({
      bundleUrl: BUNDLE_URL,
      checksum: CHECKSUM,
      size: BUNDLE.byteLength,
      version: VERSION,
    });

    expect(fetchRef.mock.calls).toEqual([
      [`${DEFAULT_OTA_MANIFEST_URL}?_=123`, { cache: 'no-store' }],
      [BUNDLE_URL, { cache: 'no-store' }],
    ]);
  });

  it('rejects a stale manifest before downloading its bundle', async () => {
    const fetchRef = vi.fn().mockResolvedValue(
      jsonResponse(createManifest({ version: '0.3.51' })),
    );

    await expect(verifyPublishedOta({
      expectedVersion: VERSION,
      fetchRef,
    })).rejects.toThrow(`does not describe Android release ${VERSION}`);

    expect(fetchRef).toHaveBeenCalledOnce();
  });

  it('rejects bundle bytes that do not match the published checksum', async () => {
    const badBundle = Buffer.from('corrupted OTA bundle fixture');
    const fetchRef = vi.fn()
      .mockResolvedValueOnce(jsonResponse(createManifest({ size: badBundle.byteLength })))
      .mockResolvedValueOnce(bundleResponse(badBundle));

    await expect(verifyPublishedOta({
      expectedVersion: VERSION,
      fetchRef,
    })).rejects.toThrow('OTA bundle checksum mismatch');
  });

  it('retries CDN propagation before accepting the current release', async () => {
    const fetchRef = vi.fn()
      .mockResolvedValueOnce(jsonResponse(createManifest({ version: '0.3.51' })))
      .mockResolvedValueOnce(jsonResponse(createManifest()))
      .mockResolvedValueOnce(bundleResponse());
    const delay = vi.fn().mockResolvedValue();

    await expect(waitForPublishedOta({
      expectedVersion: VERSION,
      attempts: 2,
      retryDelayMs: 1,
      delay,
      fetchRef,
    })).resolves.toMatchObject({ version: VERSION });

    expect(delay).toHaveBeenCalledOnce();
  });
});
