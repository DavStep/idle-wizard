# Maintenance Runbook

Use this when a backend deploy or player-save migration could race active clients.

Do not run live maintenance until a fresh player-save backup exists and all active game
clients have had a drain window.

## Modes

- `off`: normal play.
- `drain`: clients show maintenance, stop gameplay, and flush one final save.
- `locked`: server rejects player writes, including gameplay saves.

## Commands

The checked helper wraps the same commands and refuses mutating actions without
`--confirm-live`:

```sh
node scripts/maintenance.js plan
```

Set the shared shell vars first:

```sh
export SPACETIME_SERVER=maincloud
export SPACETIME_DATABASE=idle-wizard
# Prefer a reset/maintenance-specific channel webhook.
export DISCORD_RESET_WEBHOOK_URL="https://discord.com/api/webhooks/..."
```

Preflight the live schema:

```sh
node scripts/maintenance.js schema \
  --server "$SPACETIME_SERVER" --database "$SPACETIME_DATABASE"
```

If `set_maintenance_mode` is missing, publish the backend gate first. This ships
maintenance support with default-off behavior before any player-facing drain:

```sh
node scripts/maintenance.js publish \
  --server "$SPACETIME_SERVER" --database "$SPACETIME_DATABASE" \
  --confirm-live
```

Deploy the client maintenance gate to players before starting drain, otherwise
old clients will not show the maintenance screen.

Start drain:

```sh
node scripts/maintenance.js drain \
  --server "$SPACETIME_SERVER" --database "$SPACETIME_DATABASE" \
  --confirm-live

# Raw command:
PATH="$HOME/.local/bin:$PATH" spacetime call \
  -s "$SPACETIME_SERVER" "$SPACETIME_DATABASE" \
  set_maintenance_mode drain "maintenance in progress"
```

Wait 2-3 minutes, then lock writes:

```sh
node scripts/maintenance.js locked \
  --server "$SPACETIME_SERVER" --database "$SPACETIME_DATABASE" \
  --confirm-live

# Raw command:
PATH="$HOME/.local/bin:$PATH" spacetime call \
  -s "$SPACETIME_SERVER" "$SPACETIME_DATABASE" \
  set_maintenance_mode locked "maintenance in progress"
```

Back up player saves before any migration:

```sh
node scripts/maintenance.js backup \
  --server "$SPACETIME_SERVER" --database "$SPACETIME_DATABASE"

# Raw command:
mkdir -p backups/maintenance
PATH="$HOME/.local/bin:$PATH" spacetime sql \
  -s "$SPACETIME_SERVER" "$SPACETIME_DATABASE" \
  "SELECT identity, updated_at, save_json FROM player_gameplay_save" \
  > "backups/maintenance/player_gameplay_save_$(date -u +%Y%m%dT%H%M%SZ).sql.txt"
```

Verify row count and parseable save count:

```sh
node scripts/maintenance.js verify \
  --server "$SPACETIME_SERVER" --database "$SPACETIME_DATABASE"

# Raw commands:
PATH="$HOME/.local/bin:$PATH" spacetime sql \
  -s "$SPACETIME_SERVER" "$SPACETIME_DATABASE" \
  "SELECT COUNT(*) FROM player_gameplay_save"

PATH="$HOME/.local/bin:$PATH" spacetime sql \
  -s "$SPACETIME_SERVER" "$SPACETIME_DATABASE" \
  "SELECT COUNT(*) FROM admin_player_gameplay_save"
```

The second count uses the admin save view, which only includes rows whose save JSON
parses. Counts must match before proceeding.

Sample saves:

```sh
PATH="$HOME/.local/bin:$PATH" spacetime sql \
  -s "$SPACETIME_SERVER" "$SPACETIME_DATABASE" \
  "SELECT identity, current_gold, current_crystal, updated_at FROM admin_player_gameplay_save LIMIT 10"
```

## Full Player Reset (Preserve Identity)

Use this only when intentionally making every player start over while preserving
their account identity and any connected Google account. The Google connection is
represented by the Google-derived SpacetimeDB identity/token rather than a game
table. This keeps each `player.identity`, resets every other `player` field to a
fresh-account value, clears active player sessions, and deletes gameplay and
shared player state.

The reset requires `locked` maintenance mode and a one-time reset key. Before
running it, drain active clients, lock writes, and take a progression backup:

```sh
node scripts/maintenance.js backup-reset \
  --server "$SPACETIME_SERVER" --database "$SPACETIME_DATABASE"
```

