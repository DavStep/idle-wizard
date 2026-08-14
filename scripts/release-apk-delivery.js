/* global process */

export const DEFAULT_DISCORD_APK_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function resolveDiscordApkMaxUploadBytes(env = process.env) {
  const configuredValue = env.DISCORD_APK_MAX_UPLOAD_BYTES;
  if (configuredValue === undefined || configuredValue === '') {
    return DEFAULT_DISCORD_APK_MAX_UPLOAD_BYTES;
  }

  const parsedValue = Number(configuredValue);
  if (!Number.isSafeInteger(parsedValue) || parsedValue <= 0) {
    throw new Error('DISCORD_APK_MAX_UPLOAD_BYTES must be a positive integer.');
  }

  return parsedValue;
}

export function shouldHostApkInGithubRelease({ apkSize, env = process.env }) {
  if (!Number.isSafeInteger(apkSize) || apkSize < 0) {
    throw new Error('APK size must be a non-negative integer.');
  }

  return apkSize > resolveDiscordApkMaxUploadBytes(env);
}
