---
title: Market Tuning
tags:
  - balance
  - market
status: active
world: balance
---

# Market Tuning

## Trader Market

Before player level 4, trader sale coin and demand are local fake values based
on item base sell price. From level 4 onward, trader demand and quotes come from
the backend.

The automatic trader market uses one wall-clock timer aligned to `:00` and
`:30`. Changing a selected stand item or mark amount does not reset the timer.

## Prices And Demand

NPC market prices use base values, a soft demand curve, capped live demand, a
weekly reset, and lazy UTC buyer waves. Enough real sell/buy pressure can nudge
backend base prices.

## Fast Sell

Fast sell pays 80% by default. Ruby research raises it to 85%, 90%, then 95%.

## Player Market

Listings and requests cap at 1000 units and 1000000 coin per unit. Request rows
are public visibility only until escrow and direct delivery behavior is explicit.

## Related

- [[Currencies]]
- [[Capacity Gates]]
- [[Balance Watchlist]]
