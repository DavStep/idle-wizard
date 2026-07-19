---
title: "Garden and Herbs"
aliases:
  - Herbs
  - Garden
tags:
  - mechanics
  - system/garden
  - hub
status: active
world: mechanics
note_type: system
system: garden
implementation: shipped
verified_on: 2026-07-19
---

# Garden and Herbs

Seeds are summoned, unlocked through research, planted in purchased plots, grown into herbs, and harvested for brewing or trade.

> [!tip] Start visually
> Open [[mechanics/garden/Garden And Herbs.canvas|Garden and Herbs graph]] to follow the system. Open a table below when you need exact values.

## Browse

- [[mechanics/garden/Herb Catalog.base|Herbs]] — growth time, base sell value, seed, research, and potion uses.
- [[mechanics/garden/Seed Catalog.base|Seeds]] — summon cost, drop weight, produced herb, and unlock.
- [[mechanics/garden/Plot Catalog.base|Plots]] — purchase cost, level or Prestige gate, and research.
- [[mechanics/garden/Garden Research.base|Garden research]] — the ordered seed-unlock chain.
- [[mechanics/potions/Potion Recipes|Potion recipes]] — every clickable potion connected to its ingredients.
- [[mechanics/market/Market Systems|Market systems]] — where seeds, herbs, and potions are sold.

## Herb catalog

![[mechanics/garden/Herb Catalog.base#Herbs]]

## System rules

- [[mechanics/garden/Seed Summoning|Seed summoning]] creates only researched seeds.
- [[mechanics/garden/Garden Lifecycle|Garden lifecycle]] owns selection, planting, growth, ready, and harvest states.
- [[mechanics/garden/Garden Plots|Garden plots]] own capacity and purchase gates.
- [[mechanics/garden/Plot Research|Plot research]] owns automation, growth speed, yield levels, and permanent capacity.
- [[mechanics/garden/Garden Runtime Config|Runtime config status]] distinguishes effective values from rejected legacy backend rows.

## Source map

- `src/gameplay/items/`
- `src/gameplay/seedSummoning/`
- `src/gameplay/garden/`
- `src/gameplay/research/`
- `src/gameplay/brewing/`
- `spacetimedb/src/index.ts`

