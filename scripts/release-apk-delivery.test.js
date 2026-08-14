import { describe, expect, it } from 'vitest';

import {
  DEFAULT_DISCORD_APK_MAX_UPLOAD_BYTES,
  resolveDiscordApkMaxUploadBytes,
  shouldHostApkInGithubRelease,
} from './release-apk-delivery.js';

describe('release APK delivery policy', () => {
  it('keeps APKs within the default Discord limit as attachments', () => {
    expect(shouldHostApkInGithubRelease({
      apkSize: DEFAULT_DISCORD_APK_MAX_UPLOAD_BYTES,
      env: {},
    })).toBe(false);
  });

  it('hosts oversized APKs in a GitHub Release', () => {
    expect(shouldHostApkInGithubRelease({
      apkSize: DEFAULT_DISCORD_APK_MAX_UPLOAD_BYTES + 1,
      env: {},
    })).toBe(true);
  });

  it('supports a channel-specific attachment limit', () => {
    expect(resolveDiscordApkMaxUploadBytes({
      DISCORD_APK_MAX_UPLOAD_BYTES: '25000000',
    })).toBe(25_000_000);
  });

  it('rejects invalid attachment limits and APK sizes', () => {
    expect(() => resolveDiscordApkMaxUploadBytes({
      DISCORD_APK_MAX_UPLOAD_BYTES: 'large',
    })).toThrow(/positive integer/u);
    expect(() => shouldHostApkInGithubRelease({ apkSize: -1, env: {} }))
      .toThrow(/non-negative integer/u);
  });
});
