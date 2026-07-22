---
title: "Trader Stands"
aliases:
  - NPC Market Stands
  - Demand Stands
tags:
  - mechanics
  - system/market
  - component
status: active
world: mechanics
note_type: trading-component
system: market
implementation: shipped
stand_count: 5
sale_cycle_seconds: 5
base_batch_size: 1
staffed_batch_size: 2
backend_role: shared NPC demand updates
source_scope: client-scheduled-and-backend-validated
verified_on: 2026-07-21
---

# Trader Stands

Each trader stand sells from its own loaded stock on an independent five-second cycle.

| Market rank | Available stalls |
| ---: | ---: |
| ★ | 1 |
| ★★ | 2 |
| ★★★ | 3 |
| ★★★★ | 4 |
| ★★★★★ | 5 |

- Tap a stand to open the loader, select an item, choose `0%` / `25%` / `50%` / `75%` / `100%`, then mark that share of matching stock.
- `0%` returns loaded stock. `mark future` continuously loads newly produced copies until stopped without taking stock already owned when it is enabled.
- A stand contains one item type at a time and clears when its loaded quantity reaches zero.
- Base throughput is 1 item every 5 seconds.
- `advanced:stallStaffing:N` changes stand N to 2 items every 5 seconds.
- Every stand keeps independent progress, including offline catch-up.
- Same-item demand is reserved locally across stands, then backend reports are aggregated and split into reducer-safe chunks.
- The server validates active market scope, item catalog membership, demand, and a maximum of 10,000 items per reducer call.

Loaded quantities are capped at 1,000,000 per stand in save normalization. Legacy fixed/all assignments migrate once into physical loaded stock. Legacy `fastSellPayout:1..3` research maps to staffing stands 1–3.

Player inventory and coin remain client-owned; see [[mechanics/market/Market Authority|Market Authority]].

## Source of truth

- `src/gameplay/shop/managers/ShopAutoSellManager.js`
- `src/gameplay/shop/managers/ShopShelfSlotSelectionManager.js`
- `src/gameplay/shop/managers/ShopShelfFutureLoadManager.js`
- `src/gameplay/shop/managers/ShopBalanceManager.js`
- `src/gameplay/research/stallStaffingResearch.js`
- `spacetimedb/src/index.ts`
