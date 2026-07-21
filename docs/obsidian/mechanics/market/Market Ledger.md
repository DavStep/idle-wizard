---
title: "Market Ledger"
tags:
  - mechanics
  - system/market
  - component
status: active
world: mechanics
note_type: trading-component
system: market
implementation: shipped
backend_role: hourly price history and live trader catalogue
verified_on: 2026-07-20
---

# Market Ledger

The Market Ledger is the book-like trader catalogue opened from the bottom-right action on **your stalls**.

- Tabs switch between seeds, herbs, and potions.
- Rows compare **you sell**, **you buy**, and a compact recent-change marker.
- Selecting a row shows market price at `now`, `1h`, `2h`, and `3h`, buyer need, and trader stock.
- Buying happens from the selected ledger entry.
- Known goods above the active rank read `not traded here` and name the required market.
- `no buyers`, `out of stock`, and `offline` remain distinct states.

SpacetimeDB stores one row per market/item/hour and keeps the latest four hourly rows per item. The client does not fabricate missing history.

## Source of truth

- `src/pages/shop/managers/ShopMarketLedgerManager.js`
- `src/backend/npcMarket/managers/NpcMarketSubscriptionManager.js`
- `spacetimedb/src/index.ts`
