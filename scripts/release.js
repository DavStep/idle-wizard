#!/usr/bin/env node
/* global console, process */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import {
  DEFAULT_PLAYER_CHANGELOG_FILE,
  loadFeatureAnnouncement,
  loadPlayerChangelog,
} from './player-changelog.js';
import {
  assertReleaseApkIsUploadable,
  DEBUG_RELEASE_APK_MODE,
  hasReleaseSigningConfig,
  isDebugApkAllowed,
  resolveReleaseApkMode,
} from './release-apk-policy.js';

const rootDir = process.cwd();
const options = parseOptions(process.argv.slice(2));

await loadEnvFile('.env.local');
await loadEnvFile('.env');
await loadEnvFile('.env.production', { overrideKeys: /^VITE_/ });
await loadEnvFile('.env.production.local', { overrideKeys: /^VITE_/ });

const apkMode = resolveReleaseApkMode({ optionApk: options.apk, env: process.env });
const allowDebugApk = isDebugApkAllowed({ options, env: process.env });
const backendMode = options.backend || process.env.RELEASE_BACKEND || 'auto';
const versionBump = resolveVersionBump();
const skipDiscord = Boolean(options['skip-discord']);
const skipGit = Boolean(options['skip-git']);
const gradleProperties = await loadGradleProperties();

if (apkMode === 'release' && !hasReleaseSigningConfig({ env: process.env, gradleProperties })) {
  fail(
    [
      'Missing Idle Wizard release signing configuration.',
      'Set IDLE_WIZARD_RELEASE_STORE_FILE, IDLE_WIZARD_RELEASE_STORE_PASSWORD,',
      'IDLE_WIZARD_RELEASE_KEY_ALIAS, and IDLE_WIZARD_RELEASE_KEY_PASSWORD in the',
      'environment or Gradle properties before running a player release.',
    ].join(' '),
  );
}

if (!skipDiscord && !(process.env.DISCORD_APK_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL)) {
  fail('Missing DISCORD_APK_WEBHOOK_URL. Add it to .env.local before release.');
}

const branch = capture('git', ['branch', '--show-current']).trim();
if (!skipGit && branch !== 'main' && !options['allow-non-main']) {
  fail(`Release push deploys GitHub Pages only from main. Current branch: ${branch || '(detached)'}`);
}

if (versionBump) {
  await bumpPackageVersion(versionBump);
}

const packageInfo = await readPackageInfo();
const commitMessage = options.message || process.env.RELEASE_COMMIT_MESSAGE || `release: ${packageInfo.version}`;
const apkPlan = resolveApkPlan(apkMode, packageInfo.version);

if (!skipDiscord) {
  await preflightDiscordNotes(packageInfo.version);
}

step('lint');
run('npm', ['run', 'lint']);

step('test');
run('npm', ['test']);

step('web production build');
run('npm', ['run', 'build', '--', '--base=/idle-wizard/']);

step(`android ${apkPlan.label}`);
if (apkPlan.buildScript) {
  run('npm', ['run', apkPlan.buildScript]);
}
const apkPath = apkPlan.signWithDebugKeystore
  ? await signReleaseApkWithDebugKey(apkPlan, packageInfo.version)
  : resolveBuiltApkPath(apkPlan);
try {
  assertReleaseApkIsUploadable(apkPath, {
    allowDebugApk: allowDebugApk || apkPlan.allowDebugApk,
  });
} catch (error) {
  fail(error.message);
}

if (shouldPublishBackend(backendMode)) {
  step('spacetimedb maincloud publish');
  run('npm', ['run', 'stdb:publish:maincloud'], { input: 'y\ny\n' });
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
  run('node', ['scripts/post-apk-discord.js', apkPath]);
}

console.log('Release complete.');

