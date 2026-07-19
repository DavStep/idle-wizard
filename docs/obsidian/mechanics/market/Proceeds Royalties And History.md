---
title: "Proceeds, Royalties, and History"
aliases:
  - Player Market Proceeds
  - Potion Royalties
  - Trade History
tags:
  - mechanics
  - system/market
  - system/potions
status: active
world: mechanics
note_type: trading-component
system: market
implementation: shipped
potion_royalty_percent: 5
public_history_rows: 80
royalty_history_rows: 160
backend_role: proceeds and history
source_scope: mixed-client-backend
verified_on: 2026-07-19
---

# Proceeds, Royalties, and History

Claimable proceeds combine multiple sources:

- Player-listing sales.
- A 5% royalty when other players sell a potion whose hidden recipe this player discovered.

Royalties can come from qualifying NPC sales or Player Market sales. Use trade history and potion royalty history before labeling a claim as one source or the other.

- Claiming removes backend proceeds, then adds coin locally.
- Player trade history keeps up to 80 rows.
- Potion royalty history keeps up to 160 rows.
- History is scoped by the active [[mechanics/market/Market Licences|market licence]] where applicable.

## Related

- [[mechanics/potions/Potion Discovery|Potion Discovery]]
- [[mechanics/market/Player Listings|Player Listings]]
- [[mechanics/market/Market Authority|Authority Boundary]]

