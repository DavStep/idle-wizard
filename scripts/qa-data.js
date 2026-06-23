#!/usr/bin/env node
/* global console, process */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { basename, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const DEFAULT_DATABASE = 'idle-wizard';
const DEFAULT_OUT_DIR = join('public', 'qa-data');
const DEFAULT_BACKUP_DIR = join('backups', 'maintenance');
const DEFAULT_SOURCE_SERVER = 'maincloud';
const TEMPLATE_SCHEMA_VERSION = 1;
const MANIFEST_SCHEMA_VERSION = 1;
const SAVE_TABLE = 'player_gameplay_save';
const PLAYER_TABLE = 'player';

const args = process.argv.slice(2);
const action = args[0] ?? 'help';
const options = parseOptions(args.slice(1));

loadEnvFile('.env.local');
loadEnvFile('.env');

if (action === 'help' || action === '--help' || action === '-h') {
  printHelp();
  process.exit(0);
}

switch (action) {
  case 'from-backup':
    fromBackup();
    break;
  case 'sync':
    syncRemote();
    break;
  default:
    console.error(`Unknown QA data action: ${action}`);
    printHelp();
    process.exit(1);
}

function printHelp() {
  console.log(`Usage:
  node scripts/qa-data.js from-backup [--input <backup.sql.txt>] [--backup-dir backups/maintenance] [--out public/qa-data]
  node scripts/qa-data.js sync [--server maincloud] [--database idle-wizard] [--out public/qa-data]

Examples:
  npm run qa:data:from-backup
  npm run qa:data:sync

Notes:
  - Generated QA files are local-only under public/qa-data/.
  - sync wraps the existing maintenance backup path, then imports that backup.
  - The local browser loads templates with cheats.loadDataTemplate('ftwizard').`);
}

function fromBackup({ inputPaths = getInputPaths(), outDir = getOutDir() } = {}) {
  if (inputPaths.length <= 0) {
    console.error('No backup files found. Pass --input <path> or run qa:data:sync.');
    process.exit(1);
  }

  const records = new Map();

  for (const inputPath of inputPaths) {
    mergeBackupRecords(records, readBackupRecords(inputPath));
  }

  const templates = [...records.values()]
    .filter((record) => record.save)
    .sort(compareRecords);

  if (templates.length <= 0) {
    console.error('No player gameplay saves found in backup input.');
    process.exit(1);
  }

  writeTemplates(templates, outDir);
}

function syncRemote() {
  const server = options.server ?? process.env.SPACETIME_SERVER ?? DEFAULT_SOURCE_SERVER;
  const database = options.database ?? process.env.SPACETIME_DATABASE ?? DEFAULT_DATABASE;
  const result = runNodeScript('scripts/maintenance.js', [
    'backup-reset',
    '--server',
    server,
    '--database',
    database,
  ]);
  const backupPath = parseBackupPath(result.stdout);

  if (!backupPath) {
    console.error('Could not find backup path in maintenance output.');
    process.exit(1);
  }

  fromBackup({ inputPaths: [backupPath], outDir: getOutDir() });
}

function readBackupRecords(inputPath) {
  if (!existsSync(inputPath)) {
    console.error(`Backup file not found: ${inputPath}`);
    process.exit(1);
  }

  const content = readFileSync(inputPath, 'utf8');
  const sections = parseSections(content);
  const profileByIdentity = new Map();

  for (const row of parseTable(sections.get(PLAYER_TABLE))) {
    const identity = normalizeIdentity(row.identity);

    if (!identity) {
      continue;
    }

    profileByIdentity.set(identity, {
      identity,
      username: unquote(row.username) || 'wizard',
      level: readInteger(row.player_level ?? row.playerLevel, 1),
      theme: unquote(row.theme) || 'white',
      colorMode: unquote(row.color_mode ?? row.colorMode) || 'monochrome',
      usernamePromptSeen: row.username_prompt_seen === 'true',
      font: unquote(row.font) || 'lexend',
      character: unquote(row.character) || 'elara',
    });
  }

  const records = new Map();

  for (const row of parseTable(sections.get(SAVE_TABLE))) {
    const identity = normalizeIdentity(row.identity);
    const save = parseSaveJson(row.save_json ?? row.saveJson);

    if (!identity || !save) {
      continue;
    }

    const profile = profileByIdentity.get(identity) ?? null;
    const record = {
      identity,
      sourceFile: inputPath,
      sourceBackup: basename(inputPath),
      save,
      saveUpdatedAt: unquote(row.updated_at ?? row.updatedAt) || null,
      profile,
      backendRows: {},
    };
    records.set(identity, record);
  }

  attachBackendRows(records, sections);

  return records;
}

function attachBackendRows(records, sections) {
  if (records.size <= 0) {
    return;
  }

  for (const [sectionName, sectionContent] of sections) {
    if (sectionName === SAVE_TABLE) {
      continue;
    }

    for (const row of parseTable(sectionContent)) {
      const rowText = Object.values(row).join(' ').toLowerCase();
      for (const record of records.values()) {
        if (!rowText.includes(record.identity)) {
          continue;
        }

        record.backendRows[sectionName] ??= [];
        record.backendRows[sectionName].push(row);
      }
    }
  }
}

function mergeBackupRecords(target, source) {
  for (const [identity, record] of source) {
    const current = target.get(identity);

    if (!current || compareRecordFreshness(record, current) > 0) {
      target.set(identity, record);
    }
  }
}

function writeTemplates(records, outDir) {
  const templateDir = join(outDir, 'templates');
  const ids = new Set();
  const usernameCounts = countUsernameSlugs(records);
  const levelAliasWinners = new Map();
  const manifestTemplates = [];
  const aliases = {};
  const generatedAt = new Date().toISOString();

  mkdirSync(templateDir, { recursive: true });

  for (const record of records) {
    const id = createTemplateId(record, ids, usernameCounts);
    const level = getRecordLevel(record);
    const username = record.profile?.username ?? 'wizard';
    const templateAliases = createTemplateAliases(record, id, usernameCounts);
    const templatePath = `/qa-data/templates/${id}.json`;
    const template = {
      schemaVersion: TEMPLATE_SCHEMA_VERSION,
      id,
      aliases: templateAliases,
      label: `${username} (level ${level})`,
      source: {
        server: options.server ?? process.env.SPACETIME_SERVER ?? DEFAULT_SOURCE_SERVER,
        database: options.database ?? process.env.SPACETIME_DATABASE ?? DEFAULT_DATABASE,
        backup: record.sourceBackup,
        identity: `0x${record.identity}`,
        updatedAt: record.saveUpdatedAt,
      },
      profile: record.profile,
      backendRows: record.backendRows,
      save: record.save,
    };

    writeFileSync(join(templateDir, `${id}.json`), `${JSON.stringify(template, null, 2)}\n`);

    const manifestEntry = {
      id,
      aliases: templateAliases,
      label: template.label,
      username,
      level,
      updatedAt: record.saveUpdatedAt,
      path: templatePath,
    };
    manifestTemplates.push(manifestEntry);

    for (const alias of templateAliases) {
      aliases[alias] = id;
    }

    const levelAlias = `level-${level}`;
    const levelWinner = levelAliasWinners.get(levelAlias);
    if (!levelWinner || compareRecordFreshness(record, levelWinner.record) > 0) {
      levelAliasWinners.set(levelAlias, { id, record });
    }
  }

  const ftwizard = manifestTemplates.find((template) =>
    template.aliases.includes('ftwizard'),
  );
  if (ftwizard) {
    aliases['everything-unlocked'] = ftwizard.id;
  }

  for (const [levelAlias, winner] of levelAliasWinners) {
    aliases[levelAlias] = winner.id;
  }

  const manifest = {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    generatedAt,
    templates: manifestTemplates,
    aliases,
  };

  writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(
    join(outDir, 'README.txt'),
    [
      'Generated local QA data for Idle Wizard.',
      'This directory is ignored by git.',
      'Use cheats.listDataTemplates() and cheats.loadDataTemplate(id) in a cheat-enabled local browser.',
      '',
    ].join('\n'),
  );

  console.log(`Wrote ${manifestTemplates.length} QA templates to ${outDir}`);
  console.log(`Aliases: ${Object.keys(aliases).sort().join(', ')}`);
}

function parseSections(content) {
  const sections = new Map();
  const lines = content.split(/\r?\n/);
  let currentName = null;
  let currentLines = [];

  for (const line of lines) {
    const match = /^--\s+([a-zA-Z0-9_]+)\s*$/.exec(line);

    if (match) {
      if (currentName) {
        sections.set(currentName, currentLines.join('\n'));
      }

      currentName = match[1];
      currentLines = [];
      continue;
    }

    if (currentName) {
      currentLines.push(line);
    }
  }

  if (currentName) {
    sections.set(currentName, currentLines.join('\n'));
  }

  if (sections.size <= 0 && content.includes('save_json')) {
    sections.set(SAVE_TABLE, content);
  }

  return sections;
}

function parseTable(sectionContent = '') {
  const lines = String(sectionContent)
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    return [];
  }

  const headerLine = lines[0];
  const headers = headerLine.split('|').map((header) => header.trim()).filter(Boolean);

  if (headers.length <= 0) {
    return [];
  }

  return lines
    .slice(1)
    .filter((line) => !isSeparatorLine(line))
    .map((line) => splitTableRow(line, headers.length))
    .filter(Boolean)
    .map((cells) =>
      Object.fromEntries(
        headers.map((header, index) => [header, cells[index]?.trim() ?? '']),
      ),
    );
}