function resolveApkPlan(mode, version) {
  if (mode.endsWith('.apk') || mode.includes('/')) {
    return {
      label: 'custom APK',
      pathCandidates: [mode],
      buildScript: null,
    };
  }

  if (mode === DEBUG_RELEASE_APK_MODE) {
    return {
      label: 'account-compatible debug-signed release APK',
      pathCandidates: [`tmp/idle-wizard-${version}-debug-release.apk`],
      unsignedPathCandidates: [
        `android/app/build/outputs/apk/release/idle-wizard-${version}-release-unsigned.apk`,
        'android/app/build/outputs/apk/release/app-release-unsigned.apk',
      ],
      buildScript: 'android:assembleRelease',
      signWithDebugKeystore: true,
      allowDebugApk: true,
    };
  }

  if (mode === 'prod-debug') {
    return {
      label: 'legacy production debug-signed APK',
      pathCandidates: ['android/app/build/outputs/apk/debug/app-debug.apk'],
      buildScript: 'android:assembleProdDebug',
      allowDebugApk: true,
    };
  }

  if (mode === 'release') {
    return {
      label: 'release APK',
      pathCandidates: [
        `android/app/build/outputs/apk/release/idle-wizard-${version}-release.apk`,
        `android/app/build/outputs/apk/release/idle-wizard-${version}-release-unsigned.apk`,
        'android/app/build/outputs/apk/release/app-release.apk',
        'android/app/build/outputs/apk/release/app-release-unsigned.apk',
      ],
      buildScript: 'android:assembleRelease',
    };
  }

  fail(`Unknown APK mode: ${mode}. Use debug-release, prod-debug, release, or path/to/file.apk.`);
}

function resolveBuiltApkPath(apkPlan) {
  const existingPath = apkPlan.pathCandidates.find((candidatePath) => existsSync(path.resolve(rootDir, candidatePath)));
  if (existingPath) {
    return existingPath;
  }

  fail(`APK not found. Checked:\n${apkPlan.pathCandidates.map((candidatePath) => `- ${candidatePath}`).join('\n')}`);
}

async function signReleaseApkWithDebugKey(apkPlan, version) {
  const unsignedApkPath = path.resolve(
    rootDir,
    resolveBuiltApkPath({ pathCandidates: apkPlan.unsignedPathCandidates }),
  );
  const outputPath = path.resolve(rootDir, apkPlan.pathCandidates[0]);
  const alignedPath = path.resolve(rootDir, 'tmp', `idle-wizard-${version}-debug-release-aligned.apk`);
  const debugKeystorePath = path.join(homedir(), '.android', 'debug.keystore');

  if (!existsSync(debugKeystorePath)) {
    fail(
      [
        `Missing Android debug keystore: ${debugKeystorePath}.`,
        'Build a debug APK once or restore the existing debug keystore before running release.',
      ].join(' '),
    );
  }

  const zipalignPath = await findAndroidBuildTool('zipalign');
  const apkSignerPath = await findAndroidBuildTool('apksigner');

  await mkdir(path.dirname(outputPath), { recursive: true });

  run(zipalignPath, ['-p', '-f', '4', unsignedApkPath, alignedPath]);
  run(apkSignerPath, [
    'sign',
    '--ks',
    debugKeystorePath,
    '--ks-key-alias',
    'androiddebugkey',
    '--ks-pass',
    'pass:android',
    '--key-pass',
    'pass:android',
    '--out',
    outputPath,
    alignedPath,
  ]);
  run(apkSignerPath, ['verify', '--verbose', outputPath]);

  return apkPlan.pathCandidates[0];
}

async function findAndroidBuildTool(toolName) {
  const sdkRoots = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    path.join(homedir(), 'Library', 'Android', 'sdk'),
    path.join(homedir(), 'Android', 'Sdk'),
  ].filter(Boolean);

  for (const sdkRoot of sdkRoots) {
    const buildToolsRoot = path.join(sdkRoot, 'build-tools');
    if (!existsSync(buildToolsRoot)) {
      continue;
    }

    const entries = await readdir(buildToolsRoot, { withFileTypes: true });
    const versions = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort(compareAndroidBuildToolVersions)
      .reverse();

    for (const version of versions) {
      const toolPath = path.join(buildToolsRoot, version, toolName);
      if (existsSync(toolPath)) {
        return toolPath;
      }
    }
  }

  fail(`Could not find Android build tool: ${toolName}. Install Android SDK build-tools first.`);
}

function compareAndroidBuildToolVersions(left, right) {
  const leftParts = parseAndroidBuildToolVersion(left);
  const rightParts = parseAndroidBuildToolVersion(right);
  const maxLength = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const diff = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }

  return left.localeCompare(right);
}

function parseAndroidBuildToolVersion(value) {
  return String(value)
    .split(/[^0-9]+/u)
    .filter(Boolean)
    .map(Number);
}

function resolveVersionBump() {
  if (options['no-version-bump']) {
    return null;
  }

  const configured = options['version-bump'] || process.env.RELEASE_VERSION_BUMP || 'patch';
  if (['none', 'skip', 'false', '0'].includes(String(configured).toLowerCase())) {
    return null;
  }

  return configured;
}

