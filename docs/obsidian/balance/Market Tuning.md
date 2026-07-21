---
title: "Market Tuning"
tags:
  - balance
  - market
status: active
world: balance
note_type: balance
---

# Market Tuning

Use the component notes for behavior and this note for the balance summary.

## Trader market defaults

- Real backend quotes begin at player level 4.
- Every automatic stand has its own 5-second cycle.
- Market licence rank grants the available stands; there is no run-coin stand cost.
- Base throughput is 1 item per cycle. Staffing studies cost 1/2/3/4/5 emerald and make the matching stand sell 2 items per cycle.

See [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Trader Stands|Trader Stands]].

## Demand defaults

| Kind | Target need | Volatility |
| --- | ---: | ---: |
| seed | 1,000 | 12% |
| herb | 800 | 10% |
| potion | 300 | 8% |

Need is capped at 150% of target. Six-hour buyer waves recover demand, the Monday boundary resets it, and auto-tuning moves base price by at most 2.5% per window.

See [[mechanics/market/Demand And Pricing|Demand and Pricing]].

## Player market limits

- 1,000 units per listing or request.
- 1,000,000 coin per item.
- 10,000,000 coin per trade.

Requests remain advertisements, not escrow. See [[mechanics/market/Player Market|Player Market]].

## Value status

The current client rejects the stored shop config's legacy `slotCostsGold` key and keeps its fallback. Query backend state when exact live quotes or stock matter. See [[mechanics/market/Market Runtime Config|Market Runtime Config]].
