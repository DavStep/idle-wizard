---
title: "Recipe Unlock Research"
tags:
  - mechanics
  - progression/research
  - system/potions
status: active
world: mechanics
note_type: research-system
system: potions
implementation: shipped
currency: coin
chain: ordered
researchable_recipes: 28
verified_on: 2026-07-19
---

# Recipe Unlock Research

Twenty-eight known potion recipes unlock in one strict chain. Each potion note shows its required level, base coin cost, base duration, and prerequisite recipe.

![[mechanics/potions/Potion Catalog.base#Researchable Recipes]]

- Mana tonic is the first recipe and has no recipe prerequisite.
- Coin research-cost reduction can lower the paid amount.
- Current effective values use client defaults because the stored Maincloud research object still uses a rejected legacy field name.
- Research makes the known recipe brewable; it does not change ingredient order.

## Related

- [[mechanics/potions/Potion Recipes|Potion Recipes]]
- [[mechanics/garden/Seed Unlock Research|Seed Unlock Research]]
- [[mechanics/garden/Garden Runtime Config|Runtime Config Status]]

