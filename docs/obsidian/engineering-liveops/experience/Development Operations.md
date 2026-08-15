---
title: "Experience: Development Operations"
tags:
  - engineering
  - liveops
  - experience
status: active
world: engineering-liveops
experience_type: development-operations
---

# Experience: Development Operations

- Keep runtime binary assets under the root `assets/` tree. Authored game art
  belongs in `assets/game/source/`; game and qUIck atlas outputs belong in
  their adjacent `atlas/` folders and must be regenerated through
  `npm run assets:atlas`, not edited by hand.
- When promoting an authored source texture from `.png` to `.9.png`, update
  asset-generator inputs as well as runtime references, then run
  `npm run assets:atlas`; stale generator paths otherwise block `predev`.

- Use the shared Vite dev server at `http://127.0.0.1:55173/` with `strictPort` by default. If parallel agents interfere, give each isolated runtime explicit ports and a clear owner; never rely on auto-increment, and stop every alternate listener when that agent finishes.
- Use `npm run dev:status` to check the shared Vite server and `npm run dev:kill` to stop it.
- Shared live local QA belongs to one primary branch/worktree; helper branches/worktrees can prep code or run static checks, but runtime verification is invalid unless that checkout owns the running Vite and SpacetimeDB processes.
- Before claiming local runtime verification, confirm both the Vite and SpacetimeDB endpoints used by that QA; frontend-only status is not enough. For isolated runtimes, retain process IDs so cleanup is deterministic.
- Visual QA for deep page states needs deterministic real-game state recipes; ad hoc clicks/cheats make agents miss screenshots or verify the wrong state.
- In-app Browser blocks `data:` QA harness URLs; use the real local app or a checked-in/local route instead of ad hoc data-url visual harnesses.
- Source-scaled room UI clicks in in-app Browser QA should use DOM rect screen coordinates with `tab.cua.click`; Playwright locator clicks can miss scaled controls.
- Fresh-start browser QA resets FTUE progress; after choosing `start fresh`, write completed `idle-wizard.tutorial.v4` storage and reload before normal room-click automation.
- Keep top-level docs current with implemented systems; agents trust README/architecture docs early, so stale future-scope text causes wrong plans.
- When a feature needs faster or safer repeat work, add the smallest reusable dev tool and document its command/env in `docs/ai-workflow.md` or the feature README.
- App-level retained preview commands must resolve managers through
  `RenderFacade`; `AppFacade` does not expose the online gate as a direct
  property. Use `?devUi=serverRequired` for the backend loading splash state
  that live
  backend events cannot overwrite during screenshot QA.
- Raw retained-dialog and widget previews must bypass gameplay setup and save
  publication; visual inspection should not mutate or persist player state.
- UI editor thumbnail galleries must capture static canvases through one
  serialized shared Pixi renderer; one live application per tile exhausts
  WebGL contexts as resizable panels reveal more entries.
- Compatible UI editor widget selections must retain the live Pixi canvas and
  application, replacing only the widget display object; remounting the preview
  application exposes and repaints the unchanged background as a visible flash.
- UI Lab hierarchy roots must adopt the mounted preview's identity and bridge
  semantic Pixi controls, text, frames, and sprites as editable atoms; never
  fall back to exposing integration, pan/zoom, toolbar, canvas, or nine-slice
  renderer internals as component rows.
- UI Lab hierarchy selection must bridge each semantic Pixi atom back to its
  production display objects and draw the shared editor selection outline from
  their live world bounds; DOM selection attributes cannot highlight pixels
  inside the retained canvas.
- UI Lab compound hierarchies must preserve production ownership boundaries:
  show the base dialog, paper content, and reusable child-widget instances as
  leaves. Show a child's semantic atoms only in its standalone view. Give
  reusable instances a drill-in library ID, then discover the remaining visible
  primitive atoms beneath Content while stopping at those registered roots;
  never flatten pooled row internals into the dialog tree.
- The standalone UI editor is a desktop development tool. Run its live visual
  and interaction QA at desktop resolutions; the game's authored `390x844`
  mobile viewport requirement does not apply to editor testing.
