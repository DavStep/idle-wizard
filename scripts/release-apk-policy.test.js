import { describe, expect, it } from 'vitest';

import {
  assertReleaseApkIsUploadable,
  hasReleaseSigningConfig,
  isDebugApkAllowed,
  resolveReleaseApkMode,
} from './release-apk-policy.js';

describe('release APK policy', () => {
  it('defaults player releases to the account-compatible debug release APK', () => {
    expect(resolveReleaseApkMode({ env: {} })).toBe('debug-release');
  });

  it('allows explicit internal debug APK releases only when requested', () => {
    expect(isDebugApkAllowed({ env: {} })).toBe(false);
    expect(isDebugApkAllowed({ env: { RELEASE_ALLOW_DEBUG_APK: '1' } })).toBe(true);
    expect(isDebugApkAllowed({ options: { 'allow-debug-apk': true }, env: {} })).toBe(true);
  });

  it('requires all release signing values from env or Gradle properties', () => {
    expect(hasReleaseSigningConfig({ env: {}, gradleProperties: {} })).toBe(false);
    expect(hasReleaseSigningConfig({
      env: {
        IDLE_WIZARD_RELEASE_STORE_FILE: '/keys/idle-wizard.jks',
        IDLE_WIZARD_RELEASE_STORE_PASSWORD: 'store',
      },
      gradleProperties: {
        IDLE_WIZARD_RELEASE_KEY_ALIAS: 'idle-wizard',
        IDLE_WIZARD_RELEASE_KEY_PASSWORD: 'key',
      },
    })).toBe(true);
  });

  it('rejects unsigned and debug-signed player APKs', () => {
    expect(() =>
      assertReleaseApkIsUploadable('android/app/build/outputs/apk/release/app-release-unsigned.apk'),
    ).toThrow(/unsigned APK/u);

    expect(() =>
      assertReleaseApkIsUploadable('android/app/build/outputs/apk/debug/app-debug.apk'),
    ).toThrow(/debug-signed APK/u);

    expect(() =>
      assertReleaseApkIsUploadable('android/app/build/outputs/apk/release/idle-wizard-0.2.79-release-debugsigned.apk'),
    ).toThrow(/debug-signed APK/u);
  });

  it('allows debug-signed APK names when the selected release mode owns that signing choice', () => {
    expect(() =>
      assertReleaseApkIsUploadable('tmp/idle-wizard-0.2.80-debug-release.apk', {
        allowDebugApk: true,
      }),
    ).not.toThrow();
  });

  it('accepts signed release APK names', () => {
    expect(() =>
      assertReleaseApkIsUploadable('android/app/build/outputs/apk/release/idle-wizard-0.2.80-release.apk'),
    ).not.toThrow();
  });
});
