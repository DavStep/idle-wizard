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
VITE_SPACETIME_URI=ws://127.0.0.1:3000
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

Google login uses Google as the identity provider directly. Do not route players
through SpacetimeAuth for account linking, because the player-facing flow should
be `connect account` -> Google account picker -> return to game.

The web client uses Google Identity Services to receive a Google-signed ID token
in a JavaScript callback, then passes that JWT to SpacetimeDB as the connection
token. Do not use a browser OIDC redirect/code flow for web unless a backend
token-exchange endpoint is added.

Configure Google OAuth with these authorized JavaScript origins:

```txt
https://davstep.github.io
http://127.0.0.1:55173
http://localhost
```

The current Android app uses Google Credential Manager through the native
`NativeGoogleAuth` Capacitor plugin. Keep the Android OAuth client package name
and SHA-1 configured in Google Cloud. The hosted redirect remains as a fallback
for the older native OIDC handoff flow.

Configure Google OAuth with these authorized redirect URIs only if the fallback
native/mobile handoff flow is enabled:

```txt
https://davstep.github.io/idle-wizard/
https://davstep.github.io/idle-wizard/?native_auth=1
```

Fallback native OIDC account linking uses `https://davstep.github.io/idle-wizard/?native_auth=1`
as the Google redirect URI, then the hosted page forwards OIDC callback params
to the installed app with `com.idlewizard.game://auth/callback`.

The Google OAuth client ID is public configuration, not a secret. Hosted and
production builds read:

```txt
VITE_GOOGLE_AUTH_CLIENT_ID=<google-client-id>
VITE_GOOGLE_AUTH_MOBILE_REDIRECT_URI=https://davstep.github.io/idle-wizard/?native_auth=1
VITE_GOOGLE_AUTH_MOBILE_CALLBACK_URI=com.idlewizard.game://auth/callback
VITE_ANDROID_APP_ID=com.idlewizard.game
```

## Auth Flow

The client auth boundary is already split:

- `AuthTokenStorageManager`: saves and loads the current auth token.
- `AuthSessionManager`: decides whether the next connection should reuse a token or start anonymous.
- `SpacetimeConnectionManager`: receives the generated `DbConnection` class later and applies the auth token to the builder.

For production auth, pass a Google OIDC identity token through the auth session
manager. SpacetimeDB computes the account identity from the token issuer and
subject.

## Current Schema

The server module defines:

- `player`: one row per SpacetimeDB identity, with `username`, visual preferences, player level, connection state, and timestamps.
- `player_gameplay_save`: one row per identity, with the full gameplay save JSON and update time.
- `leaderboard`: one row per identity, with `username`, player level, all-time `totalIncome`, current daily/weekly/monthly income counters, and period keys.
- `leaderboard_summary`: public indexed view returning each period top 100 plus the subscribing player's own row, alliance tag, and rank fields.
- `world_chat`: one row per chat message, with sender identity, username, sender player level, alliance tag, body, and timestamp. `world_chat_recent` exposes only the latest 40 messages for the client and joins the sender character for avatar display.
- `trade_alliance`: one row per alliance, with unique tag, leader identity, join mode, member count, all-time/daily/weekly/monthly income totals, and period keys.
- `trade_alliance_member`: one row per member identity, with alliance id, username/player-level snapshot, role, lifetime contribution, and current weekly contribution in the legacy `dailyContribution` column.
- `trade_alliance_application`: pending join requests for apply-mode alliances.
- `trade_alliance_quest_progress` and `trade_alliance_quest_contribution`: weekly alliance quest progress and per-player contribution rows.
- `trade_alliance_chat` and `trade_alliance_reward_inbox`: private base tables exposed through sender-scoped views for the current member/reward recipient; alliance chat rows join the sender character for avatar display.
- `player_shop_listing`: one row per published player market stand, keyed by seller identity and slot number.
- `player_shop_proceeds`: one row per seller with unclaimed gold from player shop sales.
- `potion_recipe_discovery`: global recipe discovery rows; clients subscribe through `potion_recipe_discovery_snapshot`.
- `npc_market_price`: one row per NPC bazar item, with market price, buy/sell quotes, NPC need, and rolling fulfilled/supply scores. Clients subscribe through `npc_market_price_snapshot`.
- `npc_market_item_config`: one row per NPC bazar item, with DB-owned base market price.
- `npc_market_admin`: identities allowed to change NPC market config.
- `maintenance_state`: private one-time server maintenance markers, including NPC market demand/stock reset keys.

