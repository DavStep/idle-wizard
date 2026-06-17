#!/usr/bin/env node
/* global console, fetch, process */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const MUTATING_ACTIONS = new Set([
  'drain',
  'locked',
  'off',
  'migrate',
  'publish',
  'reset-progress',
  'reset-discord-post',
  'reset-player',
  'wipe-player-data',
]);
const SCHEMA_NAMES = [
  'set_maintenance_mode',
  'migrate_player_gameplay_saves',
  'admin_reset_player_progression_data',
  'admin_reset_player_progression_by_identity',
  'admin_wipe_all_player_data',
  'leaderboard_summary',
  'world_chat_recent',
];
const DEFAULT_DATABASE = 'idle-wizard';
const DEFAULT_MESSAGE = 'maintenance in progress';
const PLAYER_PROGRESSION_RESET_TABLES = [
  'player',
  'player_gameplay_save',
  'leaderboard',
  'world_chat',
  'trade_alliance',
  'trade_alliance_member',
  'trade_alliance_application',
  'trade_alliance_chat',
  'trade_alliance_quest_progress',
  'trade_alliance_quest_contribution',
  'trade_alliance_reward_inbox',
  'player_shop_listing',
  'player_shop_proceeds',
  'player_shop_trade',
  'potion_recipe_discovery',
  'npc_market_price',
];
const ALL_PLAYER_DATA_WIPE_TABLES = [
  ...PLAYER_PROGRESSION_RESET_TABLES,
  'player_session',
  'player_feedback',
];

const args = process.argv.slice(2);
const action = args[0] ?? 'help';
const options = parseOptions(args.slice(1));
loadEnvFile('.env.local');
loadEnvFile('.env');
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

