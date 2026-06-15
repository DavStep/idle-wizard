#!/usr/bin/env node
/* global Blob, FormData, console, fetch, process */

import { existsSync } from 'node:fs';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import {
  DEFAULT_PLAYER_CHANGELOG_FILE,
  buildPlayerChangelogDiscordMessages,
  loadPlayerChangelog,
} from './player-changelog.js';

const rootDir = process.cwd();

await loadEnvFile('.env.local');
await loadEnvFile('.env');

const webhookUrl = process.env.DISCORD_APK_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;
const apkPath = await resolveApkPath(process.argv[2] || process.env.DISCORD_APK_FILE);

if (!webhookUrl) {
  fail('Missing DISCORD_APK_WEBHOOK_URL. Add Discord channel webhook URL to .env.local or shell env.');
}

if (!isDiscordWebhookUrl(webhookUrl)) {
  fail('DISCORD_APK_WEBHOOK_URL does not look like a Discord webhook URL.');
}

if (/unsigned/i.test(path.basename(apkPath)) && process.env.DISCORD_APK_ALLOW_UNSIGNED !== '1') {
  fail(`Refusing to post unsigned APK: ${relative(apkPath)}. Sign release first, or set DISCORD_APK_ALLOW_UNSIGNED=1 only for internal testing.`);
}

const apkStats = await stat(apkPath);
const packageInfo = JSON.parse(await readFile(path.join(rootDir, 'package.json'), 'utf8'));
const message = process.env.DISCORD_APK_MESSAGE || [
  `Idle Wizard APK ${packageInfo.version}`,
  path.basename(apkPath),
  `${formatBytes(apkStats.size)}`,
].join(' - ');
const changelog = await loadPlayerChangelog({
  rootDir,
  version: packageInfo.version,
});

if (!changelog && process.env.DISCORD_APK_SKIP_CHANGELOG !== '1') {
  fail(
    `Missing player changelog for ${packageInfo.version}. Add a ## ${packageInfo.version} section to ${DEFAULT_PLAYER_CHANGELOG_FILE}, set DISCORD_APK_CHANGELOG, or set DISCORD_APK_SKIP_CHANGELOG=1 only for internal testing.`,
  );
}

if (changelog) {
  const changelogMessages = buildPlayerChangelogDiscordMessages({
    version: packageInfo.version,
    changelogText: changelog.text,
  });

  for (const changelogMessage of changelogMessages) {
    await postDiscordMessage(webhookUrl, changelogMessage);
  }
  console.log(`Posted player changelog from ${changelog.source} to Discord.`);
}

const apkBytes = await readFile(apkPath);
const form = new FormData();
form.append('payload_json', JSON.stringify({ content: message }));
form.append(
  'files[0]',
  new Blob([apkBytes], { type: 'application/vnd.android.package-archive' }),
  path.basename(apkPath),
);

const response = await fetch(webhookUrl, {
  method: 'POST',
  body: form,
});

const responseBody = await response.text();

if (!response.ok) {
  fail(`Discord upload failed: ${response.status} ${response.statusText}${responseBody ? `\n${responseBody}` : ''}`);
}

console.log(`Posted ${relative(apkPath)} to Discord (${formatBytes(apkStats.size)}).`);

async function postDiscordMessage(url, content) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });

  const responseBody = await response.text();
  if (!response.ok) {
    fail(`Discord changelog post failed: ${response.status} ${response.statusText}${responseBody ? `\n${responseBody}` : ''}`);
  }
}

async function resolveApkPath(inputPath) {
  if (inputPath) {
    const resolvedPath = path.resolve(rootDir, inputPath);
    if (!existsSync(resolvedPath)) {
      fail(`APK not found: ${relative(resolvedPath)}`);
    }
    return resolvedPath;
  }

  const apkRoot = path.join(rootDir, 'android/app/build/outputs/apk');
  const apkFiles = await collectApkFiles(apkRoot);
  const uploadableFiles = apkFiles.filter((filePath) => !/unsigned/i.test(path.basename(filePath)));

  if (!uploadableFiles.length) {
    fail(`No uploadable APK found under ${relative(apkRoot)}. Build a debug APK or sign release, then pass its path.`);
  }

  const filesWithStats = await Promise.all(
    uploadableFiles.map(async (filePath) => ({ filePath, stats: await stat(filePath) })),
  );

  filesWithStats.sort((left, right) => right.stats.mtimeMs - left.stats.mtimeMs);
  return filesWithStats[0].filePath;
}

async function collectApkFiles(dirPath) {
  if (!existsSync(dirPath)) {
    return [];
  }

  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      return collectApkFiles(entryPath);
    }
    return entry.isFile() && entry.name.endsWith('.apk') ? [entryPath] : [];
  }));

  return files.flat();
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

function isDiscordWebhookUrl(value) {
  return /^https:\/\/(?:discord(?:app)?\.com)\/api\/webhooks\/\d+\/[\w-]+/.test(value);
}

function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function relative(filePath) {
  return path.relative(rootDir, filePath) || '.';
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
