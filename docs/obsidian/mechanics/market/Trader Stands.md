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

| Stand | Player level | Coin cost |
| ---: | ---: | ---: |
| 1 | 4 | 0 |
| 2 | 5 | 50 |
| 3 | 10 | 150 |
| 4 | 13 | 400 |
| 5 | 17 | 1,000 |

- Player level raises the buy cap; the stand must still be purchased.
- A stand can sell **all** available matching items or a fixed remaining quantity.
- Changing a selected item or marked quantity does not reset the shared timer.
- Each eligible stand attempts its sale every cycle.
- Successful automatic sales receive the full marginal NPC buy quote.
- Backend need must be above zero.
- See [[mechanics/market/Sellable Quantity|Sellable Quantity]] for reservations.

> [!warning] Runtime config
> The backend shop row currently uses a legacy key rejected by the client, so these are the effective client fallback costs and timing. See [[mechanics/market/Market Runtime Config|Market Runtime Config]].

## Source of truth

- `src/gameplay/shop/managers/ShopAutoSellManager.js`
- `src/gameplay/shop/managers/ShopBalanceManager.js`
- `src/gameplay/playerLevel/player-level-balance.json`

