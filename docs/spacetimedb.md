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
- `leaderboard`: one row per identity, with `username`, player level, all-time `totalIncome`, current daily/weekly/monthly income counters, and period keys.
- `world_chat`: one row per chat message, with sender identity, username, sender player level, alliance tag, body, and timestamp.
- `trade_alliance`: one row per alliance, with unique tag, leader identity, join mode, member count, all-time/daily/weekly/monthly income totals, and period keys.
- `trade_alliance_member`: one row per member identity, with alliance id, username/player-level snapshot, role, and contribution totals.
- `trade_alliance_application`: pending join requests for apply-mode alliances.
- `trade_alliance_quest_progress` and `trade_alliance_quest_contribution`: daily alliance quest progress and per-player contribution rows.
- `trade_alliance_chat` and `trade_alliance_reward_inbox`: private base tables exposed through sender-scoped views for the current member/reward recipient.
- `player_shop_listing`: one row per published player market stand, keyed by seller identity and slot number.
- `player_shop_proceeds`: one row per seller with unclaimed gold from player shop sales.
- `npc_market_price`: one row per NPC bazar item, with market price, buy/sell quotes, NPC need, and rolling fulfilled/supply scores.
- `npc_market_item_config`: one row per NPC bazar item, with DB-owned base market price.
- `npc_market_admin`: identities allowed to change NPC market config.

`clientConnected` creates or reconnects the player row. `clientDisconnected` marks it offline. `set_username` updates both `player.username` and the label shown in `leaderboard`. `set_player_profile` updates username, theme, font, color mode, and username prompt state together.

`set_player_gameplay_save` validates bounded JSON and stores the sender's gameplay save in `player_gameplay_save`. On startup, the web client waits for this subscription before opening the room gate, applies the saved gameplay snapshot, and then autosaves back through the reducer. Gameplay save data no longer uses browser local storage in normal app wiring.

`set_total_generated_gold` accepts client-reported lifetime generated gold, but only as a non-decreasing value bounded by player level. Connect-time sanitation clamps old leaderboard rows to the same cap and rolls period counters when the server day/week/month key changes. The accepted delta raises the player's daily, weekly, monthly, and all-time leaderboard income, plus alliance income and current daily alliance-income quest progress when the player is in an alliance.

`set_player_level` accepts bounded client-reported task levels for shared display. `announce_level_up` is separate and posts a system world-chat row only when task completion advances the local level, so restored saves can sync level without replaying old level-up notices.

Player market exchange reducers are locked down until inventory and spendable gold are server-authoritative. On connect, the module clears old `player_shop_listing`, `player_shop_proceeds`, and `player_shop_trade` rows so stale poisoned market state cannot be claimed.

`sell_to_npc` records a one-way NPC buyer sale. It reduces `npc_need`, raises the fulfilled/supply score, and recomputes the backend quote. `tick_npc_market` replenishes `npc_need` over time and recomputes prices from current need. `buy_from_npc` is rejected because the current game has no NPC seller flow.

NPC market item labels and kinds still come from the backend catalog, but base market prices come from `npc_market_item_config`. `claim_npc_market_admin` and all admin config writes are locked to `NPC_MARKET_ADMIN_IDENTITY_HEX_ALLOWLIST` in `spacetimedb/src/index.ts`; legacy `npc_market_admin` rows are not authorization. `set_npc_market_item_base_price` changes a DB-owned base price after that. The derived `npc_market_price` row is updated immediately, so connected clients see the new quote through their existing price subscription. Sell quotes are computed from the need-derived market price; currently `npcBuyPriceGold` is 80% of `marketPriceGold`.

`upsert_game_config` accepts only known config keys (`tasks`, `playerLevel`, `garden`, `shop`, `research`, `brewing`, `tradeAlliance`, `items`, `potionRecipes`) and validates bounded schemas before storing JSON. Existing invalid rows are reset to the built-in defaults on connect. The `tradeAlliance` config currently owns `dailyQuests`; the supported quest type is `allianceIncome`.

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
SELECT * FROM research_config
SELECT * FROM game_config
SELECT * FROM trade_alliance
SELECT * FROM trade_alliance_member
SELECT * FROM trade_alliance_application
SELECT * FROM trade_alliance_quest_progress
SELECT * FROM trade_alliance_quest_contribution
SELECT * FROM own_trade_alliance_chat
SELECT * FROM own_trade_alliance_reward_inbox
```

The `player` row is treated as the source of truth on reconnect, then later local profile edits are sent through `set_player_profile`. The `player_gameplay_save` row owns the full gameplay restore path. Local task levels sync through `set_player_level`; local generated gold totals call `set_total_generated_gold`, and the server stores capped income values on `leaderboard`. The subscribed leaderboard rows are exposed as daily, weekly, monthly, and all-time top-ten lists plus matching current-user rank rows for the Workshop leaderboard popup.

The client does not need to subscribe to `npc_market_item_config` for normal play. Shop UI reads `npc_market_price`, which is the derived live quote table.

Trade alliance client code subscribes to public alliance/member/application/progress rows plus sender-scoped private views for alliance chat and reward inbox. Claiming a quest creates a reward inbox row on the server; the client grants the local crystal reward, then calls `collect_trade_alliance_reward` to mark it collected.
