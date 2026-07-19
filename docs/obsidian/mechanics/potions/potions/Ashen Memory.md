---
title: "Ashen Memory"
tags:
  - mechanics
  - entity/potion
  - system/potions
status: active
world: mechanics
note_type: potion
system: potions
implementation: shipped
catalog_order: 19
entity_id: ashenMemory
item_type_id: 2019
recipe_access: "global discovery"
base_sell_coin: 130.4
value_scope: effective-maincloud-items
mana_cost: 36
brew_seconds: 80
brew_time: "1m 20s"
ingredients:
  - "[[mechanics/garden/herbs/Sage Herb|Sage]]"
  - "[[mechanics/garden/herbs/Lavender Herb|Lavender]]"
  - "[[mechanics/garden/herbs/Frostmoss Herb|Frostmoss]]"
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

# Ashen Memory

> [!summary] At a glance
> Its exact ordered recipe is hidden from players until [[mechanics/potions/Potion Discovery|global discovery]]. Its effective item base sell value is **130.4 coin**.

## Ordered recipe

| Order | Herb | Quantity |
| ---: | --- | ---: |
| 1 | [[mechanics/garden/herbs/Sage Herb|Sage]] | 1 |
| 2 | [[mechanics/garden/herbs/Lavender Herb|Lavender]] | 1 |
| 3 | [[mechanics/garden/herbs/Frostmoss Herb|Frostmoss]] | 1 |

Brewing costs **36 mana** and takes **1m 20s** before bottling. Ingredient order matters.

## Access

| Property | Value |
| --- | --- |
| Access | [[mechanics/potions/Potion Discovery|Global discovery]] |
| Player visibility | hidden until discovered |

## Connections

- [[mechanics/garden/herbs/Sage Herb|Sage]] ×1
- [[mechanics/garden/herbs/Lavender Herb|Lavender]] ×1
- [[mechanics/garden/herbs/Frostmoss Herb|Frostmoss]] ×1
- Sold through: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item value. Actual market quotes can vary with demand and market licence.

