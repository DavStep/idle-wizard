---
title: Experience: Communication
tags:
  - engineering
  - liveops
  - experience
status: active
world: engineering-liveops
experience_type: communication
---

# Experience: Communication

- Use Ponytail-style engineering by default: read first, then make the smallest correct change; keep communication concise, technical, and no-filler.
- If a requested feature is ambiguous, ask first instead of guessing.
- For new game design requests, ask about open questions or suggest better options before starting when useful.
- The user wants only what was asked for; avoid adding gameplay, visuals, or extra systems early.
- Before any change that can cause player data loss or needs migration, warn the user first; even after approval, ask one more explicit confirmation before making the change.
- Persistent save/schema/config shape changes need explicit migration code or scripts before deploy; never rely on wiping rows, startup defaults, or page reloads to move users forward.
- SpacetimeDB `normalizePlayerGameplaySave` drops unlisted save branches; add any new persisted client branch there as well as client migration/load/save code.
- Inventory quantities can be capped by SpacetimeDB save normalization even when local `ItemsFacade` has no cap; check `normalizeSaveInventory` for reload-only item reductions.
- Before resetting SpacetimeDB player data, close or navigate away all active game clients; open clients can reconnect and republish old in-memory saves into the emptied database.
- When loading a prod save into local SpacetimeDB for desktop QA, direct-SQL the `player_gameplay_save` row and clear that identity's `player_session`; reducer import while the client is open can be overwritten by stale in-memory saves.
- To clone test progression between live accounts while keeping the target profile, use `admin_copy_player_progression`; `admin_merge_player_accounts` moves/deletes the source and copies source profile settings.
- Production player level fixes must update gameplay save `tasks.currentLevel` as well as `player.player_level`; profile-only level edits revert visually after save reload.
- For player-save maintenance, use `drain` first so updated clients stop and flush, then `locked` before backup/migration so old clients cannot overwrite migrated rows.
- Single-account support currency grants need a server pending-grant guard through the next client save; active clients can reconnect and autosave stale in-memory currency over a one-shot admin save edit.
- When correcting live currency after a bad admin grant, clear the stale `player-currency-grant-pending:*` row or it can preserve/refill the old amount on future saves.
- Full player progression wipes should use `admin_reset_player_progression_data` while maintenance is `locked`, after `backup-reset`; do not do ad hoc table deletes.
- Full reset backup/verify tooling must include every reducer-deleted player table, including inbox mail, feedback, world-event leaderboard rows, and player shop requests.
- Maintenance helper `--dry-run` paths must return before any reducer call; the confirmation guard alone does not make an action non-mutating.
- Full progression resets should post a human Discord notice before the reducer runs, using the reset/maintenance webhook rather than the APK upload webhook.
- Zero-total-coin player cleanup must consider players with no leaderboard/save rows; `leaderboard.total_income = 0` alone misses accounts that connected but never progressed.
- Server progression resets do not clear browser tutorial `localStorage`; bump the FTUE storage key when old clients must see the guide again after reset.
- Player profile sync must wait on `own_player_profile` as well as `player`; otherwise reconnect can push default username/theme/avatar before hydration and overwrite saved profile data.
- A temporarily empty own-profile subscription must not sync local defaults; suppress profile publishes while marking the prompt loaded, then wait for the row or a real user edit.
- Fresh empty gameplay saves must reset browser FTUE progress before loading the null save; otherwise stale completed tutorial storage hides Elara on new data.
- Google account linking with a pending device save and no server save must load and persist the device save under the connected account; showing a fresh start here loses visible player progress.
- First-run `connect account` must mark the fresh-start choice confirmed after successful auth; otherwise an empty connected account reopens the start-new gate before creating its fresh save.
- Removed FTUE skip states must be ignored, not migrated; stale Android WebView `skipped` flags can hide the guide for reset level-1 players.
- Post-reset replay guards must allow the client baseline save, including default free research like `unlockSeed:sageSeed`; otherwise new post-reset saves can never create a server row.
- Loading a high QA save into a local identity with no accepted save needs a baseline `set_player_gameplay_save` first; the post-reset replay guard silently ignores high first saves, then `admin_copy_player_progression` can move that progression to the active browser account.
- Fresh Android installs must show the account/start-fresh choice before any Credential Manager restore; native Google can silently restore a previously authorized account even when app-local data was cleared.
- Web/mobile Google login must fail closed when ID-token auth is unavailable; browser OIDC code redirects with a web OAuth client surface `client_secret is missing` unless a backend token-exchange endpoint exists.
