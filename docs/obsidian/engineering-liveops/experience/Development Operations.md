---
title: Experience: Development Operations
tags:
  - engineering
  - liveops
  - experience
status: active
world: engineering-liveops
experience_type: development-operations
---

# Experience: Development Operations

- Use one shared Vite dev server at `http://127.0.0.1:55173/` with `strictPort`; parallel agents should reuse it, not start `55174+`.
- Use `npm run dev:status` to check the shared Vite server and `npm run dev:kill` to stop it.
- Shared live local QA belongs to one primary branch/worktree; helper branches/worktrees can prep code or run static checks, but runtime verification is invalid unless that checkout owns the running Vite and SpacetimeDB processes.
- Before claiming local runtime verification, confirm both Vite `55173` and SpacetimeDB `3000`; frontend-only status is not enough.
- Visual QA for deep page states needs deterministic real-game state recipes; ad hoc clicks/cheats make agents miss screenshots or verify the wrong state.
- In-app Browser blocks `data:` QA harness URLs; use the real local app or a checked-in/local route instead of ad hoc data-url visual harnesses.
- Source-scaled room UI clicks in in-app Browser QA should use DOM rect screen coordinates with `tab.cua.click`; Playwright locator clicks can miss scaled controls.
- Fresh-start browser QA resets FTUE progress; after choosing `start fresh`, write completed `idle-wizard.tutorial.v4` storage and reload before normal room-click automation.
- Keep top-level docs current with implemented systems; agents trust README/architecture docs early, so stale future-scope text causes wrong plans.
- When a feature needs faster or safer repeat work, add the smallest reusable dev tool and document its command/env in `docs/ai-workflow.md` or the feature README.
- Full player-save backup must use SpacetimeDB SQL/export or a dedicated admin reducer; `admin_player_gameplay_save` currently exposes only summary fields, not raw `saveJson`.
- SpacetimeDB CLI `sql` calls trigger `on_connect`; after reset verification, run final deletes for `player`/`leaderboard` and stop querying.
- Match verification to risk: tiny deterministic edits can use inspection or a focused check, while shared runtime/UI changes justify lint, tests, build, and browser/device checks.
- Tutorial placement tests that create default `TutorialHintManager` instances must clear shared `localStorage`; saved Elara drag placement leaks across full-file CI runs.
- If local shows `server unavailable`, check both Vite `55173` and SpacetimeDB `3000`; this workspace may target `.env.local` database `idle-wizard-codex-run`, so publish that DB directly when `npm run stdb:publish` is unauthorized for `idle-wizard`.
- If Browser stays on `server required` while local SpacetimeDB is listening and console logs a `spacetimedb.js` binary `RangeError`, local DB schema likely mismatches generated bindings; fix schema/publish before relying on room-click QA.
- GitHub Pages deploys for this repo should build with `npm run build -- --base=/idle-wizard/`; static Pages still needs a hosted `wss://` SpacetimeDB URI before visitors can play.
- If `build` delegates to `build:prod`, keep `build` as `npm run build:prod --` so Pages' `--base=/idle-wizard/` reaches Vite.
- `DavStep/idle-wizard` is public and GitHub Pages deploys at `https://davstep.github.io/idle-wizard/`.
- Web deploy freshness uses `/deploy-version.json`; Vite emits it per build and the app polls it with `no-store`, then reloads on version change.
- `/deploy-version.json` can include `releaseVersion`, but deploy refresh should compare only the generated deploy `version` build id.
- Deploy-triggered page refresh should only load compatible new code after migrations/sanitizers preserve player saves; refresh must not write defaults over hydrated user data.
- Deploy refresh must call gameplay save-and-flush before `location.reload()` so open tabs persist current progress before swapping bundles.
- Production web builds should set `VITE_SPACETIME_URI=https://maincloud.spacetimedb.com` and publish the module with `npm run stdb:publish:maincloud`.
- Backend release detection must compare `spacetimedb/` with the previous release commit, not only the dirty worktree; otherwise a precommitted schema can ship only to the client.
- Release automation must let `.env.production` override `.env.local` for `VITE_*`; otherwise local SpacetimeDB values can leak into release APKs.
- Ignored `public/qa-data/` is still Vite/Capacitor build input; delete or move it outside `public/` before any production web or Android build, or player QA saves can ship in `dist`/APK assets.
- For safe Maincloud schema deploys, append new columns to existing tables, give them `default(...)`, and publish with `--delete-data=never`; otherwise existing player/account rows may block migration.
- SpacetimeDB table column order matters; adding a column before existing fields is treated as a reorder/manual migration, so append new fields at the end.
- Maincloud energy usage is dashboard-only at `/settings/energy-usage`; the SpacetimeDB CLI token can list/publish DBs but does not authenticate that dashboard loader.
- Optional Google login is controlled by `VITE_GOOGLE_AUTH_CLIENT_ID`; the Google OAuth client ID is public config and can live in `.env.production`.
- Browser Google login must use Google Identity Services to receive a Google-signed ID token in a JavaScript callback; Google code flow needs backend token exchange and `oidc-client-ts` rejects legacy implicit `id_token`.
- Current player APK release automation must keep using the OAuth-compatible Android debug certificate until a true release keystore SHA-1 is registered and account connect/restore is device-tested.
- OIDC redirect state must use persistent `localStorage` through `stateStore`; default session storage can disappear on Android/new-tab OAuth returns and produce callback state errors.
- The sibling dashboard repo is `../idle-wizard-dashboard`; it runs on Vite port `55183` and syncs generated SpacetimeDB bindings from this repo.
- Plain Node dev scripts that import `GameplayFacade` need the repo JSON module loader/register path because `TaskBalanceManager` imports `tasks.json` without Node import attributes; Vitest/Vite handle it without that loader.
