import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { defineConfig, loadEnv } from 'vite';

const deployVersion = createDeployVersion();
const clientReleaseVersion = createClientReleaseVersion();

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const uiEditorEnabled =
    mode === 'development' && env.VITE_ENABLE_UI_EDITOR === 'true';

  return {
    plugins: [deployVersionPlugin(), uiEditorSavePlugin({ enabled: uiEditorEnabled })],
    define: {
      'import.meta.env.VITE_DEPLOY_VERSION': JSON.stringify(deployVersion),
      'import.meta.env.VITE_CLIENT_RELEASE_VERSION': JSON.stringify(clientReleaseVersion),
    },
    server: {
      host: '0.0.0.0',
      port: 55173,
      strictPort: true,
    },
    preview: {
      host: '0.0.0.0',
      port: 55174,
      strictPort: true,
    },
  };
});

function createDeployVersion() {
  const explicitVersion = process.env.VITE_DEPLOY_VERSION?.trim();

  if (explicitVersion) {
    return explicitVersion;
  }

  const gitSha = readGitSha();
  const stamp = new Date().toISOString();

  return gitSha ? `${gitSha}-${stamp}` : stamp;
}

function createClientReleaseVersion() {
  const explicitVersion = process.env.VITE_CLIENT_RELEASE_VERSION?.trim();

  if (explicitVersion) {
    return explicitVersion;
  }

  return readPackageVersion();
}

function readPackageVersion() {
  try {
    const packageJson = JSON.parse(
      readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
    );
    const version = typeof packageJson.version === 'string' ? packageJson.version.trim() : '';

    return version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function readGitSha() {
  try {
    return execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function deployVersionPlugin() {
  const source = `${JSON.stringify(
    { version: deployVersion, releaseVersion: clientReleaseVersion },
    null,
    2,
  )}\n`;

  return {
    name: 'idle-wizard-deploy-version',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split('?')[0] !== '/deploy-version.json') {
          next();
          return;
        }

        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        response.setHeader('Cache-Control', 'no-store');
        response.end(source);
      });
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'deploy-version.json',
        source,
      });
    },
  };
}

function uiEditorSavePlugin({ enabled }) {
  const endpoint = '/__idle-wizard-ui-editor/save';
  const outputUrl = new URL(
    './src/dev/uiEditor/ui-layout-overrides.json',
    import.meta.url,
  );

  return {
    name: 'idle-wizard-ui-editor-save',
    configureServer(server) {
      if (!enabled) {
        return;
      }

      server.middlewares.use((request, response, next) => {
        if (request.url?.split('?')[0] !== endpoint) {
          next();
          return;
        }

        if (request.method !== 'POST') {
          sendJson(response, 405, { error: 'Method not allowed.' });
          return;
        }

        readJsonBody(request)
          .then((payload) => {
            const layout = normalizeUiEditorLayout(payload);
            writeFileSync(outputUrl, `${JSON.stringify(layout, null, 2)}\n`, 'utf8');
            sendJson(response, 200, {
              ok: true,
              message: 'layout saved to src/dev/uiEditor/ui-layout-overrides.json',
            });
          })
          .catch((error) => {
            sendJson(response, 400, { error: error.message });
          });
      });
    },
  };
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let source = '';

    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      source += chunk;

      if (source.length > 1_000_000) {
        reject(new Error('UI editor layout is too large.'));
        request.destroy();
      }
    });
    request.on('end', () => {
      try {
        resolve(JSON.parse(source));
      } catch {
        reject(new Error('UI editor layout must be valid JSON.'));
      }
    });
    request.on('error', reject);
  });
}

function normalizeUiEditorLayout(payload) {
  if (payload?.version !== 1 || !isPlainObject(payload.elements)) {
    throw new Error('UI editor layout must contain version 1 and an elements object.');
  }

  const entries = Object.entries(payload.elements);

  if (entries.length > 2_000) {
    throw new Error('UI editor layout contains too many elements.');
  }

  const elements = {};

  for (const [selector, rawOverride] of entries) {
    if (!selector || selector.length > 600 || !isPlainObject(rawOverride)) {
      throw new Error('UI editor layout contains an invalid selector or override.');
    }

    const override = {};

    for (const field of ['offsetX', 'offsetY', 'width', 'height', 'opacity']) {
      if (!(field in rawOverride)) {
        continue;
      }

      const value = Number(rawOverride[field]);

      if (!Number.isFinite(value) || Math.abs(value) > 100_000) {
        throw new Error(`UI editor field ${field} must be a bounded number.`);
      }

      override[field] = field === 'opacity'
        ? Math.max(0, Math.min(1, value))
        : Math.round(value * 100) / 100;
    }

    if ('asset' in rawOverride) {
      if (typeof rawOverride.asset !== 'string' || rawOverride.asset.length > 1_000) {
        throw new Error('UI editor asset paths must be short strings.');
      }

      if (rawOverride.asset.trim()) {
        override.asset = rawOverride.asset.trim();
      }
    }

    elements[selector] = override;
  }

  return { version: 1, elements };
}

function isPlainObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(payload));
}
