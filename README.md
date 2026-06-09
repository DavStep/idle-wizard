# Idle Wizard

JavaScript mobile game scaffold with a full ECS architecture, Vite client, and SpacetimeDB backend setup.

## Commands

```sh
npm install
npm run dev
npm run build
npm run lint
npm run android:assembleDebug
```

SpacetimeDB requires the `spacetime` CLI:

```sh
npm run stdb:start
npm run stdb:publish
npm run stdb:generate
```

## Current Scope

Herbs, potions, and potion recipes exist only as item concepts. Planting, harvesting, active brewing, selling, and other gameplay mechanics will be added only when requested.

## Architecture

- `src/app`: application bootstrap and lifecycle.
- `src/viewport`: fixed `1080x2170` design surface scaling.
- `src/pages`: room-view pages. The default page is `Workshop`.
- `src/gameplay`: ECS-backed gameplay facades for mana, inventory, and seed summoning.
- `src/rendering`: render shell and frame loop.
- `src/ecs`: ECS world, entity, component, and system managers.
- `src/backend`: SpacetimeDB and auth integration boundaries.
- `spacetimedb`: server module project.
- `android`: Capacitor Android wrapper for building the Vite game as an Android app.
- `docs/style.md`: visual style definition.

See `AGENTS.md` for project rules future agents should follow.
