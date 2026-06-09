# Architecture

## Core Rule

Every feature has a facade and dedicated managers. Facades explain the feature in plain language and hide manager details from the rest of the app.

## Current Layers

- App: starts and stops the project shell.
- Viewport: keeps the authored `1080x2170` stage proportional on real devices.
- Pages: owns the current room view. A page is one room the player is looking at.
- Gameplay: owns ECS-backed game rules such as mana, inventory, and seed summoning.
- Rendering: owns the canvas shell and frame loop.
- ECS: owns world data and system execution.
- Backend: owns SpacetimeDB connection and auth session boundaries.

## Pages

The first page is `Workshop`.

A page should feel like a room view, not a menu route. It can draw the wall, floor, props, and page-local visual state. It should call gameplay facades later when the room needs actual game behavior.

Current visual direction is defined in `docs/style.md`. Keep page views extremely simple unless a specific visual is requested.

## Future Gameplay Features

When gameplay starts, create feature folders instead of adding logic to existing managers:

```txt
src/gameplay/seedSpawning/
  SeedSpawningFacade.js
  managers/
    SeedSpawnScheduleManager.js
    SeedSpawnPlacementManager.js
  README.md
```

Keep the first version small, but preserve the boundary.
