# AGENTS.md

## Project Intent

This repo is a JavaScript mobile game project for `Idle Wizard`.

Use caveman communication by default: terse, technical, no filler. Stop only when the user asks for normal mode.

The target design viewport is `1080x2170`. Treat that as the authored game surface size, then scale it to the user's device without changing the logical layout.

Do not add seed, herb, potion, selling, economy, inventory, progression, or other gameplay code until the user explicitly requests that feature.

The project `STYLE` is defined in `docs/style.md`. It is inspired by A Dark Room: black text, white surfaces, readable serif text with some character, thin black borders, compact text panels, and almost no decoration.

Before making new UI, check `docs/style.md` and `docs/ui-patterns.md` for an existing similar concept, then reuse that row, box, popup, tab, and border-label pattern instead of inventing a near-duplicate.

A Dark Room-style blocks use titles embedded over the top border on white background, not separate headings inside bordered panels.

Use A Dark Room's source UI proportions, including `16px` source text, inside the room UI scale layer. Do not inflate the font directly to make mobile text readable.

Source UI scale must follow the fitted viewport scale, not stay fixed at `3`, so both desktop web and mobile views fit.

Ordinary non-dialog boxes stay simple: `1px` border, compact padding, no shadow. Reserve the thicker border and bottom-right shadow for popup/dialog panels. The Workshop resource/action block is called `mana sphere`; the summon seed button sits outside it. Clicking `seeds` in it opens the seed inventory breakdown. Page names sit at the bottom center of the room view.

## Experience Rules

- Read `experience.md` before making project decisions.
- When learning something new and crucial that would have saved time or resources, update `experience.md`.
- Keep `experience.md` categorized.
- Add only durable project lessons, not ordinary progress notes or duplicate facts.
- Keep entries short and directly useful for future work.

## Architecture Rules

- Use full ECS for gameplay state and behavior.
- A page is a room view: one full-screen place the player is currently looking at.
- The first page is `Workshop`.
- Every feature, including small features, gets a dedicated manager.
- Every major feature gets a facade.
- Facades are the only entry point other features should use.
- Each facade must include a very compact non-programmer explanation of what that feature does and why it exists.
- Keep managers narrow. If a manager starts owning two reasons to change, split it.
- ECS code must stay independent from rendering and SpacetimeDB transport.
- Rendering can observe ECS output later, but game rules must not depend on DOM or canvas APIs.
- SpacetimeDB calls should stay behind backend facades/managers.
- Page facades can render room-view DOM, but must not contain gameplay economy or progression rules.
- Page views should follow `docs/style.md`: black and white, text-game simple, no decorative textures or illustration.

## Folder Pattern

Use this pattern for new features:

```txt
src/<area>/<feature>/
  <Feature>Facade.js
  managers/
    <SpecificThing>Manager.js
  README.md
```

If the feature is large enough to be a top-level area, place its facade directly under the area folder.

## SpacetimeDB Rules

- SpacetimeDB reducers are the server-authoritative write path.
- Generated bindings live in `src/backend/spacetimedb/module_bindings/` and should not be edited manually.
- Auth tokens belong in auth/session managers, not random UI or gameplay files.
- Do not expose raw generated database APIs to gameplay features.

## Android Rules

- Android packaging uses Capacitor.
- Vite builds web assets to `dist`; Capacitor copies that directory into `android/`.
- Commit intentional native Android project files, but do not commit local SDK paths or build output.
- Keep Android-specific changes inside `android/` or Capacitor config unless a web change is required.

## Dev Server Rules

- Use one shared Vite dev server on `http://127.0.0.1:55173/`.
- Before starting `npm run dev`, check `npm run dev:status`; if port `55173` is already listening, reuse that server.
- Do not pass alternate Vite ports or let Vite auto-increment to `55174+`.
- If port `55173` is held by a stale Vite process, stop it with `npm run dev:kill`, then start `npm run dev` once.
- Keep SpacetimeDB on `http://127.0.0.1:3000`; do not start duplicate backend processes.
- When multiple agents work in parallel, only one should own the dev server.

## Ambiguity Rule

If a requested feature has unclear gameplay behavior, ask before implementing it.
