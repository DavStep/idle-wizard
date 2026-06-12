import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { defineConfig } from 'vite';

const deployVersion = createDeployVersion();

export default defineConfig({
  plugins: [deployVersionPlugin()],
  define: {
    'import.meta.env.VITE_DEPLOY_VERSION': JSON.stringify(deployVersion),
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
  const source = `${JSON.stringify({ version: deployVersion }, null, 2)}\n`;

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