function splitTableRow(line, columnCount) {
  const cells = [];
  let rest = line;

  for (let index = 1; index < columnCount; index += 1) {
    const separatorIndex = rest.indexOf('|');

    if (separatorIndex === -1) {
      return null;
    }

    cells.push(rest.slice(0, separatorIndex));
    rest = rest.slice(separatorIndex + 1);
  }

  cells.push(rest);
  return cells;
}

function isSeparatorLine(line) {
  return /^[\s+-]+$/.test(line);
}

function parseSaveJson(rawSaveJson) {
  const text = unquote(rawSaveJson);

  if (!text) {
    return null;
  }

  try {
    const save = JSON.parse(text);
    return save && typeof save === 'object' && !Array.isArray(save) ? save : null;
  } catch {
    return null;
  }
}

function createTemplateId(record, ids, usernameCounts) {
  const username = record.profile?.username ?? 'wizard';
  const usernameSlug = slug(username);
  const level = getRecordLevel(record);
  const identityShort = record.identity.slice(0, 8);
  const preferred =
    usernameSlug && usernameSlug !== 'wizard' && usernameCounts.get(usernameSlug) === 1
      ? usernameSlug
      : `level-${level}-${usernameSlug || 'wizard'}-${identityShort}`;

  let id = preferred;
  let suffix = 2;
  while (ids.has(id)) {
    id = `${preferred}-${suffix}`;
    suffix += 1;
  }

  ids.add(id);
  return id;
}

