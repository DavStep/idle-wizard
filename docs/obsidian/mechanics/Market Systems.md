---
title: Market Systems
tags:
  - mechanics
  - market
status: active
world: mechanics
---

# Market Systems

## Trader Market

Trader stands sell selected inventory on a shared 30-minute wall-clock cadence.
Fast sell uses the same marginal quote and demand but pays a reduced percentage.

## Trader Stock

Shared stock comes from the backend quote snapshot. Buying spends local coin,
adds local items, and calls the backend stock reducer before local application.

## Player Market

Player listings reserve local inventory. Other players can buy listings, and
claiming proceeds adds local coin after reducer success. Public request rows are
visibility only until escrow/delivery behavior is explicit.

## Related

- [[Core Loop]]
- [[Tasks And Leveling]]
- [[Events And Social]]