This backs up:

```txt
player
player_gameplay_save
player_session
player_inbox_mail
player_feedback
leaderboard
world_event_leaderboard
world_chat
trade_alliance*
player_shop*
potion_recipe_discovery
potion_recipe_royalty
npc_market_price
```

Run the reset while still locked:

```sh
node scripts/maintenance.js reset-progress \
  --server "$SPACETIME_SERVER" --database "$SPACETIME_DATABASE" \
  --key YYYY-MM-DD-reset --post-discord --confirm-live
```

`--post-discord` posts a long human reset notice before the reducer runs. It uses
`DISCORD_RESET_WEBHOOK_URL`, `DISCORD_MAINTENANCE_WEBHOOK_URL`, or
`DISCORD_WEBHOOK_URL`. Preview the exact text without posting:

```sh
node scripts/maintenance.js reset-discord-post \
  --server "$SPACETIME_SERVER" --database "$SPACETIME_DATABASE" \
  --key YYYY-MM-DD-reset --dry-run
```

Post only the Discord notice, for example if the reset must be delayed:

```sh
node scripts/maintenance.js reset-discord-post \
  --server "$SPACETIME_SERVER" --database "$SPACETIME_DATABASE" \
  --key YYYY-MM-DD-reset --confirm-live
```

Use `--discord-message "..."` or `DISCORD_RESET_MESSAGE` when the announcement
needs a custom human-written changelog-style note.

Then verify the reset:

```sh
node scripts/maintenance.js verify-reset \
  --server "$SPACETIME_SERVER" --database "$SPACETIME_DATABASE"
```

Expected post-reset counts:

- `player_count` remains nonzero if accounts exist, preserving their identities.
- all non-default profile counts, `prompted_username`, `connected_player_count`,
  `above_level_1`, and `player_session_count` are `0`.
- gameplay saves, inbox mail, player feedback, leaderboard, world event
  leaderboard, world chat, alliance rows, player shop rows, and potion discovery
  rows are `0`.
- NPC market rows remain, but `npc_need`, `npc_stock`, `demand_score`, and
  `supply_score` should be neutral/reset values.

After verification, publish if the reset reducer was newly added, then reopen
play with maintenance `off`.

## Full Player Data Wipe

Use this only when intentionally deleting all player accounts and all
player-owned state. This removes `player` rows too, so usernames, theme/font/color
settings, username prompt state, and Google-derived identities are not preserved.
Players recreate as fresh accounts on next connect.

The wipe requires `locked` maintenance mode and a one-time reset key. Before
running it, drain active clients, lock writes, and take a full player-data backup:

```sh
node scripts/maintenance.js backup-player-data-wipe \
  --server "$SPACETIME_SERVER" --database "$SPACETIME_DATABASE"
```

This backs up:

```txt
player
player_gameplay_save
player_inbox_mail
player_feedback
leaderboard
world_event_leaderboard
world_chat
trade_alliance*
player_shop*
potion_recipe_discovery
npc_market_price
player_session
```

Run the wipe while still locked:

```sh
node scripts/maintenance.js wipe-player-data \
  --server "$SPACETIME_SERVER" --database "$SPACETIME_DATABASE" \
  --key YYYY-MM-DD-reset --post-discord --confirm-live
```

Then verify:

```sh
node scripts/maintenance.js verify-player-data-wipe \
  --server "$SPACETIME_SERVER" --database "$SPACETIME_DATABASE"
```

Expected post-wipe counts:

- player, player session, player feedback, gameplay saves, inbox mail,
  leaderboard, world event leaderboard, world chat, alliance rows, player shop
  rows, and potion discovery rows are `0`.
- NPC market rows remain, but `npc_need`, `npc_stock`, `demand_score`, and
  `supply_score` should be neutral/reset values.

## Zero-Income Player Data Wipe

Use this only for deleting player-owned state for accounts with
`leaderboard.total_income = 0`. It deletes the matching `player` rows and related
save/session/feedback/leaderboard/chat/alliance/shop/discovery rows, but keeps
nonzero-income players and global NPC market rows.

The wipe requires `locked` maintenance mode and a one-time reset key. Before
running it, drain active clients, lock writes, and take a full player-data backup:

```sh
node scripts/maintenance.js backup-player-data-wipe \
  --server "$SPACETIME_SERVER" --database "$SPACETIME_DATABASE"
```

Run the filtered wipe while still locked:

