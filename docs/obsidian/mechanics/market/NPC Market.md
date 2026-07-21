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
player_facing_name: traders
internal_tab_id: npm
page_unlock_level: 1
backend_quotes_from_level: 4
backend_role: shared quotes, demand, and stock
source_scope: mixed
verified_on: 2026-07-19
related:
  - "[[mechanics/market/Trader Stands|Trader Stands]]"
  - "[[mechanics/market/NPC Stock|NPC Stock]]"
  - "[[mechanics/market/Demand And Pricing|Demand and Pricing]]"
---

# NPC Market

The player-facing tab is **traders**. Code and backend features commonly call it the NPC market; the legacy internal tab id is `npm`.

## Components

- [[mechanics/market/Trader Stands|Trader Stands]] — loaded automatic sales on independent five-second cycles.
- [[mechanics/market/Market Ledger|Market Ledger]] — prices, recent movement, buyer need, stock, and buying.
- [[mechanics/market/Demand And Pricing|Demand and Pricing]] — shared need, quotes, recovery, and tuning.
- [[mechanics/market/Sellable Quantity|Sellable Quantity]] — inventory minus garden/brewing reservations.

## Level split

- The Market room is visible from level 1.
- Before level 4, the game uses local fake need **1000** and each item's base sell value. No NPC sell or buy reducer is sent.
- From level 4, quotes, need, and stock come from the active [[mechanics/market/Market Licences|market licence]] pool.

## Items

Seeds, herbs, and potions are divided into five progression-ordered grades. A market trades its own grade and all lower grades; player listings and requests use the same restriction. Ingredient inventory is not part of the market catalogue.

## Source of truth

- `src/gameplay/shop/`
- `src/backend/npcMarket/`
- `spacetimedb/src/index.ts`
