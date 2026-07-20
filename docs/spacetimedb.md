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
and SHA-1 configured in Google Cloud. Player APKs must be signed with the same
certificate registered for `com.idlewizard.game`; the current pre-production
release flow uses the existing Android debug key because that is the account
compatible certificate. Before switching to a true release keystore, register
that keystore SHA-1 and test account connect/restore on device. The older native
OIDC handoff flow is disabled in production because browser-side code exchange
against the web OAuth client can fail with `client_secret is missing`.

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
VITE_ENABLE_NATIVE_OIDC=false
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
- `player_inbox_mail`: private system mail rows for admin rewards, broadcast news, and world-event rewards. Clients read only their own rows through `own_player_inbox_mail`.
- `leaderboard`: one row per identity, with `username`, player level, all-time `totalIncome`, current daily/weekly/monthly income counters, and period keys.
- `leaderboard_summary`: public indexed view returning each period top 100 plus the subscribing player's own row, alliance tag, and rank fields.
- `world_event_leaderboard`: one row per identity/event period, with `username`, player level, event id, period key, and current event points.
- `world_event_leaderboard_summary`: public indexed view returning the current weekly event top 100 plus the subscribing player's own row, alliance tag, character, and rank.
- `world_chat`: one row per chat message, with sender identity, username, sender player level, alliance tag, body, and timestamp. `world_chat_recent` exposes only the latest 40 messages for the client and joins the sender character for avatar display.
- `trade_alliance`: one row per alliance, with unique tag, leader identity, join mode, member count, all-time/daily/weekly/monthly income totals, and period keys.
- `trade_alliance_member`: one row per member identity, with alliance id, username/player-level snapshot, role, lifetime contribution, and current weekly contribution in the legacy `dailyContribution` column.
- `trade_alliance_application`: pending join requests for apply-mode alliances.
- `trade_alliance_quest_progress` and `trade_alliance_quest_contribution`: weekly alliance quest progress and per-player contribution rows.
- `trade_alliance_chat` and `trade_alliance_reward_inbox`: private base tables exposed through sender-scoped views for the current member/reward recipient; alliance chat rows join the sender character for avatar display.
- `player_shop_listing`: one row per published player market stand, keyed by seller identity and slot number.
- `player_shop_proceeds`: one row per identity with aggregate claimable coin from player shop sales and potion discovery royalties.
- `potion_recipe_royalty`: one row per awarded potion discovery royalty, exposed to the recipient through `own_potion_recipe_royalty_history`.
- `potion_recipe_discovery`: global recipe discovery rows; clients subscribe through `potion_recipe_discovery_snapshot`.
- `npc_market_price`: one row per NPC bazar item, with market price, buy/sell quotes, NPC need, and rolling fulfilled/supply scores. Clients subscribe through `npc_market_price_snapshot`.
- `npc_market_item_config`: one row per NPC bazar item, with DB-owned base market price.
- `npc_market_admin`: identities allowed to change NPC market config.
- `maintenance_state`: private one-time server maintenance markers, including NPC market demand/stock reset keys.

`clientConnected` creates or reconnects the player row. `clientDisconnected` marks it offline. `set_username` updates both `player.username` and the label shown in `leaderboard`. `set_player_profile` updates username, theme, font, color mode, and username prompt state together.

`admin_kick_player_session` is a non-destructive admin recovery path for a stuck account session. It invalidates the player's current `player_session` row and marks the shared player row offline; the next real player connection recreates the session. It does not edit gameplay save JSON, coin, level, research, plots, chat, or market data.

`admin_copy_player_progression` copies one player's gameplay save, player level, leaderboard income, and world-event leaderboard points onto another player identity without deleting the source player. It preserves the target player's username and visual profile fields, then kicks the target session so stale clients cannot immediately republish the old save. It does not copy chat, alliance membership, feedback, or player-market rows.

`admin_set_player_level_by_identity` sets one player's real gameplay level by identity. It updates `player.player_level`, `leaderboard.player_level`, world-event/alliance level snapshots, and gameplay save `tasks.currentLevel`, then kicks the target session so the next load hydrates the edited save.

