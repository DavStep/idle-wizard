# Architecture

## Core Rule

Every feature has a facade and dedicated managers. Facades explain the feature in plain language and hide manager details from the rest of the app.

## Current Layers

- App: starts/stops the game shell, online gate, account-link gates, deploy refresh, and lifecycle flushes.
- Viewport: keeps the authored `1080x2170` stage proportional on real devices.
- Pages: owns room-view DOM for `Brewing`, `Garden`, `Workshop`, `Research`, `Market`, and gated `Prestige`.
- Gameplay: owns ECS-backed rules and snapshots for mana, coin, inventory, garden, brewing, research, tasks, market, prestige, automation, visual settings, and persistence.
- Backend: owns SpacetimeDB connection, auth/session, save sync, leaderboard, NPC/player market, potion discoveries, world chat, feedback, maintenance, and trade alliance transport.
- ECS: owns world data, entities, components, and system execution. It must not depend on DOM/canvas or SpacetimeDB.
- Rendering: owns the frame loop and render shell. It observes game/page state; it does not own gameplay rules.
- Assets/styles: owns static icons/images/fonts and shared A Dark Room-style CSS.

## Room Pages

A page is one room the player is looking at, not a web route. Workshop is the default page. Bottom navigation order starts as `Brewing -> Garden -> Workshop -> Research -> Market`; Prestige stays in the former quests slot and appears after its level gate.

Page code can build DOM, popups, tabs, scroll cues, notifications, and tutorial targets. Gameplay effects must go through facades. Page managers should render snapshots and keep interactive nodes stable across updates.

## Gameplay Boundaries

Gameplay features live under `src/gameplay/<feature>/`. Each feature should expose a facade, keep managers narrow, and add a local `README.md` when the feature has behavior an agent must understand before editing.

Current gameplay features include:

- `automation`
- `brewing`
- `crystal`
- `garden`
- `coin`
- `items`
- `logs`
- `mana`
- `persistence`
- `playerLevel`
- `prestige`
- `research`
- `ruby`
- `seedSummoning`
- `shop`
- `tasks`
- `visualSettings`

## Backend Boundaries

SpacetimeDB reducers are the server-authoritative write path. Gameplay and pages should call backend facades/managers, not raw generated APIs.

Generated bindings are read-only. Do not edit them manually; regenerate with `npm run stdb:generate`.

## Feature Pattern

Use this shape for new features:

```txt
src/<area>/<feature>/
  <Feature>Facade.js
  managers/
    <SpecificThing>Manager.js
  README.md
```

Tests should sit next to the code they cover. Prefer focused feature tests for new behavior and broad facade tests only when verifying cross-feature flows.
