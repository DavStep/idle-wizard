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

## Market Separation

Market licences unlock permanently from completed Prestige stars: Small Town at
0, Crossroads at 1, City Bazaar at 3, Grand Exchange at 6, and Arcane Exchange
at 10. The highest unlocked licence is active for all trader and player-market
transactions, including after a prestige reset.

Each licence owns an independent demand pool, base-price tuning, shared NPC
stock, buyer waves, and player-market listings/requests. No transaction may
read from or write to another market's pool. This prevents late-game supply,
coin, and price pressure from reaching early players.

Every active market has demand for the goods needed within that player's run,
including earlier-tier goods. Higher licences do not force a reset player to
discard or hold early inventory; they buy it at the higher market's own price
and demand instead. Item availability and prices remain catalog/config driven,
not hard-coded by market name.

## Prices And Demand

NPC market prices use base values, a soft demand curve, capped live demand, a
weekly reset, and lazy UTC buyer waves. Those values are scoped to one market
licence. Enough real sell/buy pressure can nudge that licence's backend base
prices.

## Fast Sell

Fast sell pays 80% by default. Ruby research raises it to 85%, 90%, then 95%.

## Player Market

Listings and requests cap at 1000 units and 1000000 coin per unit. Listings,
requests, browsing, and purchases stay inside one market licence. Request rows
are public visibility only until escrow and direct delivery behavior is explicit.

## Related

- [[Currencies]]
- [[Capacity Gates]]
- [[Balance Watchlist]]
