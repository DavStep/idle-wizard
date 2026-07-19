---
title: "Potion Recipes"
aliases:
  - Potions
  - Brewing Recipes
tags:
  - mechanics
  - system/potions
  - hub
status: active
world: mechanics
note_type: system
system: potions
implementation: shipped
recipe_count: 38
potion_count: 39
verified_on: 2026-07-19
---

# Potion Recipes

Potions are brewed from ordered herb recipes. Every potion below opens as its own note, and every ingredient links back to its herb.

> [!tip] Read by connection
> Start from [[mechanics/garden/Garden And Herbs|an herb]] to see every potion that uses it, or use the catalog below to browse all potions.

![[mechanics/potions/Potion Catalog.base#All Potions]]

## Access paths

- [[mechanics/potions/Recipe Unlock Research|Recipe research]] unlocks 28 known recipes in a strict level-gated chain.
- [[mechanics/potions/Potion Discovery|Global discovery]] reveals 10 hidden recipes after the exact ordered mix is brewed.
- [[mechanics/potions/potions/Wasted Potion|Wasted Potion]] is the failure output for unmatched mixes and has no recipe.

## Core rules

- Ingredient order matters.
- Brewing spends mana and runs one brew timer.
- Known recipes require completed recipe research.
- Hidden recipes preview as wasted until globally discovered.
- Potion base sell values are item values, not guaranteed live market payouts.

## Source map

- `src/gameplay/items/managers/PotionRecipeManager.js`
- `src/gameplay/items/managers/ItemDefinitionManager.js`
- `src/gameplay/brewing/`
- `src/gameplay/research/managers/ResearchDefinitionManager.js`
- `spacetimedb/src/index.ts`

