---
title: "Wasted Potion"
tags:
  - mechanics
  - entity/potion
  - system/potions
status: active
world: mechanics
note_type: potion
system: potions
implementation: shipped
catalog_order: 29
entity_id: wastedPotion
item_type_id: 2029
recipe_access: "no recipe"
base_sell_coin: 0.8
value_scope: effective-maincloud-items
ingredients: []
sold_through:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/items/managers/PotionRecipeManager.js
  - src/gameplay/research/managers/ResearchDefinitionManager.js
---

# Wasted Potion

> [!summary] At a glance
> It has no recipe. Unmatched mixes produce it. Its effective item base sell value is **0.8 coin**.

## Ordered recipe

| Order | Herb | Quantity |
| ---: | --- | ---: |
| — | no recipe | — |


## Access

| Property | Value |
| --- | --- |
| Access | no recipe |
| Result | unmatched brew |

## Connections

- [[mechanics/potions/Potion Recipes|Potion Recipes]]
- Sold through: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item value. Actual market quotes can vary with demand and market licence.