if (MUTATING_ACTIONS.has(action) && !options['dry-run']) {
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
  case 'backup-reset':
    backupPlayerProgressionResetData();
    break;
  case 'backup-player-data-wipe':
    backupAllPlayerDataWipeData();
    break;
  case 'backup-player-reset':
    backupSinglePlayerProgressionResetData();
    break;
  case 'verify':
    verifyPlayerGameplaySave();
    break;
  case 'verify-reset':
    verifyPlayerProgressionReset();
    break;
  case 'verify-player-data-wipe':
    verifyAllPlayerDataWipe();
    break;
  case 'verify-player-reset':
    verifySinglePlayerProgressionReset();
    break;
  case 'migrate':
    migratePlayerGameplaySaves();
    break;
  case 'reset-discord-post':
    await postResetDiscordNotice(getResetKey());
    break;
  case 'reset-progress':
    await resetPlayerProgressionData();
    break;
  case 'reset-player':
    resetSinglePlayerProgressionData();
    break;
  case 'wipe-player-data':
    await wipeAllPlayerData();
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
  node scripts/maintenance.js backup-reset
  node scripts/maintenance.js backup-player-data-wipe
  node scripts/maintenance.js backup-player-reset --identity <hex>
  node scripts/maintenance.js verify
  node scripts/maintenance.js verify-reset
  node scripts/maintenance.js verify-player-data-wipe
  node scripts/maintenance.js verify-player-reset --identity <hex>
  node scripts/maintenance.js migrate --key YYYY-MM-DD-maintenance --confirm-live
  node scripts/maintenance.js reset-discord-post --key YYYY-MM-DD-reset --confirm-live
  node scripts/maintenance.js reset-progress --key YYYY-MM-DD-reset --post-discord --confirm-live
  node scripts/maintenance.js reset-player --identity <hex> --key YYYY-MM-DD-reset --confirm-live
  node scripts/maintenance.js wipe-player-data --key YYYY-MM-DD-reset --post-discord --confirm-live
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
11. node scripts/maintenance.js off --server maincloud --database idle-wizard --confirm-live

Full progression reset order after schema has admin_reset_player_progression_data:
0. Close/navigate away active game clients where possible.
1. node scripts/maintenance.js drain --server maincloud --database idle-wizard --confirm-live
2. Wait 2-3 minutes.
3. node scripts/maintenance.js locked --server maincloud --database idle-wizard --confirm-live
4. node scripts/maintenance.js backup-reset --server maincloud --database idle-wizard
5. node scripts/maintenance.js reset-progress --server maincloud --database idle-wizard --key YYYY-MM-DD-reset --post-discord --confirm-live
6. node scripts/maintenance.js verify-reset --server maincloud --database idle-wizard
7. node scripts/maintenance.js off --server maincloud --database idle-wizard --confirm-live

Full player data wipe order after schema has admin_wipe_all_player_data:
0. Close/navigate away active game clients where possible.
1. node scripts/maintenance.js drain --server maincloud --database idle-wizard --confirm-live
2. Wait 2-3 minutes.
3. node scripts/maintenance.js locked --server maincloud --database idle-wizard --confirm-live
4. node scripts/maintenance.js backup-player-data-wipe --server maincloud --database idle-wizard
5. node scripts/maintenance.js wipe-player-data --server maincloud --database idle-wizard --key YYYY-MM-DD-reset --post-discord --confirm-live
6. node scripts/maintenance.js verify-player-data-wipe --server maincloud --database idle-wizard
7. node scripts/maintenance.js off --server maincloud --database idle-wizard --confirm-live`);
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

function backupPlayerProgressionResetData() {
  mkdirSync(join('backups', 'maintenance'), { recursive: true });
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const path = join(
    'backups',
    'maintenance',
    `player_progression_reset_${server}_${database}_${timestamp}.sql.txt`,
  );
  const sections = [];

  for (const tableName of PLAYER_PROGRESSION_RESET_TABLES) {
    const result = runSpacetime(
      ['sql', '-s', server, database, `SELECT * FROM ${tableName}`],
      { capture: true },
    );
    sections.push(`-- ${tableName}\n${result.stdout.trimEnd()}`);
  }

  writeFileSync(path, `${sections.join('\n\n')}\n`);
  console.log(`Backup written: ${path}`);
}

function backupAllPlayerDataWipeData() {
  mkdirSync(join('backups', 'maintenance'), { recursive: true });
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const path = join(
    'backups',
    'maintenance',
    `all_player_data_wipe_${server}_${database}_${timestamp}.sql.txt`,
  );
  const sections = [];

  for (const tableName of ALL_PLAYER_DATA_WIPE_TABLES) {
    const result = runSpacetime(
      ['sql', '-s', server, database, `SELECT * FROM ${tableName}`],
      { capture: true },
    );
    sections.push(`-- ${tableName}\n${result.stdout.trimEnd()}`);
  }

  writeFileSync(path, `${sections.join('\n\n')}\n`);
  console.log(`Backup written: ${path}`);
}

function backupSinglePlayerProgressionResetData() {
  const identityHex = getIdentityHex();
  const identitySql = getIdentitySqlLiteral(identityHex);
  mkdirSync(join('backups', 'maintenance'), { recursive: true });
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const path = join(
    'backups',
    'maintenance',
    `player_progression_reset_${server}_${database}_${identityHex}_${timestamp}.sql.txt`,
  );
  const sections = [
    ['player', `SELECT * FROM player WHERE identity = ${identitySql}`],
    [
      'player_gameplay_save',
      `SELECT identity, updated_at, save_json FROM player_gameplay_save WHERE identity = ${identitySql}`,
    ],
    ['leaderboard', `SELECT * FROM leaderboard WHERE identity = ${identitySql}`],
    ['player_session', `SELECT * FROM player_session WHERE identity = ${identitySql}`],
    [
      'trade_alliance_member',
      `SELECT * FROM trade_alliance_member WHERE member_identity = ${identitySql}`,
    ],
    [
      'trade_alliance_application',
      `SELECT * FROM trade_alliance_application WHERE applicant_identity = ${identitySql}`,
    ],
    [
      'trade_alliance_quest_contribution',
      `SELECT * FROM trade_alliance_quest_contribution WHERE contributor_identity = ${identitySql}`,
    ],
    [
      'trade_alliance_reward_inbox',
      `SELECT * FROM trade_alliance_reward_inbox WHERE recipient_identity = ${identitySql}`,
    ],
    [
      'player_shop_listing',
      `SELECT * FROM player_shop_listing WHERE seller_identity = ${identitySql}`,
    ],
    [
      'player_shop_proceeds',
      `SELECT * FROM player_shop_proceeds WHERE seller_identity = ${identitySql}`,
    ],
  ].map(([tableName, sql]) => {
    const result = runSpacetime(['sql', '-s', server, database, sql], { capture: true });
    return `-- ${tableName}\n${result.stdout.trimEnd()}`;
  });

  writeFileSync(path, `${sections.join('\n\n')}\n`);
  console.log(`Backup written: ${path}`);
}

function verifyPlayerGameplaySave() {
  runSql('SELECT COUNT(*) AS row_count FROM player_gameplay_save');
  runSql('SELECT COUNT(*) AS parseable_count FROM admin_player_gameplay_save');
  runSql(
    'SELECT identity, current_gold, current_crystal, updated_at FROM admin_player_gameplay_save LIMIT 10',
  );
}

function verifyPlayerProgressionReset() {
  runSql('SELECT COUNT(*) AS player_count FROM player');
  runSql('SELECT COUNT(*) AS above_level_1 FROM player WHERE player_level > 1');
  runSql('SELECT COUNT(*) AS save_count FROM player_gameplay_save');
  runSql('SELECT COUNT(*) AS leaderboard_count FROM leaderboard');
  runSql('SELECT COUNT(*) AS world_chat_count FROM world_chat');
  runSql('SELECT COUNT(*) AS alliance_count FROM trade_alliance');
  runSql('SELECT COUNT(*) AS alliance_member_count FROM trade_alliance_member');
  runSql('SELECT COUNT(*) AS alliance_application_count FROM trade_alliance_application');
  runSql('SELECT COUNT(*) AS alliance_chat_count FROM trade_alliance_chat');
  runSql('SELECT COUNT(*) AS alliance_quest_count FROM trade_alliance_quest_progress');
  runSql('SELECT COUNT(*) AS alliance_contribution_count FROM trade_alliance_quest_contribution');
  runSql('SELECT COUNT(*) AS alliance_reward_count FROM trade_alliance_reward_inbox');
  runSql('SELECT COUNT(*) AS player_shop_listing_count FROM player_shop_listing');
  runSql('SELECT COUNT(*) AS player_shop_proceeds_count FROM player_shop_proceeds');
  runSql('SELECT COUNT(*) AS player_shop_trade_count FROM player_shop_trade');
  runSql('SELECT COUNT(*) AS potion_discovery_count FROM potion_recipe_discovery');
  runSql(
    'SELECT item_key, npc_need, npc_stock, demand_score, supply_score FROM npc_market_price LIMIT 10',
  );
}

function verifyAllPlayerDataWipe() {
  runSql('SELECT COUNT(*) AS player_count FROM player');
  runSql('SELECT COUNT(*) AS player_session_count FROM player_session');
  runSql('SELECT COUNT(*) AS player_feedback_count FROM player_feedback');
  runSql('SELECT COUNT(*) AS save_count FROM player_gameplay_save');
  runSql('SELECT COUNT(*) AS leaderboard_count FROM leaderboard');
  runSql('SELECT COUNT(*) AS world_chat_count FROM world_chat');
  runSql('SELECT COUNT(*) AS alliance_count FROM trade_alliance');
  runSql('SELECT COUNT(*) AS alliance_member_count FROM trade_alliance_member');
  runSql('SELECT COUNT(*) AS alliance_application_count FROM trade_alliance_application');
  runSql('SELECT COUNT(*) AS alliance_chat_count FROM trade_alliance_chat');
  runSql('SELECT COUNT(*) AS alliance_quest_count FROM trade_alliance_quest_progress');
  runSql('SELECT COUNT(*) AS alliance_contribution_count FROM trade_alliance_quest_contribution');
  runSql('SELECT COUNT(*) AS alliance_reward_count FROM trade_alliance_reward_inbox');
  runSql('SELECT COUNT(*) AS player_shop_listing_count FROM player_shop_listing');
  runSql('SELECT COUNT(*) AS player_shop_proceeds_count FROM player_shop_proceeds');
  runSql('SELECT COUNT(*) AS player_shop_trade_count FROM player_shop_trade');
  runSql('SELECT COUNT(*) AS potion_discovery_count FROM potion_recipe_discovery');
  runSql(
    'SELECT item_key, npc_need, npc_stock, demand_score, supply_score FROM npc_market_price LIMIT 10',
  );
}

function verifySinglePlayerProgressionReset() {
  const identityHex = getIdentityHex();
  const identitySql = getIdentitySqlLiteral(identityHex);

  runSql(
    `SELECT identity, username, player_level, connected, last_seen_at FROM player WHERE identity = ${identitySql}`,
  );
  runSql(`SELECT COUNT(*) AS save_count FROM player_gameplay_save WHERE identity = ${identitySql}`);
  runSql(
    `SELECT identity, username, player_level, total_income, daily_income, weekly_income, monthly_income FROM leaderboard WHERE identity = ${identitySql}`,
  );
  runSql(`SELECT COUNT(*) AS session_count FROM player_session WHERE identity = ${identitySql}`);
  runSql(
    `SELECT COUNT(*) AS alliance_member_count FROM trade_alliance_member WHERE member_identity = ${identitySql}`,
  );
  runSql(
    `SELECT COUNT(*) AS alliance_application_count FROM trade_alliance_application WHERE applicant_identity = ${identitySql}`,
  );
  runSql(
    `SELECT COUNT(*) AS alliance_contribution_count FROM trade_alliance_quest_contribution WHERE contributor_identity = ${identitySql}`,
  );
  runSql(
    `SELECT COUNT(*) AS alliance_reward_count FROM trade_alliance_reward_inbox WHERE recipient_identity = ${identitySql}`,
  );
  runSql(
    `SELECT COUNT(*) AS player_shop_listing_count FROM player_shop_listing WHERE seller_identity = ${identitySql}`,
  );
  runSql(
    `SELECT COUNT(*) AS player_shop_proceeds_count FROM player_shop_proceeds WHERE seller_identity = ${identitySql}`,
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

async function resetPlayerProgressionData() {
  const resetKey = getResetKey();

  if (options['post-discord']) {
    await postResetDiscordNotice(resetKey);
  }

  callReducer('admin_reset_player_progression_data', [resetKey]);
}

async function wipeAllPlayerData() {
  const resetKey = getResetKey();

  if (options['post-discord']) {
    await postResetDiscordNotice(resetKey, { fullPlayerDataWipe: true });
  }

  if (options['dry-run']) {
    console.log(`Dry run: would call admin_wipe_all_player_data ${shellQuote(resetKey)}`);
    return;
  }

  callReducer('admin_wipe_all_player_data', [resetKey]);
}

function resetSinglePlayerProgressionData() {
  const identityHex = getIdentityHex();
  const resetKey = getResetKey();

  callReducer('admin_reset_player_progression_by_identity', [identityHex, resetKey]);
}

function getResetKey() {
  const resetKey = options.key ?? options._?.[0];

  if (!resetKey) {
    console.error('Missing reset key. Pass --key YYYY-MM-DD-reset.');
    process.exit(1);
  }

  return resetKey;
}

function getIdentityHex() {
  const identityHex = options.identity ?? options['identity-hex'] ?? options._?.[0];
  const safeIdentityHex = normalizeIdentityHex(identityHex);

  if (!/^[0-9a-f]{64}$/.test(safeIdentityHex)) {
    console.error('Missing or invalid identity. Pass --identity <64 hex chars>.');
    process.exit(1);
  }

  return safeIdentityHex;
}

function getIdentitySqlLiteral(identityHex) {
  return `0x${identityHex}`;
}

function normalizeIdentityHex(identityHex) {
  return String(identityHex ?? '')
    .trim()
    .toLowerCase()
    .replace(/^0x/, '');
}

async function postResetDiscordNotice(resetKey, { fullPlayerDataWipe = false } = {}) {
  const content =
    options['discord-message'] ??
    process.env.DISCORD_RESET_MESSAGE ??
    buildDefaultResetDiscordMessage(resetKey, { fullPlayerDataWipe });

  if (content.length > 2000) {
    console.error(`Discord reset post is ${content.length} characters; Discord limit is 2000.`);
    process.exit(1);
  }

  if (options['dry-run']) {
    console.log(content);
    return;
  }

  const webhookUrl =
    process.env.DISCORD_RESET_WEBHOOK_URL ??
    process.env.DISCORD_MAINTENANCE_WEBHOOK_URL ??
    process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    console.error(
      'Missing DISCORD_RESET_WEBHOOK_URL, DISCORD_MAINTENANCE_WEBHOOK_URL, or DISCORD_WEBHOOK_URL.',
    );
    process.exit(1);
  }

  if (!isDiscordWebhookUrl(webhookUrl)) {
    console.error('Discord reset webhook URL does not look like a Discord webhook URL.');
    process.exit(1);
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  const responseBody = await response.text();

  if (!response.ok) {
    console.error(
      `Discord reset post failed: ${response.status} ${response.statusText}${
        responseBody ? `\n${responseBody}` : ''
      }`,
    );
    process.exit(1);
  }

  console.log('Posted reset notice to Discord.');
}

function buildDefaultResetDiscordMessage(resetKey, { fullPlayerDataWipe = false } = {}) {
  if (fullPlayerDataWipe) {
    return [
      '**Idle Wizard reset notice**',
      '',
      'Hey everyone. We are doing a full account and progression reset for Idle Wizard.',
      '',
      'This clears account/profile rows and gameplay progress: saved names, theme/font/color settings, saves, leaderboards, world chat history, feedback, alliances, player market listings, potion discoveries, and shared market pressure. Everyone starts as a brand-new player after maintenance ends.',
      '',
      'Why this is happening: the game is still in early testing, and the economy/server systems have changed enough that old account data can leave players in unfair or broken states. A clean reset gives the next build a fair baseline and helps us tune the game properly.',
      '',
      'What to do: if you are in the game now, close it during maintenance. When maintenance is over, open the newest build and start fresh. Thank you for testing through the rough parts.',
      '',
      `Reset key: ${resetKey}`,
    ].join('\n');
  }

  return [
    '**Idle Wizard reset notice**',
    '',
    'Hey everyone. We are doing a full progression reset for Idle Wizard.',
    '',
    'This keeps your account, name, and profile settings, but clears gameplay progress: saves, leaderboards, world chat history, alliances, player market listings, potion discoveries, and shared market pressure. Everyone starts fresh at level 1 after maintenance ends.',
    '',
    'Why this is happening: the game is still in early testing, and the economy/server systems have changed enough that old progress can leave players in unfair or broken states. A clean reset gives the next build a fair baseline and helps us tune the game properly.',
    '',
    'What to do: if you are in the game now, close it during maintenance. When maintenance is over, open the newest build and start fresh. Thank you for testing through the rough parts.',
    '',
    `Reset key: ${resetKey}`,
  ].join('\n');
}

function checkSchema() {
  const result = runSpacetime(['describe', '-s', server, '--json', '--no-config', database], {
    capture: true,
  });
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
    maxBuffer: 512 * 1024 * 1024,
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

function isDiscordWebhookUrl(value) {
  return /^https:\/\/(?:discord(?:app)?\.com)\/api\/webhooks\/\d+\/[\w-]+/.test(value);
}

function shellQuote(value) {
  const text = String(value);
  if (/^[a-zA-Z0-9_./:=@-]+$/.test(text)) {
    return text;
  }

  return `'${text.replace(/'/g, "'\\''")}'`;
}