`clientConnected` creates or reconnects the player row. `clientDisconnected` marks it offline. `set_username` updates both `player.username` and the label shown in `leaderboard`. `set_player_profile` updates username, theme, font, color mode, and username prompt state together.

`set_player_gameplay_save` validates bounded JSON and stores the sender's gameplay save in `player_gameplay_save`. On startup, the web client waits for the own-save subscription before opening the room gate, applies the saved gameplay snapshot, unsubscribes from the own-save stream, and then autosaves back through the reducer. Gameplay save data no longer uses browser local storage in normal app wiring.

Maintenance mode lives in `game_config` under the `maintenance` key. `off` allows normal play. `drain` makes updated clients stop gameplay and flush one final `set_player_gameplay_save` while other player writes are rejected. `locked` rejects all player writes, including gameplay saves, so old clients cannot overwrite rows during a player-save migration. Use `set_maintenance_mode` for ops and follow `docs/maintenance.md` before live data work. `migrate_player_gameplay_saves` requires `locked`, preserves `savedAt`, never deletes rows, and records a one-time migration key in `maintenance_state`.

`admin_reset_player_progression_data` is the full player progression wipe path. It requires a configured admin identity plus `locked` maintenance mode and a one-time reset key. It keeps `player` account/profile rows, resets their shared `player_level` to 1, touches `last_seen_at` so stale open clients cannot republish old in-memory saves, deletes gameplay saves, leaderboard rows, world chat rows, all trade alliance rows, player shop rows, potion discoveries, and resets NPC market pressure/stock. It does not delete `player`, `player_session`, `player_feedback`, game/research config, NPC market item config, NPC market admins, or maintenance state.

`admin_wipe_all_player_data` is the full player account and progression delete path. It also requires a configured admin identity plus `locked` maintenance mode and a one-time reset key. It deletes `player`, `player_session`, `player_feedback`, gameplay saves, leaderboard rows, world chat rows, all trade alliance rows, player shop rows, and potion discoveries, then resets NPC market pressure/stock. It does not delete game/research config, NPC market item config, NPC market admins, or maintenance state.

Period loops use server UTC time. Daily periods reset at UTC 00:00, which is 04:00 in Armenia. Weekly and monthly loops are anchored at Monday, 2026-06-08 00:00 UTC; weekly spans 7 days and monthly spans 30 days.

`set_total_generated_gold` accepts client-reported lifetime generated gold, but only as a non-decreasing value bounded by player level. Connect-time sanitation clamps old leaderboard rows to the same cap and rolls period counters when the server day/week/month key changes. The accepted delta raises the player's daily, weekly, monthly, and all-time leaderboard income, plus alliance income and current weekly alliance-income quest progress when the player is in an alliance.

`set_player_level` accepts bounded client-reported task levels for shared display. `announce_level_up` is separate and posts a system world-chat row only when task completion advances the local level, so restored saves can sync level without replaying old level-up notices.

Player market exchange reducers are locked down until inventory and spendable gold are server-authoritative. On connect, the module clears old `player_shop_listing`, `player_shop_proceeds`, and `player_shop_trade` rows so stale poisoned market state cannot be claimed.

`sell_to_npc` records an NPC buyer sale. It reduces `npc_need`, raises the fulfilled/supply score, increases shared `npc_stock`, and recomputes the backend quote. `scheduled_tick_npc_market` runs from the `npc_market_tick_schedule` SpacetimeDB schedule table every 5 minutes to replenish `npc_need` and recompute prices; trades also apply any due tick inline before changing market rows. During a server data reset, the module clears NPC market demand and stock once using a `maintenance_state` key tied to `PLAYER_DATA_RESET_GUARD_MICROS`.

