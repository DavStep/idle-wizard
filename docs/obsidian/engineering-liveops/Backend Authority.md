---
title: Backend Authority
tags:
  - engineering
  - backend
  - authority
status: active
world: engineering-liveops
---

# Backend Authority

SpacetimeDB reducers are the server-authoritative write path. Generated database
bindings should not be edited manually; regenerate them through the documented
backend command.

## Current Authority Shape

- Gameplay save is still broad client-reported JSON with reducer normalization.
- NPC market quotes and stock become backend-backed from player level 4 onward.
- Player market listings, proceeds, history, and public request rows are stored
  server-side, while local gameplay still owns item reservation and application.
- Player profile sync stores username, theme/font/resource display settings,
  username prompt state, and highest reported task level.
- Trade alliances use backend facades, not raw generated tables.

## Related

- [[Save And Sync]]
- [[Operational Risks]]