```sh
node scripts/maintenance.js wipe-zero-income-player-data \
  --server "$SPACETIME_SERVER" --database "$SPACETIME_DATABASE" \
  --key YYYY-MM-DD-zero-income-cleanup --confirm-live
```

Then verify:

```sh
node scripts/maintenance.js verify-zero-income-player-data-wipe \
  --server "$SPACETIME_SERVER" --database "$SPACETIME_DATABASE"
```

Expected post-wipe counts:

- `zero_income_leaderboard_count` is `0`.
- `player_count` and `leaderboard_count` drop only by the matching zero-income
  identity count.

## Zero Total Coin Cleanup With Currency Grant

Use this when cleaning all account rows that have no positive total coin evidence
in either `leaderboard.total_income` or gameplay save `coin/gold.totalGenerated`,
then granting currencies to the remaining players. This also removes players that
created a `player` row but never created leaderboard/save progress.

The cleanup requires `locked` maintenance mode and a one-time key. Before running
it, drain active clients, lock writes, and take a full player-data backup:

```sh
node scripts/maintenance.js backup-player-data-wipe \
  --server "$SPACETIME_SERVER" --database "$SPACETIME_DATABASE"
```

Run the combined cleanup/grant while still locked:

```sh
node scripts/maintenance.js cleanup-zero-total-coin-grant-currency \
  --server "$SPACETIME_SERVER" --database "$SPACETIME_DATABASE" \
  --key YYYY-MM-DD-zero-total-coin-cleanup \
  --emerald 10 --ruby 10 --crystal 10 \
  --confirm-live
```

Then verify:

```sh
node scripts/maintenance.js verify-zero-total-coin-cleanup-grant \
  --server "$SPACETIME_SERVER" --database "$SPACETIME_DATABASE"
```

Expected post-cleanup state:

- `player_count`, `save_count`, and `leaderboard_count` match the remaining
  positive-total-coin players.
- `zero_income_leaderboard_count` is `0`.
- `admin_player_gameplay_save` sample rows show the intended granted currency
  amounts in `current_crystal`, `current_emerald`, and `current_ruby`.

Run the idempotent player-save migration while still locked:

```sh
node scripts/maintenance.js migrate \
  --server "$SPACETIME_SERVER" --database "$SPACETIME_DATABASE" \
  --key YYYY-MM-DD-maintenance --confirm-live

# Raw command:
PATH="$HOME/.local/bin:$PATH" spacetime call \
  -s "$SPACETIME_SERVER" "$SPACETIME_DATABASE" \
  migrate_player_gameplay_saves "YYYY-MM-DD-maintenance"
```

Then repeat row-count, parse-count, and sample-save checks. The migration reducer:

- requires `locked` maintenance mode,
- never deletes rows,
- preserves `savedAt`,
- preserves recognized save branches,
- records the migration key so the same key is one-time.

Deploy the backend usage cuts while maintenance is still locked:

```sh
node scripts/maintenance.js publish \
  --server "$SPACETIME_SERVER" --database "$SPACETIME_DATABASE" \
  --confirm-live

# Raw command:
PATH="$HOME/.local/bin:$PATH" spacetime publish \
  "$SPACETIME_DATABASE" --server "$SPACETIME_SERVER" --module-path ./spacetimedb
```

After deploy and verification, reopen play:

```sh
node scripts/maintenance.js off \
  --server "$SPACETIME_SERVER" --database "$SPACETIME_DATABASE" \
  --confirm-live

# Raw command:
PATH="$HOME/.local/bin:$PATH" spacetime call \
  -s "$SPACETIME_SERVER" "$SPACETIME_DATABASE" \
  set_maintenance_mode off "maintenance in progress"
```

For one stuck account session, kick only that session instead of resetting player data:

```sh
PATH="$HOME/.local/bin:$PATH" spacetime call \
  -s "$SPACETIME_SERVER" "$SPACETIME_DATABASE" \
  admin_kick_player_session "$PLAYER_IDENTITY_HEX"
```

## Migration Rules

- No deletes during player-save migration.
- Preserve `savedAt` unless the migration intentionally changes offline catch-up.
- Preserve all recognized save branches: `mana`, `coin`, `crystal`, `logs`, `inventory`,
  `research`, `visualSettings`, `shop`, `brewing`, `garden`, and `tasks`.
- Run migration only after `locked`.
- Keep the migration idempotent: rerunning it should not change already-migrated rows.
