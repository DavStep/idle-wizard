---
title: "Arcane Exchange"
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
catalog_order: 5
entity_id: arcaneExchange
required_prestige_stars: 10
backend_role: isolated economy scope
source_scope: client-and-backend
verified_on: 2026-07-19
related:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
---

# Arcane Exchange

Arcane Exchange becomes active at **10 permanent Prestige stars** and remains the final licence.

- It scopes NPC demand, quotes, stock, price tuning, player listings, requests, and proceeds.
- It uses the same source-default item catalog and balance as the other licences.
- Its economy pool is isolated from every other licence.
- Both the client and server derive the active licence independently.
- Backend storage uses market-prefixed keys for this licence.

## Connected systems

- [[mechanics/market/NPC Market|NPC Market]]
- [[mechanics/market/Player Market|Player Market]]
- [[mechanics/market/Market Licences|All Market Licences]]

## Source of truth

- `src/shared/marketLicence.js`
- `src/gameplay/market/`
- `spacetimedb/src/marketScope.ts`

