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

## Migration Rules

- No deletes during player-save migration.
- Preserve `savedAt` unless the migration intentionally changes offline catch-up.
- Preserve all recognized save branches: `mana`, `gold`, `crystal`, `logs`, `inventory`,
  `research`, `visualSettings`, `shop`, `brewing`, `garden`, and `tasks`.
- Run migration only after `locked`.
- Keep the migration idempotent: rerunning it should not change already-migrated rows.