Player inbox mail uses deterministic keys in the form `sourceType:sourceKey:recipientIdentity`, so retrying the same admin send, broadcast, or event settlement is idempotent. Admin reducers are:

- `admin_send_player_inbox_mail(identityHex, sourceKey, title, body, coinReward, crystalReward, rubyReward, emeraldReward, itemRewardsJson)`
- `admin_send_player_inbox_broadcast(sourceKey, title, body, coinReward, crystalReward, rubyReward, emeraldReward, itemRewardsJson)`
- `admin_settle_world_event_inbox_rewards(periodKey, eventId, headline)`

`itemRewardsJson` is an array like `[{"itemKey":"sageSeed","quantity":5}]`. Broadcasts create rows only for current `player` rows. Event settlement ranks `world_event_leaderboard` rows by points descending then identity, requires at least `2000` points, and sends the current event-tier crystal/emerald rewards to qualified players. A private `world_event_reward_settlement_tick` schedule checks once per minute and settles ended world-event periods automatically; the admin settlement reducer remains a manual backfill/test path.

`set_player_gameplay_save` validates bounded JSON and stores the sender's gameplay save in `player_gameplay_save`. On startup, the web client waits for the own-save subscription before opening the room gate, applies the saved gameplay snapshot, unsubscribes from the own-save stream, and then autosaves back through the reducer. Gameplay save data no longer uses browser local storage in normal app wiring.

Maintenance mode lives in `game_config` under the `maintenance` key. `off` allows normal play. `drain` makes updated clients stop gameplay and flush one final `set_player_gameplay_save` while other player writes are rejected. `locked` rejects all player writes, including gameplay saves, so old clients cannot overwrite rows during a player-save migration. Use `set_maintenance_mode` for ops and follow `docs/maintenance.md` before live data work. `migrate_player_gameplay_saves` requires `locked`, preserves `savedAt`, never deletes rows, and records a one-time migration key in `maintenance_state`.

`admin_reset_player_progression_data` is the full player reset path that preserves account identity. It requires a configured admin identity plus `locked` maintenance mode and a one-time reset key. It keeps each `player.identity` so the same Google-derived identity/token reconnects to the same account, but resets every other player field to fresh-account defaults, including username/profile settings, level, prompt state, connection state, and account timestamps. It invalidates active player sessions so already-open clients cannot resume stale in-memory state, deletes gameplay saves, inbox mail, player feedback, leaderboard rows, world-event leaderboard rows, world chat rows, all trade alliance rows, player shop rows, potion discoveries/royalties, and resets NPC market pressure/stock. Updated clients reload fresh server state when locked maintenance ends; invalidated session rows are replaced by the next real connection. It does not delete `player` identities, game/research config, NPC market item config, NPC market admins, or maintenance state.

Trade alliance create, join, and apply reducers independently enforce the level 4 unlock from the server-owned player/save state. A client UI that still displays stale unlocked controls cannot enter or create an alliance for a fresh level 1 account.

`admin_wipe_all_player_data` is the full player account and progression delete path. It also requires a configured admin identity plus `locked` maintenance mode and a one-time reset key. It deletes `player`, `player_session`, `player_feedback`, gameplay saves, inbox mail, leaderboard rows, world-event leaderboard rows, world chat rows, all trade alliance rows, player shop rows, and potion discoveries, then resets NPC market pressure/stock. It does not delete game/research config, NPC market item config, NPC market admins, or maintenance state.

Period loops use server UTC time. Daily periods reset at UTC 00:00, which is 04:00 in Armenia. Weekly and monthly loops are anchored at Monday, 2026-06-08 00:00 UTC; weekly spans 7 days and monthly spans 30 days.

`set_total_generated_coin` accepts client-reported lifetime generated coin, but only as a non-decreasing value bounded by player level. Connect-time sanitation clamps old leaderboard rows to the same cap and rolls period counters when the server day/week/month key changes. The accepted delta raises the player's daily, weekly, monthly, and all-time leaderboard income, plus alliance income and current weekly alliance-income quest progress when the player is in an alliance.

