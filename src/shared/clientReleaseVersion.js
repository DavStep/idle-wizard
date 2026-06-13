const DEFAULT_CLIENT_RELEASE_VERSION = '0.0.0';

export function getClientReleaseVersion() {
  const version = import.meta.env.VITE_CLIENT_RELEASE_VERSION;

  if (typeof version !== 'string') {
    return DEFAULT_CLIENT_RELEASE_VERSION;
  }

  const normalizedVersion = version.trim();
  return normalizedVersion || DEFAULT_CLIENT_RELEASE_VERSION;
}