- Canvas-only production guards must inspect Vite's emitted production module graph, not scan the whole source tree; this rejects reachable DOM UI without blocking retained legacy/dev files that are absent from release chunks.
- Isolated Vite previews must build into their own ignored output directory; using shared `dist` lets unrelated builds replace the assets under a running QA preview.
- Full player-save backup must use SpacetimeDB SQL/export or a dedicated admin reducer; `admin_player_gameplay_save` currently exposes only summary fields, not raw `saveJson`.
- High-level QA saves must flush one level at a time because backend save normalization allows only `previousLevel + 1`; deep-clone every intermediate save because gameplay hydration mutates nested branches.
- SpacetimeDB CLI `sql` calls trigger `on_connect`; after reset verification, run final deletes for `player`/`leaderboard` and stop querying.
- Match verification to risk: tiny deterministic edits can use inspection or a focused check, while shared runtime/UI changes justify lint, tests, build, and browser/device checks.
- Tutorial placement tests that create default `TutorialHintManager` instances must clear shared `localStorage`; saved Elara drag placement leaks across full-file CI runs.
- If local shows `server unavailable`, check both Vite `55173` and SpacetimeDB `3000`; this workspace may target `.env.local` database `idle-wizard-codex-run`, so publish that DB directly when `npm run stdb:publish` is unauthorized for `idle-wizard`.
- If Browser stays on the loading splash while local SpacetimeDB is listening and console logs a `spacetimedb.js` binary `RangeError`, local DB schema likely mismatches generated bindings; fix schema/publish before relying on room-click QA.
- A listening SpacetimeDB port does not prove the target database or schema exists; isolated launchers must publish the current module and embed the same dedicated database name before starting the client.
- GitHub Pages deploys for this repo should build with `npm run build -- --base=/idle-wizard/`; static Pages still needs a hosted `wss://` SpacetimeDB URI before visitors can play.
- Release Discord posts must wait for both `Checks` and `Deploy GitHub Pages` to succeed for the exact pushed commit; a successful `git push` is only the start of the web release.
- Pixi production-manifest assets copied from `public/` must resolve through `import.meta.env.BASE_URL`; root-absolute Spine URLs make the GitHub Pages build fail closed on startup.
- Pixi production preloads must retry transient asset fetch failures; GitHub Pages can briefly return `503` for a valid hashed image, and one response must not permanently fail startup.
- Keep semantic asset names in source, but emit opaque content-hash media filenames in production; blocker-sensitive request tokens such as `banner` can make the fail-closed Pixi preload prevent startup.
- Pixi startup preloads must contain the loading splash art, its shared progress-rail textures, and the game font only. Mount that splash before fetching the remaining production manifest, but keep pages and dialogs gated on the full preload.
- If `build` delegates to `build:prod`, keep `build` as `npm run build:prod --` so Pages' `--base=/idle-wizard/` reaches Vite.
- `DavStep/idle-wizard` is public and GitHub Pages deploys at `https://davstep.github.io/idle-wizard/`.
- Web deploy freshness uses `/deploy-version.json`; Vite emits it per build and the app polls it with `no-store`. A fresh launch may refresh a stale build immediately, but an active tab keeps the new version pending until it returns from at least five minutes hidden.
- `/deploy-version.json` can include `releaseVersion`, but deploy refresh should compare only the generated deploy `version` build id.
- Android OTA bundles need a separate production build with base `/`; the GitHub Pages build uses `/idle-wizard/` and its absolute asset URLs do not work inside Capacitor's local origin.
- Android OTA staging must configure a five-minute background delay before calling Capacitor Updater `next`; if delay configuration fails, leave the bundle downloaded but unqueued so a brief app switch cannot reload gameplay.
- Deploy-triggered page refresh should only load compatible new code after migrations/sanitizers preserve player saves; refresh must not write defaults over hydrated user data.
- Deploy refresh must call gameplay save-and-flush before `location.reload()` so open tabs persist current progress before swapping bundles.
- Production web builds should set `VITE_SPACETIME_URI=https://maincloud.spacetimedb.com` and publish the module with `npm run stdb:publish:maincloud`.
- Backend release detection must compare `spacetimedb/` with the previous release commit, not only the dirty worktree; otherwise a precommitted schema can ship only to the client.
- Release automation must let `.env.production` override `.env.local` for `VITE_*`; otherwise local SpacetimeDB values can leak into release APKs.
- Ignored `public/qa-data/` is still Vite/Capacitor build input; delete or move it outside `public/` before any production web or Android build, or player QA saves can ship in `dist`/APK assets.
- For safe Maincloud schema deploys, append new columns to existing tables, give them `default(...)`, and publish with `--delete-data=never`; otherwise existing player/account rows may block migration.
- SpacetimeDB table column order matters; adding a column before existing fields is treated as a reorder/manual migration, so append new fields at the end.
- Maincloud energy usage is dashboard-only at `/settings/energy-usage`; the SpacetimeDB CLI token can list/publish DBs but does not authenticate that dashboard loader.
- The official Google OAuth client ID is public config and must have a source fallback so an empty build environment cannot disable account linking; `VITE_GOOGLE_AUTH_CLIENT_ID` remains an optional deployment override.
- Browser Google login must use Google Identity Services to receive a Google-signed ID token in a JavaScript callback; Google code flow needs backend token exchange and `oidc-client-ts` rejects legacy implicit `id_token`.
- Current player APK release automation must keep using the OAuth-compatible Android debug certificate until a true release keystore SHA-1 is registered and account connect/restore is device-tested.
- Call Capacitor Updater `notifyAppReady()` at app-entry startup before renderer asset preloads or backend work; waiting for full initialization lets slow devices hit `appReadyTimeout` and roll back healthy OTA bundles.
- Do not deliver the release APK to Discord until the published OTA manifest matches the package version and the hosted bundle's size and SHA-256 checksum verify; a successful Pages workflow alone does not prove the player update artifact.
- Android native splash density assets follow the project-wide PNG-only policy. Keep their dimensions/content lean enough for the signed APK upload limit.
- Android `versionCode` must reserve three digits each for minor and patch values; a two-digit mapping made `0.3.0` older than `0.2.104`, causing Android to reject the release as a downgrade.
- OIDC redirect state must use persistent `localStorage` through `stateStore`; default session storage can disappear on Android/new-tab OAuth returns and produce callback state errors.
- The sibling dashboard repo is `../idle-wizard-dashboard`; it runs on Vite port `55183` and syncs generated SpacetimeDB bindings from this repo.
- Plain Node dev scripts that import `GameplayFacade` need the repo JSON module loader/register path because `TaskBalanceManager` imports `tasks.json` without Node import attributes; Vitest/Vite handle it without that loader.
- Local-runtime watchdog PID probes must treat sandbox `EPERM` as unknown, not dead; deleting `monitor.pid` on an uninspectable live process creates duplicate monitors and competing service restarts.
- Detached preview commands must reuse a listening process recorded by their PID file; treating their own listener as a port collision makes the documented start command fail on every rerun.
- Reusing a detached static preview must rebuild its isolated output first; reloading an unchanged preview directory silently serves stale source assets.
- Detached preview stop commands must wait for their listener to release before deleting the PID file; immediate restart otherwise sees an unrecorded occupied port.
