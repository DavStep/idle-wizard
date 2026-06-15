#!/usr/bin/env node
/* global console, process */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const rootDir = process.cwd();
const options = parseOptions(process.argv.slice(2));

await loadEnvFile('.env.local');
await loadEnvFile('.env');

const packageInfo = JSON.parse(await readFile(path.join(rootDir, 'package.json'), 'utf8'));
const commitMessage = options.message || process.env.RELEASE_COMMIT_MESSAGE || `release: ${packageInfo.version}`;
const apkMode = options.apk || process.env.RELEASE_APK || 'prod-debug';
const backendMode = options.backend || process.env.RELEASE_BACKEND || 'auto';
const skipDiscord = Boolean(options['skip-discord']);
const skipGit = Boolean(options['skip-git']);

if (!skipDiscord && !(process.env.DISCORD_APK_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL)) {
  fail('Missing DISCORD_APK_WEBHOOK_URL. Add it to .env.local before release.');
}

const branch = capture('git', ['branch', '--show-current']).trim();
if (!skipGit && branch !== 'main' && !options['allow-non-main']) {
  fail(`Release push deploys GitHub Pages only from main. Current branch: ${branch || '(detached)'}`);
}

const apkPath = resolveApkPlan(apkMode);

step('lint');
run('npm', ['run', 'lint']);

step('test');
run('npm', ['test']);

step('web production build');
run('npm', ['run', 'build', '--', '--base=/idle-wizard/']);

step(`android ${apkPath.label}`);
if (apkPath.buildScript) {
  run('npm', ['run', apkPath.buildScript]);
}

if (shouldPublishBackend(backendMode)) {
  step('spacetimedb maincloud publish');
  run('npm', ['run', 'stdb:publish:maincloud'], { input: 'y\n' });
}

if (!skipGit) {
  step('git commit');
  run('git', ['add', '-A']);
  const staged = capture('git', ['status', '--porcelain']).trim();
  if (staged) {
    run('git', ['commit', '-m', commitMessage]);
  } else {
    console.log('No git changes to commit.');
  }

  step('git push');
  run('git', ['push', 'origin', branch]);
}

if (!skipDiscord) {
  step('discord player changelog + apk upload');
  run('node', ['scripts/post-apk-discord.js', apkPath.path]);
}

console.log('Release complete.');

function resolveApkPlan(mode) {
  if (mode.endsWith('.apk') || mode.includes('/')) {
    return {
      label: 'custom APK',
      path: mode,
      buildScript: null,
    };
  }

  if (mode === 'prod-debug') {
    return {
      label: 'production debug-signed APK',
      path: 'android/app/build/outputs/apk/debug/app-debug.apk',
      buildScript: 'android:assembleProdDebug',
    };
  }

  if (mode === 'release') {
    return {
      label: 'release APK',
      path: 'android/app/build/outputs/apk/release/app-release-unsigned.apk',
      buildScript: 'android:assembleRelease',
    };
  }

  fail(`Unknown APK mode: ${mode}. Use prod-debug, release, or path/to/file.apk.`);
}

function shouldPublishBackend(mode) {
  if (mode === 'skip') {
    return false;
  }

  if (mode === 'always') {
    return true;
  }

  if (mode !== 'auto') {
    fail(`Unknown backend mode: ${mode}. Use auto, always, or skip.`);
  }

  return Boolean(capture('git', ['status', '--porcelain', '--', 'spacetimedb']).trim());
}

function parseOptions(rawArgs) {
  const parsed = {};

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (!arg.startsWith('--')) {
      fail(`Unknown argument: ${arg}`);
    }

    const [rawKey, inlineValue] = arg.slice(2).split('=', 2);
    if (inlineValue !== undefined) {
      parsed[rawKey] = inlineValue;
      continue;
    }

    if (['message', 'apk', 'backend'].includes(rawKey)) {
      index += 1;
      if (!rawArgs[index]) {
        fail(`Missing value for --${rawKey}`);
      }
      parsed[rawKey] = rawArgs[index];
      continue;
    }

    parsed[rawKey] = true;
  }

  return parsed;
}

async function loadEnvFile(fileName) {
  const filePath = path.join(rootDir, fileName);
  if (!existsSync(filePath)) {
    return;
  }

  const content = await readFile(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = stripEnvQuotes(rawValue);
  }
}

function stripEnvQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"'))
    || (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function step(label) {
  console.log(`\n==> ${label}`);
}

function run(command, args, { input } = {}) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    env: process.env,
    input,
    stdio: input === undefined ? 'inherit' : ['pipe', 'inherit', 'inherit'],
  });

  if (result.error) {
    fail(result.error.message);
  }

  if (result.status !== 0) {
    fail(`${command} ${args.join(' ')} failed with exit ${result.status}.`);
  }
}

function capture(command, args) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    env: process.env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.error) {
    fail(result.error.message);
  }

  if (result.status !== 0) {
    fail(`${command} ${args.join(' ')} failed:\n${result.stderr}`);
  }

  return result.stdout;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
