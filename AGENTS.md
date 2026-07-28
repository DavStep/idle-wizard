# AGENTS.md

## Project Intent

This repo is a JavaScript mobile game project for `Idle Wizard`.

Use Ponytail-style engineering by default: read the touched flow first, then choose the smallest correct change. Prefer deleting, reusing existing project code, standard library/native platform features, and already-installed dependencies before adding new code or abstractions. Keep communication concise, technical, and no-filler. Stop only when the user asks for normal mode.

The target game viewport matches Root Run at `390x844`. Treat that as the logical game surface, then contain-fit it to the user's device without changing the logical layout.

Do not add seed, herb, potion, selling, economy, inventory, progression, or other gameplay code until the user explicitly requests that feature.

The project `STYLE` is defined in `docs/style.md`. The default is an illustrated fantasy-game HUD inspired by the approved Brewing reference and Root Run: dark layered panels, image-backed rounded chrome, large room landmarks, warm brown/gold action skins, colorful item/resource art, compact outlined Lilita One text, and controlled depth. Decoration must communicate room identity, state, or action hierarchy rather than become ambient clutter.

Before making new UI, check `docs/style.md` and the reusable widget library in `docs/ui-patterns.md` for an existing similar concept, then reuse that row, box, popup, tab, scroll pane, control, and border-label pattern instead of inventing a near-duplicate.

For structural or visual UI tasks, classify each requested element as `reuse`, `extension`, or `new widget`. A new widget includes a new primitive, compound component, scroll behavior, box/dialog type, control pattern, or a visual/interaction variant that changes an existing widget's contract. Reuse or extend existing widgets when their contracts fit. When a new widget is genuinely needed, implement it as a reusable project widget, define its states and intended scope, and add it to `docs/ui-patterns.md` with its source, contract, and real-app evidence. Every UI completion report must include `New widgets: none` or list the widgets introduced.

qUIck dialog/screen ZIP workflow: export ZIPs from the bundled qUIck Figma plugin into `qUIck-inbox/`. Before building or updating a qUIck dialog, screen, HUD, or component, run `npm run import:quick-ui` from the project root. The command validates and installs the export under `public/generated-ui`, rebuilds the generated UI atlas, and deletes each ZIP only after the full import succeeds. Do not manually extract these ZIPs. Follow `docs/quick-ui-workflow.md` for layer tags, nine-slice review, preview, and runtime binding.

For structural or visual UI, UX, layout, popup, dialog, screen, page, button, or flow changes, use `idle-wizard-ui-workflow`; it routes through `impeccable`, `idle-wizard-ui-consistency`, and the required product/style docs before editing.

Nonvisual copy, label, catalog, and definition changes use the focused fast path when they reuse existing rendering and do not change markup, layout, styling, interaction, accessibility semantics, persistence shape, or backend schema. For the focused fast path, read only the touched feature README, source flow, and matching tests; do not invoke the full UI workflow, browser screenshot QA, or `npm run check` solely because text is player-facing. Run the smallest focused tests that prove the change, and broaden verification only when those tests fail or the change crosses a shared boundary.

When the user provides a visual reference or requests composition accuracy, also follow `docs/visual-reference-qa.md`. Define measurable visual anchors before editing, use a reproducible real-app state, and require a native-pixel close crop plus side-by-side/overlay comparison before claiming parity.

For any animation, motion, transition, micro-interaction, animated feedback, or "animate this" request, use `$impeccable animate <target>` by default.

For any tutorial, FTUE, Elara guide box, objective panel, target hint, tutorial overlay, action reminder, pointer cue, data-tutorial-id placement, or tutorial popup/dialog work, use `idle-wizard-ui-workflow`; it must also use `idle-wizard-tutorial-ui`, which owns final tutorial-box placement, collision, stacking, and screenshot QA rules.

For general repo orientation, verification scope, and safe edit workflow, read `docs/ai-workflow.md`.

For any bug report, regression, failing check, broken gameplay/UI/backend behavior, mobile/WebView defect, save/load mismatch, visual defect, or vague "X is broken" request, use `idle-wizard-bugfixing` before editing.

