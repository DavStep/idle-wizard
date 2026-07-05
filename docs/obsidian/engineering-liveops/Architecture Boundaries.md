---
title: Architecture Boundaries
tags:
  - engineering
  - architecture
status: active
world: engineering-liveops
---

# Architecture Boundaries

Every feature has a facade and dedicated managers. Facades are the entry point
other features should use, and each facade should explain the feature in compact
non-programmer terms.

## Layers

- App starts and stops the shell, gates, refresh, and lifecycle flushes.
- Viewport scales the authored `1080x2170` stage.
- Pages own room-view DOM.
- Gameplay owns ECS-backed rules and snapshots.
- Backend hides SpacetimeDB transport and reducers.
- ECS stays independent of DOM, canvas, and SpacetimeDB.
- Rendering observes game/page state and owns the frame loop.

## Related

- [[Backend Authority]]
- [[Save And Sync]]
