#!/usr/bin/env node
/* global console, process, setInterval */

import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scriptPath = fileURLToPath(import.meta.url);
const runtimeDir = join(rootDir, '.local-runtime');
const monitorPidPath = join(runtimeDir, 'monitor.pid');
const monitorLogPath = join(runtimeDir, 'monitor.log');
const statePath = join(runtimeDir, 'state.json');
const pollMs = 5000;
const services = [
  {
    key: 'vite',
    label: 'vite',
    port: 55173,
    logPath: join(runtimeDir, 'vite.log'),
    bootMs: 15000,
    restartCooldownMs: 5000,
    prepare: buildAssetAtlas,
    start: startVite,
  },
  {
    key: 'backend',
    label: 'backend',
    port: 3000,
    logPath: join(runtimeDir, 'backend.log'),
    bootMs: 10000,
    restartCooldownMs: 5000,
    start: startBackend,
  },
];

const command = process.argv[2] ?? 'start';

switch (command) {
  case 'start':
    startMonitor();
    break;
  case 'monitor':
    await runMonitor();
    break;
  case 'status':
    printStatus();
    break;
  case 'stop':
    stopMonitor();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    console.error('Usage: node scripts/local-runtime.js [start|status|stop]');
    process.exit(1);
}

function startMonitor() {
  ensureRuntimeDir();
  const monitorPid = getAliveMonitorPid();
  if (monitorPid) {
    console.log(`monitor up pid=${monitorPid}`);
    return;
  }

  const logFd = openSync(monitorLogPath, 'a');
  const child = spawn(process.execPath, [scriptPath, 'monitor'], {
    cwd: rootDir,
    detached: true,
    stdio: ['ignore', logFd, logFd],
  });
  closeSync(logFd);
  child.unref();
  writeFileSync(monitorPidPath, `${child.pid}\n`);
  console.log(`monitor start pid=${child.pid}`);
}

function stopMonitor() {
  ensureRuntimeDir();
  const monitorPid = getAliveMonitorPid();
  if (!monitorPid) {
    rmSync(monitorPidPath, { force: true });
    console.log('monitor down');
    return;
  }

  try {
    process.kill(monitorPid, 'SIGTERM');
  } catch {
    rmSync(monitorPidPath, { force: true });
    console.log('monitor down');
    return;
  }

  console.log(`monitor stop pid=${monitorPid}`);
}

function printStatus() {
  ensureRuntimeDir();
  const monitorPid = getAliveMonitorPid();
  const state = readState();

  console.log(`monitor: ${monitorPid ? `up pid=${monitorPid}` : 'down'}`);

  for (const service of services) {
    const pids = findListeningPids(service.port);
    const serviceState = state?.services?.[service.key] ?? null;
    const restartCount = serviceState?.restartCount ?? 0;
    const lastStartAt = serviceState?.lastStartAt ?? 'never';
    console.log(
      `${service.label}: ${pids.length > 0 ? `up port=${service.port} pids=${pids.join(',')}` : `down port=${service.port}`} restarts=${restartCount} lastStart=${lastStartAt}`,
    );
  }

  console.log(`logs: ${monitorLogPath}`);
}

async function runMonitor() {
  ensureRuntimeDir();
  writeFileSync(monitorPidPath, `${process.pid}\n`);

  const state = {
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    services: Object.fromEntries(
      services.map((service) => [
        service.key,
        {
          childPid: null,
          lastStartAt: null,
          lastExitAt: null,
          lastExitCode: null,
          restartCount: 0,
        },
      ]),
    ),
  };
  const runtime = new Map(
    services.map((service) => [
      service.key,
      {
        child: null,
        lastStartMs: 0,
      },
    ]),
  );

  let shuttingDown = false;
  let ticking = false;

  const shutdown = () => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    for (const service of services) {
      const serviceRuntime = runtime.get(service.key);
      killChild(serviceRuntime?.child);
      serviceRuntime.child = null;
    }
    state.updatedAt = new Date().toISOString();
    writeState(state);
    rmSync(monitorPidPath, { force: true });
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('SIGHUP', shutdown);
  process.on('uncaughtException', (error) => {
    console.error(error);
    shutdown();
  });
  process.on('unhandledRejection', (error) => {
    console.error(error);
    shutdown();
  });

  await tick();
  setInterval(() => {
    if (ticking || shuttingDown) {
      return;
    }
    void tick();
  }, pollMs);

  async function tick() {
    ticking = true;
    try {
      for (const service of services) {
        ensureService(service);
      }
      state.updatedAt = new Date().toISOString();
      writeState(state);
    } finally {
      ticking = false;
    }
  }

  function ensureService(service) {
    const serviceRuntime = runtime.get(service.key);
    const serviceState = state.services[service.key];
    const listeningPids = findListeningPids(service.port);

    if (listeningPids.length > 0) {
      return;
    }

    if (serviceRuntime.child && serviceRuntime.child.exitCode === null) {
      if (Date.now() - serviceRuntime.lastStartMs < service.bootMs) {
        return;
      }
      killChild(serviceRuntime.child);
      serviceRuntime.child = null;
    }

    if (Date.now() - serviceRuntime.lastStartMs < service.restartCooldownMs) {
      return;
    }

    if (service.prepare && !service.prepare(service)) {
      serviceRuntime.lastStartMs = Date.now();
      return;
    }

    const child = service.start(service);
    serviceRuntime.child = child;
    serviceRuntime.lastStartMs = Date.now();
    serviceState.childPid = child.pid;
    serviceState.lastStartAt = new Date(serviceRuntime.lastStartMs).toISOString();
    serviceState.restartCount += 1;
    writeState(state);

    child.on('exit', (code) => {
      if (serviceRuntime.child?.pid === child.pid) {
        serviceRuntime.child = null;
      }
      serviceState.childPid = null;
      serviceState.lastExitAt = new Date().toISOString();
      serviceState.lastExitCode = code;
      writeState(state);
    });

    child.on('error', (error) => {
      console.error(`${service.label} spawn failed`, error);
    });
  }

  await new Promise(() => {});
}

