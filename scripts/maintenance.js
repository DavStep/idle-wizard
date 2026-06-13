#!/usr/bin/env node
/* global console, process */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const MUTATING_ACTIONS = new Set(['drain', 'locked', 'off', 'migrate', 'publish']);
const SCHEMA_NAMES = [
  'set_maintenance_mode',
  'migrate_player_gameplay_saves',
  'leaderboard_summary',
  'world_chat_recent',
];
const DEFAULT_DATABASE = 'idle-wizard';
const DEFAULT_MESSAGE = 'maintenance in progress';

const args = process.argv.slice(2);
const action = args[0] ?? 'help';
const options = parseOptions(args.slice(1));
const server = options.server ?? process.env.SPACETIME_SERVER ?? 'local';
const database = options.database ?? process.env.SPACETIME_DATABASE ?? DEFAULT_DATABASE;
const message = options.message ?? process.env.MAINTENANCE_MESSAGE ?? DEFAULT_MESSAGE;
const spacetimeBin = process.env.SPACETIME_BIN ?? 'spacetime';
const pathPrefix = process.env.HOME ? `${process.env.HOME}/.local/bin:` : '';

if (action === 'help' || action === '--help' || action === '-h') {
  printHelp();
  process.exit(0);
}

if (action === 'plan') {
  printPlan();
  process.exit(0);
}

if (MUTATING_ACTIONS.has(action)) {
  assertLiveConfirmation();
}

switch (action) {
  case 'schema':
    checkSchema();
    break;
  case 'status':
    runSql("SELECT config_key, config_json, updated_at FROM game_config WHERE config_key = 'maintenance'");
    break;
  case 'drain':
    callReducer('set_maintenance_mode', ['drain', message]);
    break;
  case 'locked':
    callReducer('set_maintenance_mode', ['locked', message]);
    break;
  case 'off':
    callReducer('set_maintenance_mode', ['off', message]);
    break;
  case 'backup':
    backupPlayerGameplaySave();
    break;
  case 'verify':
    verifyPlayerGameplaySave();
    break;
  case 'migrate':
    migratePlayerGameplaySaves();
    break;
  case 'publish':
    runSpacetime(['publish', database, '--server', server, '--module-path', './spacetimedb']);
    break;
  default:
    console.error(`Unknown maintenance action: ${action}`);
    printHelp();
    process.exit(1);
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

function printHelp() {
  console.log(`Usage:
  node scripts/maintenance.js plan
  node scripts/maintenance.js schema [--server local|maincloud] [--database idle-wizard]
  node scripts/maintenance.js status [--server local|maincloud] [--database idle-wizard]
  node scripts/maintenance.js drain --confirm-live [--message "..."]
  node scripts/maintenance.js locked --confirm-live
  node scripts/maintenance.js backup
  node scripts/maintenance.js verify
  node scripts/maintenance.js migrate --key YYYY-MM-DD-maintenance --confirm-live
  node scripts/maintenance.js publish --confirm-live
  node scripts/maintenance.js off --confirm-live

Defaults:
  server:   SPACETIME_SERVER or local
  database: SPACETIME_DATABASE or idle-wizard

Live guard:
  Mutating actions require --confirm-live.`);
}

function printPlan() {
  console.log(`Maintenance deploy order:
0. node scripts/maintenance.js schema --server maincloud --database idle-wizard
1. If maintenance reducers are missing, publish backend gate default-off:
   node scripts/maintenance.js publish --server maincloud --database idle-wizard --confirm-live
2. Deploy client maintenance gate to players.
3. node scripts/maintenance.js drain --server maincloud --database idle-wizard --confirm-live
4. Wait 2-3 minutes.
5. node scripts/maintenance.js locked --server maincloud --database idle-wizard --confirm-live
6. node scripts/maintenance.js backup --server maincloud --database idle-wizard
7. node scripts/maintenance.js verify --server maincloud --database idle-wizard
8. node scripts/maintenance.js migrate --server maincloud --database idle-wizard --key YYYY-MM-DD-maintenance --confirm-live
9. node scripts/maintenance.js verify --server maincloud --database idle-wizard
10. node scripts/maintenance.js publish --server maincloud --database idle-wizard --confirm-live
11. node scripts/maintenance.js off --server maincloud --database idle-wizard --confirm-live`);
}

function assertLiveConfirmation() {
  if (options['confirm-live']) {
    return;
  }

  console.error(`Refusing mutating action "${action}" without --confirm-live.`);
  process.exit(1);
}

function callReducer(reducerName, reducerArgs) {
  runSpacetime(['call', '-s', server, database, reducerName, ...reducerArgs]);
}

function runSql(sql) {
  runSpacetime(['sql', '-s', server, database, sql]);
}

function backupPlayerGameplaySave() {
  mkdirSync(join('backups', 'maintenance'), { recursive: true });
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const path = join(
    'backups',
    'maintenance',
    `player_gameplay_save_${server}_${database}_${timestamp}.sql.txt`,
  );
  const result = runSpacetime(
    [
      'sql',
      '-s',
      server,
      database,
      'SELECT identity, updated_at, save_json FROM player_gameplay_save',
    ],
    { capture: true },
  );

  writeFileSync(path, result.stdout);
  console.log(`Backup written: ${path}`);
}

function verifyPlayerGameplaySave() {
  runSql('SELECT COUNT(*) AS row_count FROM player_gameplay_save');
  runSql('SELECT COUNT(*) AS parseable_count FROM admin_player_gameplay_save');
  runSql(
    'SELECT identity, current_gold, current_crystal, updated_at FROM admin_player_gameplay_save LIMIT 10',
  );
}

function migratePlayerGameplaySaves() {
  const migrationKey = options.key ?? options._?.[0];

  if (!migrationKey) {
    console.error('Missing migration key. Pass --key YYYY-MM-DD-maintenance.');
    process.exit(1);
  }

  callReducer('migrate_player_gameplay_saves', [migrationKey]);
}

function checkSchema() {
  const result = runSpacetime(['describe', '-s', server, '--json', database], { capture: true });
  const schemaText = result.stdout;

  try {
    JSON.parse(schemaText);
  } catch {
    console.error('Could not parse schema JSON from spacetime describe.');
    process.exit(1);
  }

  for (const name of SCHEMA_NAMES) {
    console.log(`${name}: ${schemaText.includes(name) ? 'present' : 'missing'}`);
  }
}

function runSpacetime(spacetimeArgs, { capture = false } = {}) {
  console.log(`$ ${spacetimeBin} ${spacetimeArgs.map(shellQuote).join(' ')}`);
  const result = spawnSync(spacetimeBin, spacetimeArgs, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PATH: `${pathPrefix}${process.env.PATH ?? ''}`,
    },
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  return result;
}

function shellQuote(value) {
  const text = String(value);
  if (/^[a-zA-Z0-9_./:=@-]+$/.test(text)) {
    return text;
  }

  return `'${text.replace(/'/g, "'\\''")}'`;
}
