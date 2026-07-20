---
title: "Market Systems"
aliases:
  - Trading
  - Trading System
  - Market
tags:
  - mechanics
  - system/market
  - hub
status: active
world: mechanics
note_type: system
system: market
implementation: shipped
verified_on: 2026-07-19
---
ldron
# Market Systems

The Market room contains Trader/NPC sales, player trading, and the crystals tab. Permanent market licences isolate both NPC and player economies.

> [!tip] Start visually
> Open [[mechanics/market/Market.canvas|Market graph]], then click any component or market type.

## Tabs

- [[mechanics/market/NPC Market|Trader / NPC Market]]
  - [[mechanics/market/Fast Sell|Fast Sell]]
  - [[mechanics/market/Trader Stands|Automatic Trader Stands]]
  - [[mechanics/market/NPC Stock|Shared NPC Stock]]
  - [[mechanics/market/Demand And Pricing|Demand and Pricing]]
- [[mechanics/market/Player Market|Player Market]]
  - [[mechanics/market/Player Listings|Listings]]
  - [[mechanics/market/Player Requests|Requests]]
  - [[mechanics/market/Browse And Purchase|Browse and Purchase]]
  - [[mechanics/market/Proceeds Royalties And History|Proceeds, Royalties, and History]]
- [[mechanics/market/Crystal Shop|Crystals]]

## Browse components

![[mechanics/market/Market Components.base#Components]]

## Permanent market types

[[mechanics/market/Market Licences|Market Licences]] selects the highest unlocked licence from permanent Prestige stars. All five source-default markets currently use the same catalog and balance, but their demand, stock, prices, listings, and requests are isolated.

![[mechanics/market/Market Components.base#Market Licences]]

## Truth boundaries

- [[mechanics/market/Market Authority|Market Authority]] explains what the backend and client each own.
- [[mechanics/market/Market Runtime Config|Market Runtime Config]] records the current shop-key mismatch and effective fallback.
- [[balance/Market Tuning|Market Tuning]] contains balance-level rules.

## Source map

- `src/pages/shop/`
- `src/gameplay/shop/`
- `src/gameplay/market/`
- `src/backend/npcMarket/`
- `src/backend/playerShop/`
- `spacetimedb/src/index.ts`
