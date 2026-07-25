#!/usr/bin/env node
/* global console, process, setTimeout */

import { spawn, spawnSync } from 'node:child_process';
import { createConnection } from 'node:net';
import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  classifyExistingPreview,
  getPreviewRunPlan,
  waitForPreviewRelease,
} from './preview-level20-state.js';

import {
  createPreviewBackendTarget,
  createPreviewBuildEnvironment,
  createPreviewPublishPlan,
  prepareLevel20Preview,
} from './preview-level20-runtime.js';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = join(rootDir, 'tmp', 'level20-dist');
const backendLogPath = join(rootDir, 'tmp', 'level20-spacetimedb.log');
const frontendLogPath = join(rootDir, 'tmp', 'level20-preview.log');
const frontendPidPath = join(rootDir, 'tmp', 'level20-preview.pid');
const frontendPort = readPortArgument(process.argv.slice(2), 55175);
const backendPort = 3000;
const host = '127.0.0.1';
const backendTarget = createPreviewBackendTarget(frontendPort, {
  host,
  backendPort,
});
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const viteCommand = join(
  rootDir,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'vite.cmd' : 'vite',
);
const url = `http://${host}:${frontendPort}/?devLevel=20`;

if (process.argv.includes('--stop')) {
  const stopped = await stopFrontend();
  process.exit(stopped ? 0 : 1);
}

const existingPreviewState = await getExistingPreviewState();
const previewRunPlan = getPreviewRunPlan(existingPreviewState);

if (!previewRunPlan.rebuildAssets) {
  console.error(`Port ${frontendPort} is already in use. Run npm run preview:level20:stop first.`);
  process.exit(1);
}

try {
  await prepareLevel20Preview({
    isBackendListening: checkBackendListening,
    startBackend,
    publishBackend: publishPreviewBackend,
    buildAssets: buildIsolatedDevAssets,
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

if (!previewRunPlan.startFrontend) {
  console.log(`level 20 preview rebuilt: ${url}`);
  console.log(`isolated assets: ${outputDir}`);
  console.log(`preview log: ${frontendLogPath}`);
  process.exit(0);
}

console.log(`level 20 preview: ${url}`);
console.log(`isolated assets: ${outputDir}`);
console.log(`isolated database: ${backendTarget.databaseName}`);

mkdirSync(dirname(frontendLogPath), { recursive: true });
const frontendLogFd = openSync(frontendLogPath, 'a');
const frontend = spawn(
  viteCommand,
  [
    'preview',
    '--outDir',
    outputDir,
    '--host',
    host,
    '--port',
    String(frontendPort),
    '--strictPort',
  ],
  {
    cwd: rootDir,
    detached: true,
    stdio: ['ignore', frontendLogFd, frontendLogFd],
  },
);
closeSync(frontendLogFd);
frontend.unref();
writeFileSync(frontendPidPath, `${frontend.pid}\n`);

for (let attempt = 0; attempt < 40; attempt += 1) {
  await delay(250);

  if (await isPortListening(frontendPort)) {
    console.log(`preview ready: pid=${frontend.pid}`);
    console.log(`preview log: ${frontendLogPath}`);
    process.exit(0);
  }
}

rmSync(frontendPidPath, { force: true });
console.error(`Preview did not start; inspect ${frontendLogPath}`);
process.exit(1);

function readPortArgument(args, fallback) {
  const portIndex = args.indexOf('--port');

  if (portIndex < 0) {
    return fallback;
  }

  const port = Number(args[portIndex + 1]);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error(`Invalid --port value: ${args[portIndex + 1] ?? ''}`);
    process.exit(1);
  }

  return port;
}

async function checkBackendListening() {
  const listening = await isPortListening(backendPort);

  if (listening) {
    console.log(`SpacetimeDB ready: http://${host}:${backendPort}`);
  }

  return listening;
}

async function startBackend() {
  mkdirSync(dirname(backendLogPath), { recursive: true });
  const logFd = openSync(backendLogPath, 'a');
  const backend = spawn(npmCommand, ['run', 'stdb:start'], {
    cwd: rootDir,
    detached: true,
    stdio: ['ignore', logFd, logFd],
  });
  closeSync(logFd);
  backend.unref();
  console.log(`Starting SpacetimeDB; log: ${backendLogPath}`);

  for (let attempt = 0; attempt < 40; attempt += 1) {
    await delay(250);

    if (await isPortListening(backendPort)) {
      console.log(`SpacetimeDB ready: http://${host}:${backendPort}`);
      return;
    }
  }

  throw new Error(`SpacetimeDB did not start; inspect ${backendLogPath}`);
}

function publishPreviewBackend() {
  const publishPlan = createPreviewPublishPlan(backendTarget);
  console.log(`Publishing isolated database: ${backendTarget.databaseName}`);
  const result = spawnSync(publishPlan.command, publishPlan.args, {
    cwd: rootDir,
    stdio: 'inherit',
  });

  assertSuccessfulCommand(result, 'SpacetimeDB publish failed');
}

function buildIsolatedDevAssets() {
  const result = spawnSync(
    npmCommand,
    [
      'run',
      'build:dev',
      '--',
      '--outDir',
      outputDir,
      '--emptyOutDir',
    ],
    {
      cwd: rootDir,
      env: createPreviewBuildEnvironment(process.env, backendTarget),
      stdio: 'inherit',
    },
  );

  assertSuccessfulCommand(result, 'Level 20 asset build failed');
}

function assertSuccessfulCommand(result, failureMessage) {
  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${failureMessage} (exit ${result.status ?? 1})`);
  }
}

function isPortListening(port) {
  return new Promise((resolveListening) => {
    const socket = createConnection({ host, port });
    const done = (listening) => {
      socket.destroy();
      resolveListening(listening);
    };

    socket.setTimeout(500);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

async function getExistingPreviewState() {
  const portListening = await isPortListening(frontendPort);
  const pid = readFrontendPid();
  return classifyExistingPreview({
    portListening,
    recordedProcessRunning: isProcessRunning(pid),
  });
}

function readFrontendPid() {
  try {
    const pid = Number(readFileSync(frontendPidPath, 'utf8').trim());
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

function isProcessRunning(pid) {
  if (pid === null) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === 'EPERM';
  }
}

async function stopFrontend() {
  const pid = readFrontendPid();

  if (pid === null) {
    rmSync(frontendPidPath, { force: true });
    if (await isPortListening(frontendPort)) {
      console.error(`Port ${frontendPort} is in use by an unrecorded process.`);
      return false;
    }

    console.log('level 20 preview is not running');
    return true;
  }

  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    rmSync(frontendPidPath, { force: true });
    if (await isPortListening(frontendPort)) {
      console.error(`Port ${frontendPort} is still in use after the recorded preview exited.`);
      return false;
    }

    console.log('level 20 preview is not running');
    return true;
  }

  const released = await waitForPreviewRelease({
    isListening: () => isPortListening(frontendPort),
    wait: () => delay(100),
    maxAttempts: 50,
  });

  if (!released) {
    console.error(`Preview process ${pid} did not release port ${frontendPort}.`);
    return false;
  }

  rmSync(frontendPidPath, { force: true });
  console.log(`level 20 preview stopped: pid=${pid}`);
  return true;
}
