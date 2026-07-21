---
title: "Fast Sell (Retired)"
aliases:
  - Fast Sell
  - Sell to Trader
  - Trader Offer
tags:
  - mechanics
  - system/market
  - migration
status: retired
world: mechanics
note_type: trading-component
system: market
implementation: removed
verified_on: 2026-07-21
---

# Fast Sell (Retired)

The manual Sell to Trader / Trader Offer path has been removed. All NPC sales now use independent five-second [[mechanics/market/Trader Stands|Trader Stands]] at the full marginal NPC quote.

For save compatibility, completed or in-progress `fastSellPayout:1`, `:2`, and `:3` research ids migrate to `advanced:stallStaffing:1`, `:2`, and `:3`. No fast-sell gameplay API, popup, quote, percentage, or confirm action remains.
