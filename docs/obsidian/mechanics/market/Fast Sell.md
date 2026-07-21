---
title: "Sell to Trader"
aliases:
  - Fast Sell
  - Trader Offer
tags:
  - mechanics
  - system/market
  - progression/research
status: active
world: mechanics
note_type: trading-component
system: market
implementation: shipped
base_payout_percent: 80
maximum_payout_percent: 95
research_currency: emerald
research_costs:
  - 2
  - 5
  - 10
research_duration_seconds: 3
backend_role: NPC quote and demand after level 4
source_scope: effective-client-and-backend
verified_on: 2026-07-19
---

# Sell to Trader

Sell to Trader is the immediate manual sale path inside [[mechanics/market/NPC Market|Traders]]. It opens a **Trader Offer** dialog. Internal ids still use `fastSell` for save compatibility.

| Haggling | Payout | Emerald cost | Time |
| --- | ---: | ---: | ---: |
| none | 80% | — | — |
| `fastSellPayout:1` | 85% | 2 | 3s |
| `fastSellPayout:2` | 90% | 5 | 3s |
| `fastSellPayout:3` | 95% | 10 | 3s |

- The percentage applies to the marginal NPC buy quote.
- Automatic [[mechanics/market/Trader Stands|Trader Stands]] receive the full quote.
- Before level 4, the quote comes from the local item base sell value and no backend reducer is sent.
- From level 4, the sale waits for the NPC reducer before local coin is awarded.
- The research currency is **emerald**; older symbols and notes that call it Ruby are stale.

## Source of truth

- `src/gameplay/shop/managers/ShopDirectSellManager.js`
- `src/gameplay/research/fastSellResearch.js`
- `src/gameplay/research/managers/ResearchBalanceManager.js`
