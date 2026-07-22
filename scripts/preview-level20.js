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

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = join(rootDir, 'tmp', 'level20-dist');
const backendLogPath = join(rootDir, 'tmp', 'level20-spacetimedb.log');
const frontendLogPath = join(rootDir, 'tmp', 'level20-preview.log');
const frontendPidPath = join(rootDir, 'tmp', 'level20-preview.pid');
const frontendPort = readPortArgument(process.argv.slice(2), 55175);
const backendPort = 3000;
const host = '127.0.0.1';
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const viteCommand = join(
  rootDir,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'vite.cmd' : 'vite',
);

if (process.argv.includes('--stop')) {
  stopFrontend();
  process.exit(0);
}

await ensureBackend();

if (await isPortListening(frontendPort)) {
  console.error(`Port ${frontendPort} is already in use. Run npm run preview:level20:stop first.`);
  process.exit(1);
}

buildIsolatedDevAssets();

const url = `http://${host}:${frontendPort}/?devLevel=20`;
console.log(`level 20 preview: ${url}`);
console.log(`isolated assets: ${outputDir}`);

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

async function ensureBackend() {
  if (await isPortListening(backendPort)) {
    console.log(`SpacetimeDB ready: http://${host}:${backendPort}`);
    return;
  }

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

  console.error(`SpacetimeDB did not start; inspect ${backendLogPath}`);
  process.exit(1);
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
      stdio: 'inherit',
    },
  );

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
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

function stopFrontend() {
  let pid;

  try {
    pid = Number(readFileSync(frontendPidPath, 'utf8').trim());
  } catch {
    console.log('level 20 preview is not running');
    return;
  }

  if (!Number.isInteger(pid) || pid < 1) {
    rmSync(frontendPidPath, { force: true });
    console.log('level 20 preview is not running');
    return;
  }

  try {
    process.kill(pid, 'SIGTERM');
    console.log(`level 20 preview stopped: pid=${pid}`);
  } catch {
    console.log('level 20 preview is not running');
  }

  rmSync(frontendPidPath, { force: true });
}
