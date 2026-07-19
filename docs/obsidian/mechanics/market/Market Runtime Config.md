---
title: "Market Runtime Config Status"
aliases:
  - Market Runtime Config
tags:
  - mechanics
  - engineering
  - risk
  - system/market
status: active
world: mechanics
note_type: source-status
system: market
implementation: mixed
source_scope: current-checkout
verified_on: 2026-07-19
---

# Market Runtime Config Status

> [!warning] Shop config field mismatch
> Backend `game_config.shop` uses `slotCostsGold`; the current client `ShopBalanceManager` requires `slotCostsCoin`.

The client silently keeps its fallback when that runtime object is invalid. Effective current values are therefore:

- Stand costs: 0, 50, 150, 400, 1,000 coin.
- Shared automatic sale cycle: 1,800 seconds.

Market quotes, need, stock, listings, and proceeds are live backend data and must be queried when exact current state matters.

## Source of truth

- `src/gameplay/shop/managers/ShopBalanceManager.js`
- `spacetimedb/src/index.ts`

