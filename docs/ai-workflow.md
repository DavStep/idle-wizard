# AI Workflow

Use this when an AI agent or contributor needs to change the repo without guessing.

## Entry Points

1. Read `AGENTS.md` for mandatory project rules.
2. Read `experience.md`, then read the routed `docs/obsidian/engineering-liveops/experience/` files for durable lessons and current traps in the touched area.
3. Read `docs/architecture.md` for boundaries and feature locations.
4. For UI work, also read `docs/style.md` and `docs/ui-patterns.md`.
5. For tutorial/FTUE work, use the local `idle-wizard-tutorial-ui` skill and its QA checklist.
6. For release work, read `docs/release-workflow.md`.
7. Read the feature-local `README.md` before editing a feature folder.

If docs conflict with source, inspect source and tests, then update the stale doc in the same change.

## Verification

Use the smallest check that proves the change, then broaden when touching shared behavior.

- Focused logic change: run the matching `*.test.js`.
- Shared gameplay, page, backend, persistence, or release behavior: run `npm run check`.
- UI/layout/tutorial change: run focused tests plus browser screenshot/click QA at the authored mobile surface and a fitted desktop viewport.
- Dialog visual work: open the dialog through `cheats.openUi(surfaceId)` or `?devUi=surfaceId` for iteration and screenshots. If that path does not exist, add it before visual QA.
- Tap/button/mobile-WebView interaction change or bug: use `ecc-tap-path-audit` to trace handler order, state writes, backdrop/synthetic click behavior, and final visible state.
- Browser UI QA: use `ecc-browser-qa`; missing screenshot or baseline evidence means `INCONCLUSIVE`, not pass.
- Bug fixes: use `ecc-ai-regression-testing` to choose the smallest guard that would have caught the actual failure.
- Release/deploy smoke: use `ecc-canary-watch` for read-only HTTP, asset, console/network, backend-gate, and critical-room checks.
- UI screenshot QA that uses an HTML harness and `/src/styles/base.css` must set `html[data-style-theme="midnight"]`; `npm run check:ui` fails local `tmp/*-harness.html` and `tmp/*-qa.html` files that would fall back to the removed light theme.
- Backend schema/config change: build/publish locally, regenerate bindings with `npm run stdb:generate`, and do not edit generated bindings by hand.

`npm run check` is the default green gate: lint, tests, production web build.

## Reusable Dev Tools

When a feature change would be meaningfully faster or safer with a repo-local helper, add the smallest reusable dev tool instead of relying on a hidden one-off command.

- Prefer an `npm` script, checked-in harness, fixture generator, capture script, or focused validator that future agents can run directly.
- Any new dialog, window, page, popup, or notable UI surface should get a dev command path, usually through `cheats.openUi(surfaceId)` and `?devUi=surfaceId`, so future QA can open it directly.
- Document the command, required env flags, and intended use in this file when it is broad, or in the feature-local `README.md` when it is feature-specific.
- Keep tools deterministic and scoped to the current repo; do not make them start duplicate Vite or SpacetimeDB processes.
- Reuse documented tools before creating a near-duplicate helper.

## Shared Local Runtime

Live browser/Android/manual QA must happen from the primary branch/worktree that owns the shared local services. Alternate branches/worktrees can help with code edits and static checks, but they must not claim runtime verification unless they also own the running services.

Before local runtime QA, confirm both services:

- `npm run dev:status`
- `lsof -nP -sTCP:LISTEN -iTCP:3000`
- If the shared runtime should survive terminal closes, start `npm run local:keepalive` once. It detaches a watchdog that keeps Vite `55173` and SpacetimeDB `3000` up.

If neither service is up and live QA is needed, prefer `npm run stdb:dev` from the primary worktree. If Vite is already up, start the backend with `npm run stdb:start`, publish with `npm run stdb:publish`, and regenerate bindings with `npm run stdb:generate` when schema or bindings changed.

## Structure Rules

- Gameplay state and behavior belong in ECS-backed gameplay facades/managers.
- Page facades render room-view DOM and call gameplay/backend facades; they do not own economy or progression rules.
- Backend features hide SpacetimeDB transport behind backend facades/managers.
- Generated SpacetimeDB bindings are read-only.
- New features use:

```txt
src/<area>/<feature>/
  <Feature>Facade.js
  managers/
    <SpecificThing>Manager.js
  README.md
```

Keep managers narrow. Split a manager once it has two reasons to change.

## Current Hotspots

- `spacetimedb/src/index.ts` is large; prefer adding narrow helpers and keeping reducers small.
- `src/styles/base.css` is large; reuse existing style tokens and UI patterns before adding selectors.
- `src/pages/PagesFacade.test.js` and `src/gameplay/GameplayFacade.test.js` are broad regression files; prefer focused feature tests for new behavior, then keep broad tests only for cross-feature flows.

## Do Not Guess

- Ask before implementing unclear gameplay behavior.
- Do not add new seed, herb, potion, selling, economy, inventory, or progression behavior beyond the explicit request.
- Do not start another Vite port; use `npm run dev:status`, then shared `http://127.0.0.1:55173/`.
- Do not create a separate branch/worktree just to do live local QA; shared services only represent one checkout.
- Do not use raw generated database APIs outside backend boundaries.
