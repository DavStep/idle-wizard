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

- `player`: one row per SpacetimeDB identity, with `username`, player level, connection state, and timestamps.
- `leaderboard`: one row per identity, with `username`, player level, and `totalIncome`.
- `world_chat`: one row per chat message, with sender identity, username, sender player level, body, and timestamp.
- `player_shop_listing`: one row per published player market stand, keyed by seller identity and slot number.
- `player_shop_proceeds`: one row per seller with unclaimed gold from player shop sales.
- `npc_market_price`: one row per NPC bazar item, with market price, buy/sell quotes, NPC stock, and rolling demand/supply scores.
- `npc_market_item_config`: one row per NPC bazar item, with DB-owned base market price.
- `npc_market_admin`: identities allowed to change NPC market config.

`clientConnected` creates or reconnects the player row. `clientDisconnected` marks it offline. `set_username` updates both `player.username` and the label shown in `leaderboard`.

`set_total_generated_gold` accepts the client's persisted lifetime generated gold total and keeps the server `totalIncome` at the highest reported value. Current spendable gold is not used for this value because spending lowers it.

`set_player_level` accepts the client's current task level and keeps the server player level at the highest reported value. Leaderboard rows read that level, and new chat rows store the sender level at send time.

`set_player_shop_slot` publishes a player market stand after the client reserves local inventory. `buy_player_shop_listing` decrements server listing quantity and adds server-side seller proceeds. `claim_player_shop_proceeds` clears the proceeds row after the client claims the gold locally.

`sell_to_npc` and `buy_from_npc` record player/NPC trade pressure and stock movement. `tick_npc_market` applies bounded price movement from stock plus rolling demand/supply scores. Player shop trades do not affect `npc_market_price`.

NPC market item labels and kinds still come from the backend catalog, but base market prices come from `npc_market_item_config`. `claim_npc_market_admin` lets the first caller claim market-admin rights, and `set_npc_market_item_base_price` changes a DB-owned base price after that. The derived `npc_market_price` row is updated immediately, so connected clients see the new quote through their existing price subscription. Sell quotes are still computed from the market price; currently `npcBuyPriceGold` is 80% of `marketPriceGold`.

Example local calls after publishing the updated module:

```sh
spacetime call -s local idle-wizard claim_npc_market_admin
spacetime call -s local idle-wizard set_npc_market_item_base_price manaTonic 10
```

## Client Wiring

The web client starts safely even before generated bindings exist. After `npm run stdb:generate`, `BackendFacade.start()` loads `src/backend/spacetimedb/module_bindings/index.ts`, connects, hydrates the current username from the user's `player` row, and subscribes to:

```sql
SELECT * FROM player
SELECT * FROM leaderboard
SELECT * FROM world_chat
SELECT * FROM player_shop_listing
SELECT * FROM player_shop_proceeds
SELECT * FROM npc_market_price
```

The `player` row is treated as the source of truth on reconnect, then later local username edits are sent through `set_username`. Local generated gold totals are sent through `set_total_generated_gold`, and local task levels are sent through `set_player_level`. The subscribed leaderboard rows are exposed as top-ten lists plus `currentGeneratedGoldUser` / `currentIncomeUser` rank rows for the Workshop leaderboard popup.

The client does not need to subscribe to `npc_market_item_config` for normal play. Shop UI reads `npc_market_price`, which is the derived live quote table.