The bugfixing agent must establish reproduction steps, isolate the exact root cause, add or update a regression guard when practical, fix narrowly, validate against the original reproduction, and update the routed experience docs only with durable lessons.

Selected ECC-derived skills live under `.agents/skills/ecc-*` as advisory QA additions. Use them when their descriptions match, but Idle Wizard project rules, the `experience.md` router and routed `docs/obsidian/engineering-liveops/experience/` files, and local `idle-wizard-*` skills override ECC guidance on conflicts. Do not install full ECC profiles, global hooks, global MCP config, memory, or worktree orchestration unless the user explicitly asks for that scoped change.

Legacy border-labeled blocks may keep transparent titles embedded over the top border. New illustrated panels use their approved image-backed title treatment and must not invent undocumented feature-local chrome.

Use Root Run's compact source UI proportions inside the room UI scale layer. Do not inflate the font directly to make mobile text readable.

Source UI scale must follow Root Run's fitted viewport scale from the `390x844` logical surface, including desktop upscaling, so both web and mobile views fit.

Ordinary room panels use approved image-backed fantasy chrome with compact padding and controlled depth. Popup/dialog panels remain visually heavier than ordinary panels. The Workshop resource/action block is called `mana sphere`; the summon seed button sits outside it. Clicking `seeds` in it opens the seed inventory breakdown. Page names sit in the raised active bottom tab.

## Experience Rules

- Read `experience.md` before making project decisions, then read the routed `docs/obsidian/engineering-liveops/experience/` files for the touched area.
- When learning something new and crucial that would have saved time or resources, update the most specific routed experience file.
- Keep `experience.md` as the routing head, not the long lesson store.
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
- Page views should follow `docs/style.md`: illustrated fantasy room identity, readable compact HUD hierarchy, approved image-backed chrome, and no unowned decorative clutter.

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

## Branch / Worktree Rules

- Stay on the user's current branch/worktree by default.
- Do not create or switch to another branch or worktree unless the user explicitly asks for it.
- If multiple agents help on one task, keep the implementation on one shared branch/worktree.
- Do not use separate branches/worktrees for browser, Android, or backend verification; shared local services only reflect one checkout.
- Helper agents in separate branches/worktrees may do read-only investigation, static analysis, or patch prep, but they must not claim live local runtime QA.

## Dev Server Rules

- Use one shared Vite dev server on `http://127.0.0.1:55173/` by default.
- Before starting `npm run dev`, check `npm run dev:status`; if port `55173` is already listening, reuse that server.
- When parallel agents' runtime processes interfere with each other, an agent may use explicit alternate ports for an isolated runtime. The agent must own those processes and stop every alternate-port listener when its work completes; never rely on Vite auto-increment.
- If port `55173` is held by a stale Vite process, stop it with `npm run dev:kill`, then start `npm run dev` once.
- Keep SpacetimeDB on `http://127.0.0.1:3000` by default; only isolate it on an explicit alternate port when parallel-agent interference requires it, and clean it up with the rest of the isolated runtime.
- Before claiming local browser/manual QA, confirm the exact Vite and SpacetimeDB endpoints used for that QA are up.
- Check Vite with `npm run dev:status`.
- Check SpacetimeDB with `lsof -nP -sTCP:LISTEN -iTCP:3000`.
- For an isolated runtime, check its explicit ports directly and record the process IDs so cleanup is deterministic.
- If both frontend and backend need a cold start, prefer `npm run stdb:dev` from the primary worktree.
- If Vite is already running but backend is missing, run `npm run stdb:start`, then `npm run stdb:publish`; run `npm run stdb:generate` too if bindings are missing or schema changed.
- When multiple agents work in parallel, prefer one owner for shared live local runtime processes. Agents that require isolation may own explicit alternate-port runtimes, but must not leave those listeners running after completion.

## Ambiguity Rule

If a requested feature has unclear gameplay behavior, ask before implementing it.