NPC market item labels and kinds still come from the backend catalog, but base market prices come from `npc_market_item_config`. `claim_npc_market_admin` and all admin config writes are locked to `NPC_MARKET_ADMIN_IDENTITY_HEX_ALLOWLIST` in `spacetimedb/src/index.ts`; legacy `npc_market_admin` rows are not authorization. `set_npc_market_item_base_price` changes a DB-owned base price after that. `reset_npc_market` restores neutral demand, clears rolling scores, resets prices to base, and clears NPC stock. The derived `npc_market_price` row is updated immediately, so connected clients see the new quote through their existing price subscription. Quotes are computed from uncapped `npc_need / target_need` pressure; currently `npcBuyPriceGold` is 80% of `marketPriceGold` and `npcSellPriceGold` is 120%.

`upsert_game_config` accepts only known config keys (`tasks`, `playerLevel`, `garden`, `shop`, `research`, `brewing`, `tradeAlliance`, `items`, `potionRecipes`, `maintenance`) and validates bounded schemas before storing JSON. Existing invalid rows are reset to the built-in defaults on connect. The `tradeAlliance` config currently owns `weeklyQuests`; legacy `dailyQuests` rows are still accepted. Supported quest types are `allianceIncome` and `itemFill`; item-fill quest ids must use `itemFill:<itemKey>` for an exact seed or potion key.

Example local calls after adding your identity hex to `NPC_MARKET_ADMIN_IDENTITY_HEX_ALLOWLIST` and publishing the updated module:

```sh
spacetime call -s local idle-wizard claim_npc_market_admin
spacetime call -s local idle-wizard set_npc_market_item_base_price manaTonic 10
spacetime call -s local idle-wizard reset_npc_market
spacetime call -s local idle-wizard set_maintenance_mode drain "maintenance in progress"
spacetime call -s local idle-wizard set_maintenance_mode locked "maintenance in progress"
spacetime call -s local idle-wizard migrate_player_gameplay_saves "local-test"
spacetime call -s local idle-wizard set_maintenance_mode off "maintenance in progress"
```

## Client Wiring

The web client starts safely even before generated bindings exist. After `npm run stdb:generate`, `BackendFacade.start()` loads `src/backend/spacetimedb/module_bindings/index.ts`, connects, hydrates the current username from the user's `player` row, and subscribes to:

```sql
SELECT * FROM own_player_profile
SELECT * FROM own_player_session
SELECT * FROM own_player_gameplay_save
SELECT * FROM leaderboard_summary
SELECT * FROM world_chat_recent
SELECT * FROM public_player_shop_listing
SELECT * FROM own_player_shop_listing
SELECT * FROM own_player_shop_proceeds
SELECT * FROM player_shop_trade_recent
SELECT * FROM own_player_shop_trade_history
SELECT * FROM npc_market_price_snapshot
SELECT * FROM potion_recipe_discovery_snapshot
SELECT * FROM research_config_snapshot
SELECT * FROM game_config_snapshot
SELECT * FROM trade_alliance_snapshot
SELECT * FROM trade_alliance_member_snapshot
SELECT * FROM trade_alliance_application_snapshot
SELECT * FROM trade_alliance_quest_progress_snapshot
SELECT * FROM trade_alliance_quest_contribution_snapshot
SELECT * FROM own_trade_alliance_chat
SELECT * FROM own_trade_alliance_reward_inbox
```

The own `player` profile view is treated as the source of truth on reconnect, then later local profile edits are sent through `set_player_profile`. The `player_gameplay_save` row owns the full gameplay restore path. Local task levels sync through `set_player_level`; local generated gold totals call throttled `set_total_generated_gold`, and the server stores capped income values on `leaderboard`. The client subscribes to `leaderboard_summary`, not the raw leaderboard table, so it receives daily, weekly, monthly, and all-time top 100 rows plus the current player's rank row for the Workshop leaderboard popup.

The client does not need to subscribe to `npc_market_item_config` for normal play. Shop UI reads `npc_market_price`, which is the derived live quote table.

Trade alliance client code subscribes to public alliance/member/application/progress rows plus sender-scoped private views for alliance chat and reward inbox. Claiming a quest creates a reward inbox row on the server; the client grants the local crystal reward, then calls `collect_trade_alliance_reward` to mark it collected.
