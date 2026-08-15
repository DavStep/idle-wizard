---
title: "Demand and Pricing"
aliases:
  - NPC Demand
  - Market Pricing
tags:
  - mechanics
  - balance
  - system/market
status: active
world: mechanics
note_type: trading-component
system: market
implementation: shipped
backend_role: price, need, recovery, and tuning
source_scope: backend-live
neutral_npc_buy_percent: 80
neutral_npc_sell_percent: 120
need_cap_percent: 150
buyer_wave_hours: 6
verified_on: 2026-07-19
---

# Demand and Pricing

[[mechanics/market/licences/Small Town Market|Small Town]] quotes are fixed. Crossroads and higher Prestige-market quotes follow a soft pressure curve around `npcNeed / targetNeed`. Each [[mechanics/market/Market Licences|market licence]] owns an isolated pool.

| Item kind | Default target need | Volatility |
| --- | ---: | ---: |
| seed | 1,000 | 12% |
| herb | 800 | 10% |
| potion | 300 | 8% |

- Small Town market price stays at its configured base; NPC buy/sell quotes retain the normal 80%/120% spread.
- Dynamic pricing begins at Crossroads after the first Prestige star.
- Neutral NPC buy price is 80% of market price.
- Neutral NPC stock sell price is 120%.
- Selling reduces need; buying stock raises it.
- Live need is capped at 150% of target.
- Demand returns through lazy six-hour UTC buyer-wave calculations.
- Demand resets at the anchored Monday weekly boundary.
- There is no current scheduled market-tick table; recovery is computed from elapsed time.
- In Crossroads and higher markets, auto-tuning starts after at least `max(5% of target, 10)` traded units and moves base price by at most 2.5% per tuning window.
- Successful buys and sells update an hourly per-market, per-item snapshot; the latest four rows feed the Market Ledger's `now` through `3h` history.

Small Town payouts are fixed. Higher-market payouts are dynamic. Item `baseSellPrice` is the pre-level-4 local value and a reference point for backend market configuration.

## Source of truth

- `src/gameplay/shop/managers/npcMarketPricing.js`
- `src/backend/npcMarket/`
- `spacetimedb/src/index.ts`
