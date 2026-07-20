---
title: "Garden Runtime Config Status"
aliases:
  - Garden Runtime Config
tags:
  - mechanics
  - engineering
  - risk
  - system/garden
status: active
world: mechanics
note_type: source-status
system: garden
implementation: mixed
verified_on: 2026-07-19
---

# Garden Runtime Config Status

> [!warning] Effective values and stored values currently diverge
> This was verified against Maincloud and the current checkout on 2026-07-19.

## Applies successfully

- Maincloud `game_config.items` is the effective 24-seed / 24-herb catalog.
- Maincloud `game_config.potionRecipes` is the effective recipe catalog.

## Rejected by the current client

- Stored Garden JSON uses `tileCostsGold`; the client requires `tileCostsCoin`.
- Stored Research JSON uses `researchCostsGold`; the client requires `researchCostsCoin`.

Those two `game_config` objects are rejected, so Garden uses its JavaScript fallback and the effective harvest phase is **3 seconds**, even though Maincloud currently stores 10 seconds.

Research has a second live layer: individual SpacetimeDB `research_config` rows can override a study's coin cost and duration after the rejected `game_config.research` fallback is loaded. Seed and recipe notes therefore show **client fallback values**, not guaranteed live values. Query the matching live row before changing or comparing research balance.

Before changing balance, verify both the backend field name and the value actually accepted by the current client.

## Source of truth

- `src/gameplay/garden/managers/GardenBalanceManager.js`
- `src/gameplay/research/managers/ResearchBalanceManager.js`
- `spacetimedb/src/index.ts`
