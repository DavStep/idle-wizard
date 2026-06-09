# SpacetimeDB Setup

The project follows the SpacetimeDB 2.x flow:

- client SDK package: `spacetimedb`
- generated client bindings: `src/backend/spacetimedb/module_bindings/`
- server module path: `spacetimedb/`
- project config: `spacetime.json`

## Local Flow

Install the SpacetimeDB CLI, then run:

```sh
npm run stdb:start
npm run stdb:publish
npm run stdb:generate
```

The scripts add `$HOME/.local/bin` to `PATH`, because the official installer places the CLI at `~/.local/bin/spacetime` on this machine.

This local setup uses the saved SpacetimeDB server nickname `local` (`http://127.0.0.1:3000`) and publishes the `idle-wizard` database there. `local` is the default CLI server for this workspace.

The client defaults are in `.env.example`:

```txt
VITE_SPACETIME_URI=ws://localhost:3000
VITE_SPACETIME_DATABASE=idle-wizard
```

## Auth Flow

The client auth boundary is already split:

- `AuthTokenStorageManager`: saves and loads the current auth token.
- `AuthSessionManager`: decides whether the next connection should reuse a token or start anonymous.
- `SpacetimeConnectionManager`: receives the generated `DbConnection` class later and applies the auth token to the builder.

For production auth, pass an OIDC token from SpacetimeAuth or another OIDC provider through the auth session manager.

## Current Schema

The server module defines:

- `player`: one row per SpacetimeDB identity, with `username`, connection state, and timestamps.
- `leaderboard`: one row per identity, with `username` and `totalIncome`.
- `player_shop_listing`: one row per published player shop slot, keyed by seller identity and slot number.
- `player_shop_proceeds`: one row per seller with unclaimed gold from player shop sales.

`clientConnected` creates or reconnects the player row. `clientDisconnected` marks it offline. `set_username` updates both `player.username` and the label shown in `leaderboard`.

`set_total_generated_gold` accepts the client's persisted lifetime generated gold total and keeps the server `totalIncome` at the highest reported value. Current spendable gold is not used for this value because spending lowers it.

`set_player_shop_slot` publishes a player shelf slot after the client reserves local inventory. `buy_player_shop_listing` decrements server listing quantity and adds server-side seller proceeds. `claim_player_shop_proceeds` clears the proceeds row after the client claims the gold locally.

## Client Wiring

The web client starts safely even before generated bindings exist. After `npm run stdb:generate`, `BackendFacade.start()` loads `src/backend/spacetimedb/module_bindings/index.ts`, connects, hydrates the current username from the user's `player` row, and subscribes to:

```sql
SELECT * FROM player
SELECT * FROM leaderboard
SELECT * FROM player_shop_listing
SELECT * FROM player_shop_proceeds
```

The `player` row is treated as the source of truth on reconnect, then later local username edits are sent through `set_username`. Local generated gold totals are sent through `set_total_generated_gold`. The subscribed leaderboard rows are exposed as `leaderboardFacade.getSnapshot().topUsers` for the Workshop leaderboard popup.
