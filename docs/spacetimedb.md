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

`clientConnected` creates or reconnects the player row. `clientDisconnected` marks it offline. `set_username` updates both `player.username` and the label shown in `leaderboard`.

`totalIncome` is present but should only be changed by future server-authoritative gameplay reducers. Do not let the client submit arbitrary totals.

## Client Wiring

The web client starts safely even before generated bindings exist. After `npm run stdb:generate`, `BackendFacade.start()` loads `src/backend/spacetimedb/module_bindings/index.ts`, connects, syncs the local username, and subscribes to:

```sql
SELECT * FROM leaderboard
```

The subscribed rows are exposed as `leaderboardFacade.getSnapshot().topUsers` for the Workshop leaderboard popup.
