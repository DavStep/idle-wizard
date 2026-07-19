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

Those objects are rejected, so the current client uses its JavaScript fallback values. The effective Garden harvest phase is **3 seconds**, even though Maincloud currently stores 10 seconds. Seed/recipe research notes therefore show current client defaults, not the rejected stored overrides.

Before changing balance, verify both the backend field name and the value actually accepted by the current client.

## Source of truth

- `src/gameplay/garden/managers/GardenBalanceManager.js`
- `src/gameplay/research/managers/ResearchBalanceManager.js`
- `spacetimedb/src/index.ts`

