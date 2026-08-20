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
implementation: complete
source_scope: current-checkout
verified_on: 2026-08-21
---

# Market Runtime Config Status

Backend and client both use `shopShelf.slotCostsCoin`. The authoritative default
costs are `50`, `150`, `400`, `1,000`, and `2,500` coin, with a five-second
independent automatic sale cycle. A one-time startup backfill converts the
legacy `slotCostsGold` field and installs this purchase curve.

Market quotes, need, stock, listings, and proceeds are live backend data and must be queried when exact current state matters.

## Source of truth

- `src/gameplay/shop/managers/ShopBalanceManager.js`
- `spacetimedb/src/index.ts`