function createTemplateAliases(record, id, usernameCounts) {
  const aliases = new Set([id]);
  const usernameSlug = slug(record.profile?.username);

  if (usernameSlug && usernameSlug !== id && usernameCounts.get(usernameSlug) === 1) {
    aliases.add(usernameSlug);
  }

  return [...aliases].sort();
}

function countUsernameSlugs(records) {
  const counts = new Map();

  for (const record of records) {
    const usernameSlug = slug(record.profile?.username);

    if (!usernameSlug) {
      continue;
    }

    counts.set(usernameSlug, (counts.get(usernameSlug) ?? 0) + 1);
  }

  return counts;
}

function getRecordLevel(record) {
  const profileLevel = record.profile?.level;
  const saveLevel = readInteger(record.save?.tasks?.currentLevel, 1);
  return Number.isInteger(profileLevel) && profileLevel > 0 ? profileLevel : saveLevel;
}

function compareRecords(left, right) {
  const levelDifference = getRecordLevel(right) - getRecordLevel(left);

  if (levelDifference !== 0) {
    return levelDifference;
  }

  return compareRecordFreshness(right, left);
}

function compareRecordFreshness(left, right) {
  return Date.parse(left.saveUpdatedAt ?? '') - Date.parse(right.saveUpdatedAt ?? '');
}

function normalizeIdentity(identity) {
  const value = unquote(identity).toLowerCase().replace(/^0x/, '');
  return /^[0-9a-f]{64}$/.test(value) ? value : '';
}

function unquote(value) {
  const text = String(value ?? '').trim();

  if (text.startsWith('"') && text.endsWith('"')) {
    return text.slice(1, -1);
  }

  return text;
}

function readInteger(value, fallback) {
  const number = Number(unquote(value));
  return Number.isInteger(number) ? number : fallback;
}

function slug(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getInputPaths() {
  if (options.input) {
    return [options.input];
  }

  const backupDir = options['backup-dir'] ?? DEFAULT_BACKUP_DIR;

  if (!existsSync(backupDir)) {
    return [];
  }

  return readdirSync(backupDir)
    .filter((fileName) => fileName.endsWith('.sql.txt'))
    .map((fileName) => join(backupDir, fileName))
    .sort();
}

function getOutDir() {
  return options.out ?? DEFAULT_OUT_DIR;
}

function parseBackupPath(output) {
  const match = /Backup written:\s*(.+)\s*$/m.exec(String(output ?? ''));
  return match?.[1]?.trim() ?? '';
}

function runNodeScript(scriptPath, scriptArgs) {
  const result = spawnSync(process.execPath, [scriptPath, ...scriptArgs], {
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf8',
    maxBuffer: 512 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'inherit'],
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  process.stdout.write(result.stdout);
  return result;
}

function parseOptions(rawArgs) {
  const parsed = {};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (!arg.startsWith('--')) {
      parsed._ ??= [];
      parsed._.push(arg);
      continue;
    }

    const key = arg.slice(2);
    const value = rawArgs[index + 1];
    if (!value || value.startsWith('--')) {
      parsed[key] = true;
      continue;
    }

    parsed[key] = value;
    index += 1;
  }

  return parsed;
}

function loadEnvFile(fileName) {
  if (!existsSync(fileName)) {
    return;
  }

  const content = readFileSync(fileName, 'utf8');
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
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