`set_world_event_contribution_points` accepts client-reported current weekly event points, but only after that identity has an accepted `player_gameplay_save` row, only for the active event period, and only as a non-decreasing value bounded by player level. The client subscribes to `world_event_leaderboard_summary`, so the Workshop event leaderboard receives shared user rows instead of only local fallback points. The summary hides event rows for identities without an accepted gameplay save so empty pre-hydration accounts cannot appear in the public event ranking.

`set_player_level` accepts bounded client-reported task levels for shared display. `announce_level_up` is separate and posts a system world-chat row only when task completion advances the local level, so restored saves can sync level without replaying old level-up notices.

Player market exchange reducers are enabled for public listings, public requests, purchases, aggregate claimable proceeds, trade history, and own royalty history. The backend caps listing/request quantity at `1000` units, unit price at `1000000` coin, and one trade total at `10000000` coin.

`sell_to_npc` records an NPC buyer sale. It reduces `npc_need`, raises the fulfilled/supply score, increases shared `npc_stock`, and recomputes the backend quote. NPC demand recovers lazily when market rows are touched: the current weekly boundary clears carried demand, then UTC buyer waves add demand, with a large wave at day start and smaller waves every six hours. During a server data reset, the module clears NPC market demand and stock once using a `maintenance_state` key tied to `PLAYER_DATA_RESET_GUARD_MICROS`.

NPC market item labels and kinds still come from the backend catalog, but base market prices come from `npc_market_item_config`. `claim_npc_market_admin` and all admin config writes are locked to `NPC_MARKET_ADMIN_IDENTITY_HEX_ALLOWLIST` in `spacetimedb/src/index.ts`; legacy `npc_market_admin` rows are not authorization. `set_npc_market_item_base_price` changes a DB-owned base price after that. `reset_npc_market` restores neutral demand, clears rolling scores, resets prices to base, and clears NPC stock. The derived `npc_market_price` row is updated immediately, so connected clients see the new quote through their existing price subscription. Quotes are computed from uncapped `npc_need / target_need` pressure; currently `npcBuyPriceCoin` is 80% of `marketPriceCoin` and `npcSellPriceCoin` is 120%.

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
SELECT * FROM own_player_inbox_mail
SELECT * FROM leaderboard_summary
SELECT * FROM world_chat_recent
SELECT * FROM public_player_shop_listing
SELECT * FROM own_player_shop_listing
SELECT * FROM own_player_shop_proceeds
SELECT * FROM player_shop_trade_recent
SELECT * FROM own_player_shop_trade_history
SELECT * FROM own_potion_recipe_royalty_history
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

The own `player` profile view is treated as the source of truth on reconnect, then later local profile edits are sent through `set_player_profile`. The `player_gameplay_save` row owns the full gameplay restore path. Local task levels sync through `set_player_level`; local generated coin totals call throttled `set_total_generated_coin`, and the server stores capped income values on `leaderboard`. Local weekly event points call throttled `set_world_event_contribution_points`, and the server stores capped event points on `world_event_leaderboard`. The client subscribes to `leaderboard_summary`, not the raw leaderboard table, so it receives daily, weekly, monthly, and all-time top 100 rows plus the current player's rank row for the Workshop leaderboard popup. The event popup similarly reads `world_event_leaderboard_summary` for current weekly event top rows plus the current player's rank row.

The client does not need to subscribe to `npc_market_item_config` for normal play. Shop UI reads `npc_market_price`, which is the derived live quote table.

Trade alliance client code subscribes to public alliance/member/application/progress rows plus sender-scoped private views for alliance chat and reward inbox. Claiming a quest creates a reward inbox row on the server; the client grants the local crystal reward, then calls `collect_trade_alliance_reward` to mark it collected.

Player inbox client code subscribes to `own_player_inbox_mail`. Opening the top-panel `mail` dialog marks visible mail read. Claiming a reward grants currencies/items locally once, force-flushes the updated gameplay save with claimed mail keys inside `inboxRewards`, then calls `collect_player_inbox_mail_reward` so server retry confirmations cannot duplicate local rewards or mark mail collected before the local reward survives.
