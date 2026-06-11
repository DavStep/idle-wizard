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

## Public Flow

For GitHub Pages or any hosted web build, publish the database to Maincloud:

```sh
npm run stdb:publish:maincloud
```

Build hosted web assets with:

```txt
VITE_SPACETIME_URI=https://maincloud.spacetimedb.com
VITE_SPACETIME_DATABASE=idle-wizard
```

The GitHub Pages workflow already sets those values before `npm run build -- --base=/idle-wizard/`.

## Google Login

Google login uses SpacetimeAuth as the OIDC provider. Keep the Google client secret only in the SpacetimeAuth dashboard; never commit it.

Configure the SpacetimeAuth client with these redirect URIs:

```txt
https://davstep.github.io/idle-wizard/
http://127.0.0.1:55173/
```

Configure Google OAuth with this authorized redirect URI:

```txt
https://auth.spacetimedb.com/interactions/federated/callback/google
```

After SpacetimeAuth gives a client ID, set it for hosted builds as the GitHub Actions repository variable `SPACETIME_AUTH_CLIENT_ID`. Local builds can set:

```txt
VITE_SPACETIME_AUTH_CLIENT_ID=<spacetimeauth-client-id>
```

## Auth Flow

The client auth boundary is already split:

- `AuthTokenStorageManager`: saves and loads the current auth token.
- `AuthSessionManager`: decides whether the next connection should reuse a token or start anonymous.
- `SpacetimeConnectionManager`: receives the generated `DbConnection` class later and applies the auth token to the builder.

For production auth, pass an OIDC token from SpacetimeAuth or another OIDC provider through the auth session manager.

## Current Schema

The server module defines:

- `player`: one row per SpacetimeDB identity, with `username`, visual preferences, player level, connection state, and timestamps.
- `player_gameplay_save`: one row per identity, with the full gameplay save JSON and update time.
- `leaderboard`: one row per identity, with `username`, player level, and `totalIncome`.
- `world_chat`: one row per chat message, with sender identity, username, sender player level, body, and timestamp.
- `player_shop_listing`: one row per published player market stand, keyed by seller identity and slot number.
- `player_shop_proceeds`: one row per seller with unclaimed gold from player shop sales.
- `npc_market_price`: one row per NPC bazar item, with market price, buy/sell quotes, NPC stock, and rolling demand/supply scores.
- `npc_market_item_config`: one row per NPC bazar item, with DB-owned base market price.
- `npc_market_admin`: identities allowed to change NPC market config.

`clientConnected` creates or reconnects the player row. `clientDisconnected` marks it offline. `set_username` updates both `player.username` and the label shown in `leaderboard`. `set_player_profile` updates username, theme, color mode, and username prompt state together.

`set_player_gameplay_save` validates bounded JSON and stores the sender's gameplay save in `player_gameplay_save`. On startup, the web client waits for this subscription before opening the room gate, applies the saved gameplay snapshot, and then autosaves back through the reducer. Gameplay save data no longer uses browser local storage in normal app wiring.

`set_total_generated_gold` currently rejects client-authored totals by using a `0` server cap. Connect-time sanitation also clamps old leaderboard rows back to safe values. Do not re-enable shared leaderboard totals until gold is server-authoritative.

`set_player_level` accepts bounded client-reported task levels for shared display. `announce_level_up` is separate and posts a system world-chat row only when task completion advances the local level, so restored saves can sync level without replaying old level-up notices.

Player market exchange reducers are locked down until inventory and spendable gold are server-authoritative. On connect, the module clears old `player_shop_listing`, `player_shop_proceeds`, and `player_shop_trade` rows so stale poisoned market state cannot be claimed.

`sell_to_npc` and `buy_from_npc` are currently no-ops, so clients cannot move shared NPC prices for free. `tick_npc_market` still maintains catalog rows, and connect-time sanitation resets old client-driven pressure/price drift back to base quotes.

NPC market item labels and kinds still come from the backend catalog, but base market prices come from `npc_market_item_config`. `claim_npc_market_admin` and all admin config writes are locked to `NPC_MARKET_ADMIN_IDENTITY_HEX_ALLOWLIST` in `spacetimedb/src/index.ts`; legacy `npc_market_admin` rows are not authorization. `set_npc_market_item_base_price` changes a DB-owned base price after that. The derived `npc_market_price` row is updated immediately, so connected clients see the new quote through their existing price subscription. Sell quotes are still computed from the market price; currently `npcBuyPriceGold` is 80% of `marketPriceGold`.

`upsert_game_config` accepts only known config keys (`tasks`, `playerLevel`) and validates bounded schemas before storing JSON. Existing invalid rows are reset to the built-in defaults on connect.

Example local calls after adding your identity hex to `NPC_MARKET_ADMIN_IDENTITY_HEX_ALLOWLIST` and publishing the updated module:

```sh
spacetime call -s local idle-wizard claim_npc_market_admin
spacetime call -s local idle-wizard set_npc_market_item_base_price manaTonic 10
```

## Client Wiring

The web client starts safely even before generated bindings exist. After `npm run stdb:generate`, `BackendFacade.start()` loads `src/backend/spacetimedb/module_bindings/index.ts`, connects, hydrates the current username from the user's `player` row, and subscribes to:

```sql
SELECT * FROM player
SELECT * FROM player_gameplay_save
SELECT * FROM leaderboard
SELECT * FROM world_chat
SELECT * FROM player_shop_listing
SELECT * FROM player_shop_proceeds
SELECT * FROM npc_market_price
```

The `player` row is treated as the source of truth on reconnect, then later local profile edits are sent through `set_player_profile`. The `player_gameplay_save` row owns the full gameplay restore path. Local task levels sync through `set_player_level`; local generated gold totals still call their shared reducer, but generated-gold leaderboard values stay locked at safe defaults until gold is server-authoritative. The subscribed leaderboard rows are exposed as top-ten lists plus `currentGeneratedGoldUser` / `currentIncomeUser` rank rows for the Workshop leaderboard popup.

The client does not need to subscribe to `npc_market_item_config` for normal play. Shop UI reads `npc_market_price`, which is the derived live quote table.
