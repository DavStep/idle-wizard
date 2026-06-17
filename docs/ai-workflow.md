# AI Workflow

Use this when an AI agent or contributor needs to change the repo without guessing.

## Entry Points

1. Read `AGENTS.md` for mandatory project rules.
2. Read `experience.md` for durable lessons and current traps.
3. Read `docs/architecture.md` for boundaries and feature locations.
4. For UI work, also read `docs/style.md` and `docs/ui-patterns.md`.
5. For tutorial/FTUE work, use the local `idle-wizard-tutorial-ui` skill and its QA checklist.
6. Read the feature-local `README.md` before editing a feature folder.

If docs conflict with source, inspect source and tests, then update the stale doc in the same change.

## Verification

Use the smallest check that proves the change, then broaden when touching shared behavior.

- Focused logic change: run the matching `*.test.js`.
- Shared gameplay, page, backend, persistence, or release behavior: run `npm run check`.
- UI/layout/tutorial change: run focused tests plus browser screenshot/click QA at the authored mobile surface and a fitted desktop viewport.
- Backend schema/config change: build/publish locally, regenerate bindings with `npm run stdb:generate`, and do not edit generated bindings by hand.

`npm run check` is the default green gate: lint, tests, production web build.

## Shared Local Runtime

Live browser/Android/manual QA must happen from the primary branch/worktree that owns the shared local services. Alternate branches/worktrees can help with code edits and static checks, but they must not claim runtime verification unless they also own the running services.

Before local runtime QA, confirm both services:

- `npm run dev:status`
- `lsof -nP -sTCP:LISTEN -iTCP:3000`

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
