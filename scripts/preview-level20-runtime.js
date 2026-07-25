const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_BACKEND_PORT = 3000;

export function createPreviewBackendTarget(
  frontendPort,
  {
    host = DEFAULT_HOST,
    backendPort = DEFAULT_BACKEND_PORT,
  } = {},
) {
  return {
    databaseName: `idle-wizard-level20-${frontendPort}`,
    httpUri: `http://${host}:${backendPort}`,
    websocketUri: `ws://${host}:${backendPort}`,
  };
}

export function createPreviewBuildEnvironment(baseEnvironment, target) {
  return {
    ...baseEnvironment,
    VITE_SPACETIME_URI: target.websocketUri,
    VITE_SPACETIME_DATABASE: target.databaseName,
  };
}

export function createPreviewPublishPlan(
  target,
  { modulePath = './spacetimedb' } = {},
) {
  return {
    command: 'spacetime',
    args: [
      'publish',
      target.databaseName,
      '--server',
      target.httpUri,
      '--module-path',
      modulePath,
      '--delete-data=always',
      '--yes=all',
      '--no-config',
    ],
  };
}

export async function prepareLevel20Preview({
  isBackendListening,
  startBackend,
  publishBackend,
  buildAssets,
}) {
  if (!(await isBackendListening())) {
    await startBackend();
  }

  await publishBackend();
  await buildAssets();
}
