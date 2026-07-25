const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/u;
const MAX_MINOR_OR_PATCH = 999;

export function getAndroidVersionCode(version) {
  const match = VERSION_PATTERN.exec(version);
  if (!match) {
    throw new Error(`Android releases require an x.y.z version, received: ${version}`);
  }

  const [, major, minor, patch] = match.map(Number);
  if (minor > MAX_MINOR_OR_PATCH || patch > MAX_MINOR_OR_PATCH) {
    throw new Error(
      `Android release version minor and patch values must be at most ${MAX_MINOR_OR_PATCH}: ${version}`,
    );
  }

  return (major * 1_000_000) + (minor * 1_000) + patch;
}

export function assertAndroidVersionUpgrade(previousVersion, nextVersion) {
  if (!previousVersion || previousVersion === nextVersion) {
    return;
  }

  const previousCode = getAndroidVersionCode(previousVersion);
  const nextCode = getAndroidVersionCode(nextVersion);
  if (nextCode <= previousCode) {
    throw new Error(
      [
        `Android versionCode must increase: ${previousVersion} (${previousCode})`,
        `cannot be followed by ${nextVersion} (${nextCode}).`,
      ].join(' '),
    );
  }
}

export function assertApkVersionMatches({
  apkVersionCode,
  apkVersionName,
  expectedVersion,
}) {
  const expectedVersionCode = getAndroidVersionCode(expectedVersion);
  if (
    Number(apkVersionCode) !== expectedVersionCode
    || apkVersionName !== expectedVersion
  ) {
    throw new Error(
      [
        `Built APK version mismatch: expected ${expectedVersion}`,
        `(versionCode ${expectedVersionCode}), received ${apkVersionName}`,
        `(versionCode ${apkVersionCode}).`,
      ].join(' '),
    );
  }
}
