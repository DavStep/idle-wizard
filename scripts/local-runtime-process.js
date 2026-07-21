import { spawnSync } from 'node:child_process';
import process from 'node:process';

export function probePidAlive(pid, { kill = process.kill } = {}) {
  try {
    kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === 'EPERM' ? null : false;
  }
}

export function probeMonitorProcess(
  pid,
  scriptPath,
  { spawn = spawnSync } = {},
) {
  const result = spawn('ps', ['-p', String(pid), '-o', 'command='], {
    encoding: 'utf8',
  });

  if (result.error?.code === 'EPERM') {
    return null;
  }

  return (
    result.status === 0 &&
    result.stdout.includes(scriptPath) &&
    result.stdout.includes('monitor')
  );
}

export function canReuseMonitorPid(pidAlive, monitorProcess) {
  return pidAlive !== false && monitorProcess !== false;
}
