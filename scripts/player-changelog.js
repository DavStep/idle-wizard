/* global process */

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const DEFAULT_PLAYER_CHANGELOG_FILE = 'PLAYER_CHANGELOG.md';
export const DISCORD_CONTENT_LIMIT = 2000;

export async function loadPlayerChangelog({ rootDir, version, env = process.env }) {
  const envText = normalizeChangelogText(env.DISCORD_APK_CHANGELOG);
  if (envText) {
    return {
      source: 'DISCORD_APK_CHANGELOG',
      text: envText,
    };
  }

  const configuredFile = Boolean(env.DISCORD_APK_CHANGELOG_FILE);
  const changelogFile = env.DISCORD_APK_CHANGELOG_FILE || DEFAULT_PLAYER_CHANGELOG_FILE;
  const changelogPath = path.resolve(rootDir, changelogFile);
  if (!existsSync(changelogPath)) {
    return null;
  }

  const content = await readFile(changelogPath, 'utf8');
  const sectionText = extractVersionChangelog(content, version);
  const text = sectionText || (configuredFile ? normalizeChangelogText(content) : '');
  if (!text) {
    return null;
  }

  return {
    source: path.relative(rootDir, changelogPath) || '.',
    text,
  };
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

export function normalizeChangelogText(text) {
  return String(text ?? '')
    .replace(/\r\n/g, '\n')
    .trim();
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
