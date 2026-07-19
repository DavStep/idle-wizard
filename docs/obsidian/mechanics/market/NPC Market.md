---
title: "NPC Market"
aliases:
  - Trader Market
  - trader market
  - NPC market
tags:
  - mechanics
  - system/market
  - component
status: active
world: mechanics
note_type: trading-component
system: market
implementation: shipped
player_facing_name: trader market
internal_tab_id: npm
page_unlock_level: 1
backend_quotes_from_level: 4
backend_role: shared quotes, demand, and stock
source_scope: mixed
verified_on: 2026-07-19
related:
  - "[[mechanics/market/Fast Sell|Fast Sell]]"
  - "[[mechanics/market/Trader Stands|Trader Stands]]"
  - "[[mechanics/market/NPC Stock|NPC Stock]]"
  - "[[mechanics/market/Demand And Pricing|Demand and Pricing]]"
---

# NPC Market

The player-facing tab is **trader market**. Code and backend features commonly call it the NPC market; the legacy internal tab id is `npm`.

## Components

- [[mechanics/market/Fast Sell|Fast Sell]] — immediate manual sale at a reduced percentage.
- [[mechanics/market/Trader Stands|Trader Stands]] — automatic sales on a shared half-hour cycle.
- [[mechanics/market/NPC Stock|NPC Stock]] — shared items players can buy.
- [[mechanics/market/Demand And Pricing|Demand and Pricing]] — shared need, quotes, recovery, and tuning.
- [[mechanics/market/Sellable Quantity|Sellable Quantity]] — inventory minus garden/brewing reservations.

## Level split

- The Market room is visible from level 1.
- Before level 4, the game uses local fake need **1000** and each item's base sell value. No NPC sell or buy reducer is sent.
- From level 4, quotes, need, and stock come from the active [[mechanics/market/Market Licences|market licence]] pool.

## Items

Seeds, herbs, and potions can be quoted. Ingredient inventory is not part of the current market catalog.

## Source of truth

- `src/gameplay/shop/`
- `src/backend/npcMarket/`
- `spacetimedb/src/index.ts`

