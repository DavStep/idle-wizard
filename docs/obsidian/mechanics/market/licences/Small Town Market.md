---
title: "Small Town Market"
tags:
  - mechanics
  - entity/market-licence
  - system/market
  - progression/prestige
status: active
world: mechanics
note_type: market-licence
system: market
implementation: shipped
catalog_order: 1
entity_id: smallTown
required_prestige_stars: 0
active_until_prestige_stars: 0
backend_role: isolated economy scope
source_scope: client-and-backend
verified_on: 2026-07-19
related:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
---

# Small Town Market

Small Town Market is the starting licence at **0 permanent Prestige stars** and remains active until Crossroads Market unlocks at 1 star.

- It scopes NPC demand, quotes, stock, price tuning, player listings, requests, and proceeds.
- It uses the same source-default item catalog and balance as the other licences.
- Its economy pool is isolated from every other licence.
- Both the client and server derive the active licence independently.
- Legacy unprefixed backend market keys belong to Small Town Market.

## Connected systems

- [[mechanics/market/NPC Market|NPC Market]]
- [[mechanics/market/Player Market|Player Market]]
- [[mechanics/market/Market Licences|All Market Licences]]

## Source of truth

- `src/shared/marketLicence.js`
- `src/gameplay/market/`
- `spacetimedb/src/marketScope.ts`
