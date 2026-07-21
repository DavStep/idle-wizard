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
sale_cycle_seconds: 1800
backend_role: automatic NPC sales
source_scope: current-client-default
verified_on: 2026-07-19
---

# Trader Stands

Trader stands automatically sell one selected seed, herb, or potion type on one shared wall-clock cycle aligned to **:00** and **:30**.

| Market rank | Available stalls |
| ---: | ---: |
| ★ | 1 |
| ★★ | 2 |
| ★★★ | 3 |
| ★★★★ | 4 |
| ★★★★★ | 5 |

- Stalls are granted by the permanent active market licence; there is no stand purchase.
- A stand can sell **all** available matching items or a fixed remaining quantity.
- Changing a selected item or marked quantity does not reset the shared timer.
- Each eligible stand attempts its sale every cycle.
- Successful automatic sales receive the full marginal NPC buy quote.
- Backend need must be above zero.
- See [[mechanics/market/Sellable Quantity|Sellable Quantity]] for reservations.

Legacy saves may contain assignments in higher slots. Those records stay saved but inactive until the matching rank returns.

## Source of truth

- `src/gameplay/shop/managers/ShopAutoSellManager.js`
- `src/gameplay/shop/managers/ShopBalanceManager.js`
- `src/gameplay/playerLevel/player-level-balance.json`
