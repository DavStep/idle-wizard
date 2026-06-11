export function parseGameConfig(snapshot, configKey) {
  const config = snapshot?.gameConfigs?.find?.((row) => row?.configKey === configKey);

  if (!config?.configJson) {
    return null;
  }

  try {
    return JSON.parse(config.configJson);
  } catch {
    return null;
  }
}