async function bumpPackageVersion(bump) {
  const packagePath = path.join(rootDir, 'package.json');
  const lockPath = path.join(rootDir, 'package-lock.json');
  const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
  const headVersion = readHeadPackageVersion();

  if (
    headVersion
    && packageJson.version !== headVersion
    && !options['force-version-bump']
  ) {
    console.log(`Package version already differs from HEAD (${headVersion} -> ${packageJson.version}); not bumping again.`);
    return;
  }

  const nextVersion = getNextVersion(packageJson.version, bump);
  if (nextVersion === packageJson.version) {
    return;
  }

  packageJson.version = nextVersion;
  await writeJsonFile(packagePath, packageJson);

  if (existsSync(lockPath)) {
    const lockJson = JSON.parse(await readFile(lockPath, 'utf8'));
    lockJson.version = nextVersion;
    if (lockJson.packages?.['']) {
      lockJson.packages[''].version = nextVersion;
    }
    await writeJsonFile(lockPath, lockJson);
  }

  console.log(`Bumped package version to ${nextVersion}.`);
}

function readHeadPackageVersion() {
  const result = spawnSync('git', ['show', 'HEAD:package.json'], {
    cwd: rootDir,
    env: process.env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });

  if (result.status !== 0 || !result.stdout) {
    return null;
  }

  try {
    return JSON.parse(result.stdout).version || null;
  } catch {
    return null;
  }
}

function getNextVersion(currentVersion, bump) {
  if (/^\d+\.\d+\.\d+(?:[-+].+)?$/.test(bump)) {
    return bump;
  }

  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(currentVersion);
  if (!match) {
    fail(`Cannot ${bump} bump non-standard version: ${currentVersion}`);
  }

  let [, major, minor, patch] = match.map(Number);
  if (bump === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (bump === 'minor') {
    minor += 1;
    patch = 0;
  } else if (bump === 'patch') {
    patch += 1;
  } else {
    fail(`Unknown version bump: ${bump}. Use patch, minor, major, none, or an exact x.y.z version.`);
  }

  return `${major}.${minor}.${patch}`;
}

async function writeJsonFile(filePath, data) {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

async function readPackageInfo() {
  return JSON.parse(await readFile(path.join(rootDir, 'package.json'), 'utf8'));
}

async function preflightDiscordNotes(version) {
  const changelog = await loadPlayerChangelog({
    rootDir,
    version,
  });

  if (!changelog && process.env.DISCORD_APK_SKIP_CHANGELOG !== '1') {
    fail(
      `Missing player changelog for ${version}. Add a ## ${version} section to ${DEFAULT_PLAYER_CHANGELOG_FILE}, set DISCORD_APK_CHANGELOG, or set DISCORD_APK_SKIP_CHANGELOG=1 only for internal testing.`,
    );
  }

  const featureAnnouncement = process.env.DISCORD_FEATURE_SKIP === '1'
    ? null
    : await loadFeatureAnnouncement({
      rootDir,
      version,
    });

  if (
    featureAnnouncement
    && !(process.env.DISCORD_FEATURE_WEBHOOK_URL || process.env.DISCORD_BIG_FEATURE_WEBHOOK_URL)
  ) {
    fail(
      `Missing DISCORD_FEATURE_WEBHOOK_URL for feature announcement from ${featureAnnouncement.source}. Add it to .env.local, remove that announcement, or set DISCORD_FEATURE_SKIP=1 only for internal testing.`,
    );
  }
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

    if (['message', 'apk', 'backend', 'version-bump'].includes(rawKey)) {
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

async function loadEnvFile(fileName, { overrideKeys } = {}) {
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
    if (!key || (process.env[key] !== undefined && !overrideKeys?.test(key))) {
      continue;
    }

    process.env[key] = stripEnvQuotes(rawValue);
  }
}

async function loadGradleProperties() {
  const propertyFiles = [
    path.join(rootDir, 'android/gradle.properties'),
    path.join(rootDir, 'android/app/gradle.properties'),
    path.join(homedir(), '.gradle/gradle.properties'),
  ];
  const properties = {};

  for (const filePath of propertyFiles) {
    if (!existsSync(filePath)) {
      continue;
    }

    const content = await readFile(filePath, 'utf8');
    Object.assign(properties, parseProperties(content));
  }

  return properties;
}

function parseProperties(content) {
  const properties = {};

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
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (key) {
      properties[key] = stripEnvQuotes(value);
    }
  }

  return properties;
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
