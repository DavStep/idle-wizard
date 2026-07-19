---
title: "Ember Sight"
tags:
  - mechanics
  - entity/potion
  - system/potions
status: active
world: mechanics
note_type: potion
system: potions
implementation: shipped
catalog_order: 21
entity_id: emberSight
item_type_id: 2021
recipe_access: "global discovery"
base_sell_coin: 255.2
value_scope: effective-maincloud-items
mana_cost: 58
brew_seconds: 120
brew_time: "2m"
ingredients:
  - "[[mechanics/garden/herbs/Dragonpepper Herb|Dragonpepper]]"
  - "[[mechanics/garden/herbs/Star Anise Herb|Star Anise]]"
  - "[[mechanics/garden/herbs/Sage Herb|Sage]]"
discovery: "[[mechanics/potions/Potion Discovery|Potion Discovery]]"
sold_through:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/items/managers/PotionRecipeManager.js
  - src/gameplay/research/managers/ResearchDefinitionManager.js
---

# Ember Sight

> [!summary] At a glance
> Its exact ordered recipe is hidden from players until [[mechanics/potions/Potion Discovery|global discovery]]. Its effective item base sell value is **255.2 coin**.

## Ordered recipe

| Order | Herb | Quantity |
| ---: | --- | ---: |
| 1 | [[mechanics/garden/herbs/Dragonpepper Herb|Dragonpepper]] | 1 |
| 2 | [[mechanics/garden/herbs/Star Anise Herb|Star Anise]] | 1 |
| 3 | [[mechanics/garden/herbs/Sage Herb|Sage]] | 1 |

Brewing costs **58 mana** and takes **2m** before bottling. Ingredient order matters.

## Access

| Property | Value |
| --- | --- |
| Access | [[mechanics/potions/Potion Discovery|Global discovery]] |
| Player visibility | hidden until discovered |

## Connections

- [[mechanics/garden/herbs/Dragonpepper Herb|Dragonpepper]] ×1
- [[mechanics/garden/herbs/Star Anise Herb|Star Anise]] ×1
- [[mechanics/garden/herbs/Sage Herb|Sage]] ×1
- Sold through: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item value. Actual market quotes can vary with demand and market licence.

