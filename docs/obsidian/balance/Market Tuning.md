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
- Automatic stands share one 1,800-second wall-clock cycle.
- Stand costs are 0, 50, 150, 400, and 1,000 coin.
- Fast Sell pays 80%, then 85/90/95% through emerald research costing 2/5/10.

See [[mechanics/market/NPC Market|NPC Market]], [[mechanics/market/Trader Stands|Trader Stands]], and [[mechanics/market/Fast Sell|Fast Sell]].

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
