/* global process */

import path from 'node:path';

export const DEBUG_RELEASE_APK_MODE = 'debug-release';
export const DEFAULT_RELEASE_APK_MODE = DEBUG_RELEASE_APK_MODE;
export const RELEASE_SIGNING_KEYS = [
  'IDLE_WIZARD_RELEASE_STORE_FILE',
  'IDLE_WIZARD_RELEASE_STORE_PASSWORD',
  'IDLE_WIZARD_RELEASE_KEY_ALIAS',
  'IDLE_WIZARD_RELEASE_KEY_PASSWORD',
];

const DEBUG_APK_NAME_PATTERN = /(?:^|[-_])debug(?:signed)?(?:[-_.]|$)/i;

export function resolveReleaseApkMode({ optionApk, env = process.env } = {}) {
  return optionApk || env.RELEASE_APK || DEFAULT_RELEASE_APK_MODE;
}

export function isDebugApkAllowed({ options = {}, env = process.env } = {}) {
  return Boolean(options['allow-debug-apk'] || env.RELEASE_ALLOW_DEBUG_APK === '1');
}

export function hasReleaseSigningConfig({
  env = process.env,
  gradleProperties = {},
} = {}) {
  return RELEASE_SIGNING_KEYS.every((key) =>
    Boolean(getReleaseSigningValue(key, { env, gradleProperties })),
  );
}

export function getReleaseSigningValue(key, { env = process.env, gradleProperties = {} } = {}) {
  return (
    env[key] ??
    env[`ORG_GRADLE_PROJECT_${key}`] ??
    gradleProperties[key] ??
    ''
  ).toString().trim();
}

export function assertReleaseApkIsUploadable(
  apkPath,
  { allowDebugApk = false } = {},
) {
  const fileName = path.basename(apkPath ?? '');

  if (/unsigned/i.test(fileName)) {
    throw new Error(
      [
        `Refusing to release unsigned APK: ${fileName}.`,
        'Configure the Idle Wizard release keystore before running player release:',
        'IDLE_WIZARD_RELEASE_STORE_FILE, IDLE_WIZARD_RELEASE_STORE_PASSWORD,',
        'IDLE_WIZARD_RELEASE_KEY_ALIAS, and IDLE_WIZARD_RELEASE_KEY_PASSWORD.',
      ].join(' '),
    );
  }

  if (!allowDebugApk && DEBUG_APK_NAME_PATTERN.test(fileName)) {
    throw new Error(
      [
        `Refusing to release debug-signed APK: ${fileName}.`,
        'Google account linking requires the distributed APK signature to match',
        'the OAuth-registered Android certificate. Use a signed release APK, or',
        'set RELEASE_ALLOW_DEBUG_APK=1 only for internal testing.',
      ].join(' '),
    );
  }
}