function buildAssetAtlas(service) {
  const result = runToLog(process.execPath, [join(rootDir, 'scripts', 'build-asset-atlas.js')], service.logPath);
  if (result.status === 0) {
    return true;
  }

  console.error(`atlas build failed status=${result.status ?? 'null'}`);
  return false;
}

function startVite(service) {
  return spawnToLog(join(rootDir, 'node_modules', '.bin', 'vite'), ['--host', '0.0.0.0', '--port', '55173', '--strictPort'], service.logPath);
}

function startBackend(service) {
  return spawnToLog('spacetime', ['start'], service.logPath, {
    env: withLocalBinPath(),
  });
}

function spawnToLog(commandName, args, logPath, extra = {}) {
  const logFd = openSync(logPath, 'a');
  const child = spawn(commandName, args, {
    cwd: rootDir,
    detached: true,
    env: extra.env ?? process.env,
    stdio: ['ignore', logFd, logFd],
  });
  closeSync(logFd);
  return child;
}

function runToLog(commandName, args, logPath) {
  const logFd = openSync(logPath, 'a');
  const result = spawnSync(commandName, args, {
    cwd: rootDir,
    stdio: ['ignore', logFd, logFd],
  });
  closeSync(logFd);
  return result;
}

function withLocalBinPath() {
  const homeDir = process.env.HOME;
  if (!homeDir) {
    return process.env;
  }

  return {
    ...process.env,
    PATH: `${homeDir}/.local/bin:${process.env.PATH ?? ''}`,
  };
}

function killChild(child) {
  if (!child || child.exitCode !== null) {
    return;
  }

  try {
    process.kill(-child.pid, 'SIGTERM');
    return;
  } catch {
    // Fall through.
  }

  try {
    child.kill('SIGTERM');
  } catch {
    // Ignore stop races.
  }
}

function findListeningPids(port) {
  const result = spawnSync('lsof', ['-tiTCP:' + String(port), '-sTCP:LISTEN'], {
    encoding: 'utf8',
  });

  if (result.status !== 0 && !result.stdout) {
    return [];
  }

  return result.stdout
    .split('\n')
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isInteger(value) && value > 0);
}

function getAliveMonitorPid() {
  if (!existsSync(monitorPidPath)) {
    return null;
  }

  const rawValue = readFileSync(monitorPidPath, 'utf8').trim();
  const pid = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(pid) || pid <= 0) {
    rmSync(monitorPidPath, { force: true });
    return null;
  }

  if (!isPidAlive(pid) || !isMonitorProcess(pid)) {
    rmSync(monitorPidPath, { force: true });
    return null;
  }

  return pid;
}

function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function isMonitorProcess(pid) {
  const result = spawnSync('ps', ['-p', String(pid), '-o', 'command='], {
    encoding: 'utf8',
  });
  return result.status === 0 && result.stdout.includes(scriptPath) && result.stdout.includes('monitor');
}

function readState() {
  if (!existsSync(statePath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(statePath, 'utf8'));
  } catch {
    return null;
  }
}

function writeState(state) {
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
}

function ensureRuntimeDir() {
  mkdirSync(runtimeDir, { recursive: true });
}
