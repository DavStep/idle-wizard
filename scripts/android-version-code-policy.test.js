import { describe, expect, it } from 'vitest';

import {
  assertAndroidVersionUpgrade,
  assertApkVersionMatches,
  getAndroidVersionCode,
} from './android-version-code-policy.js';

describe('Android version code policy', () => {
  it('keeps a minor bump newer after patch versions pass 99', () => {
    expect(getAndroidVersionCode('0.2.104')).toBe(2_104);
    expect(getAndroidVersionCode('0.3.0')).toBe(3_000);
    expect(() => assertAndroidVersionUpgrade('0.2.104', '0.3.0')).not.toThrow();
  });

  it('rejects releases whose semantic version would lower the Android version code', () => {
    expect(() => assertAndroidVersionUpgrade('0.3.1', '0.3.0')).toThrow(
      /Android versionCode must increase/u,
    );
  });

  it('rejects minor and patch values that overflow their reserved digits', () => {
    expect(() => getAndroidVersionCode('0.1000.0')).toThrow(/at most 999/u);
    expect(() => getAndroidVersionCode('0.3.1000')).toThrow(/at most 999/u);
  });

  it('requires the built APK manifest to match the release version mapping', () => {
    expect(() =>
      assertApkVersionMatches({
        apkVersionCode: '3000',
        apkVersionName: '0.3.0',
        expectedVersion: '0.3.0',
      }),
    ).not.toThrow();

    expect(() =>
      assertApkVersionMatches({
        apkVersionCode: '300',
        apkVersionName: '0.3.0',
        expectedVersion: '0.3.0',
      }),
    ).toThrow(/Built APK version mismatch/u);
  });
});
