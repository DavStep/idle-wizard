---
title: "Market Authority"
tags:
  - mechanics
  - engineering
  - risk
  - system/market
status: active
world: mechanics
note_type: trading-component
system: market
implementation: mixed
backend_role: shared market state
source_scope: client-and-backend
verified_on: 2026-07-19
---

# Market Authority

## Backend-owned

- NPC item config, quotes, need, stock, pressure counters, and analytics.
- Player listing/request rows and concurrent listing quantity.
- Claimable proceeds, trades, and potion royalties.
- Market-licence scoping and cross-market rejection.

## Client-owned

- Player inventory and coin.
- Inventory reservation for listings.
- Buyer coin spending and purchased item grant after reducer success.
- Application of claimed proceeds.

## Important gaps

- The server does not verify seller inventory or buyer coin.
- The server does not grant purchased items.
- Automatic NPC sales mutate local inventory/coin and report the reducer without waiting.
- Listing publication occurs before local reservation.
- Player purchase occurs server-side before local buyer coin/item mutation.

Treat the current exchange as shared market coordination, not full server-authoritative escrow.

## Source of truth

- `src/backend/npcMarket/`
- `src/backend/playerShop/`
- `spacetimedb/src/index.ts`

