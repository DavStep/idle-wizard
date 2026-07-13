---
title: Market Systems
tags:
  - mechanics
  - market
status: active
world: mechanics
---

# Market Systems

## Market Licences

Each player trades through one permanent Prestige market licence. The active
licence is the highest one unlocked; it does not reset with a run. Licences
protect early players by separating the economies rather than merely changing
the market's appearance.

| Stars | Market | Role |
| --- | --- | --- |
| 0 | Small Town Market | Stable starter trade. |
| 1 | Crossroads Market | Standard regional trade. |
| 3 | City Bazaar | Higher-volume trade and changing local demand. |
| 6 | Grand Exchange | Valuable goods and volatile demand. |
| 10 | Arcane Exchange | Endgame trade and special orders. |

The market catalogue is data-driven. A higher market accepts the goods needed
for its player's current run, including earlier goods, but only against that
market's own demand. A player cannot trade through an earlier licence after
unlocking a newer one.

## Trader Market

Trader stands sell selected inventory on a shared 30-minute wall-clock cadence.
Fast sell uses the same marginal quote and demand but pays a reduced percentage.
Quotes, demand, and stock belong to the active market licence.

## Trader Stock

Shared stock comes from the active market's backend quote snapshot. Buying
spends local coin, adds local items, and calls the backend stock reducer before
local application.

## Player Market

Player listings reserve local inventory. Other players can buy listings, and
claiming proceeds adds local coin after reducer success. Public request rows are
visibility only until escrow/delivery behavior is explicit.

Listings, requests, and browsing are limited to the active market licence.
Players in different markets never share player-market rows.

## Related

- [[Core Loop]]
- [[Tasks And Leveling]]
- [[Events And Social]]
