/* global process */

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const DEFAULT_PLAYER_CHANGELOG_FILE = 'PLAYER_CHANGELOG.md';
export const DEFAULT_FEATURE_ANNOUNCEMENT_FILE = 'FEATURE_ANNOUNCEMENT.md';
export const DISCORD_CONTENT_LIMIT = 2000;

export async function loadPlayerChangelog({ rootDir, version, env = process.env }) {
  return loadVersionedReleaseText({
    rootDir,
    version,
    envText: env.DISCORD_APK_CHANGELOG,
    envTextSource: 'DISCORD_APK_CHANGELOG',
    envFile: env.DISCORD_APK_CHANGELOG_FILE,
    defaultFile: DEFAULT_PLAYER_CHANGELOG_FILE,
  });
}

export async function loadFeatureAnnouncement({ rootDir, version, env = process.env }) {
  return loadVersionedReleaseText({
    rootDir,
    version,
    envText: env.DISCORD_FEATURE_ANNOUNCEMENT,
    envTextSource: 'DISCORD_FEATURE_ANNOUNCEMENT',
    envFile: env.DISCORD_FEATURE_ANNOUNCEMENT_FILE,
    defaultFile: DEFAULT_FEATURE_ANNOUNCEMENT_FILE,
  });
}

export function extractVersionChangelog(content, version) {
  const lines = content.split(/\r?\n/);
  let inFence = false;

  for (let index = 0; index < lines.length; index += 1) {
    if (isFenceLine(lines[index])) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      continue;
    }

    const heading = parseMarkdownHeading(lines[index]);
    if (!heading || !isVersionHeading(heading.title, version)) {
      continue;
    }

    const sectionStart = index + 1;
    let sectionEnd = lines.length;
    let sectionInFence = false;
    for (let sectionIndex = sectionStart; sectionIndex < lines.length; sectionIndex += 1) {
      if (isFenceLine(lines[sectionIndex])) {
        sectionInFence = !sectionInFence;
        continue;
      }
      if (sectionInFence) {
        continue;
      }

      const nextHeading = parseMarkdownHeading(lines[sectionIndex]);
      if (nextHeading && nextHeading.level <= heading.level) {
        sectionEnd = sectionIndex;
        break;
      }
    }

    return normalizeChangelogText(lines.slice(sectionStart, sectionEnd).join('\n'));
  }

  return '';
}

export function buildPlayerChangelogDiscordMessages({ version, changelogText }) {
  const text = normalizeChangelogText(changelogText);
  if (!text) {
    return [];
  }

  const title = `Idle Wizard ${version} player changelog`;
  const chunkLimit = DISCORD_CONTENT_LIMIT - title.length - 10;
  const chunks = splitDiscordText(text, chunkLimit);

  return chunks.map((chunk, index) => {
    const header = chunks.length > 1 ? `${title} (${index + 1}/${chunks.length})` : title;
    return `${header}\n${chunk}`;
  });
}

export function buildFeatureAnnouncementDiscordMessages({ version, announcementText }) {
  const text = normalizeChangelogText(announcementText);
  if (!text) {
    return [];
  }

  const title = `Idle Wizard ${version} feature spotlight`;
  const chunkLimit = DISCORD_CONTENT_LIMIT - title.length - 10;
  const chunks = splitDiscordText(text, chunkLimit);

  return chunks.map((chunk, index) => {
    const header = chunks.length > 1 ? `${title} (${index + 1}/${chunks.length})` : title;
    return `${header}\n${chunk}`;
  });
}

export function normalizeChangelogText(text) {
  return String(text ?? '')
    .replace(/\r\n/g, '\n')
    .trim();
}

async function loadVersionedReleaseText({
  rootDir,
  version,
  envText,
  envTextSource,
  envFile,
  defaultFile,
}) {
  const normalizedEnvText = normalizeChangelogText(envText);
  if (normalizedEnvText) {
    return {
      source: envTextSource,
      text: normalizedEnvText,
    };
  }

  const configuredFile = Boolean(envFile);
  const releaseFile = envFile || defaultFile;
  const releasePath = path.resolve(rootDir, releaseFile);
  if (!existsSync(releasePath)) {
    return null;
  }

  const content = await readFile(releasePath, 'utf8');
  const sectionText = extractVersionChangelog(content, version);
  const text = sectionText || (configuredFile ? normalizeChangelogText(content) : '');
  if (!text) {
    return null;
  }

  return {
    source: path.relative(rootDir, releasePath) || '.',
    text,
  };
}

function splitDiscordText(text, maxLength) {
  const chunks = [];
  const lines = text.split('\n');
  let current = '';

  for (const line of lines) {
    if (line.length > maxLength) {
      flushCurrent();
      for (let index = 0; index < line.length; index += maxLength) {
        chunks.push(line.slice(index, index + maxLength));
      }
      continue;
    }

    const next = current ? `${current}\n${line}` : line;
    if (next.length > maxLength) {
      flushCurrent();
      current = line;
      continue;
    }

    current = next;
  }

  flushCurrent();
  return chunks.length ? chunks : [''];

  function flushCurrent() {
    if (!current) {
      return;
    }
    chunks.push(current);
    current = '';
  }
}

function parseMarkdownHeading(line) {
  const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
  if (!match) {
    return null;
  }
  return {
    level: match[1].length,
    title: match[2],
  };
}

function isFenceLine(line) {
  return /^\s*(?:```|~~~)/.test(line);
}

function isVersionHeading(title, version) {
  const escapedVersion = escapeRegExp(version);
  return new RegExp(`^\\[?v?${escapedVersion}\\]?(?:\\s|$|[-:])`, 'i').test(title.trim());
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
