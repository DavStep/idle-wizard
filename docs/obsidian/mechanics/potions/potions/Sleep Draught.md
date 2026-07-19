---
title: "Sleep Draught"
tags:
  - mechanics
  - entity/potion
  - system/potions
status: active
world: mechanics
note_type: potion
system: potions
implementation: shipped
catalog_order: 13
entity_id: sleepDraught
item_type_id: 2013
recipe_access: "research"
base_sell_coin: 200
value_scope: effective-maincloud-items
mana_cost: 42
brew_seconds: 95
brew_time: "1m 35s"
ingredients:
  - "[[mechanics/garden/herbs/Dreambell Herb|Dreambell]]"
  - "[[mechanics/garden/herbs/Lavender Herb|Lavender]]"
  - "[[mechanics/garden/herbs/Moonflower Herb|Moonflower]]"
unlock_research_id: "unlockRecipe:sleepDraught"
required_player_level: 29
default_research_cost_coin: 31000
default_research_duration_seconds: 2700
default_research_duration: "45m"
previous_recipe_research: "[[mechanics/potions/potions/Frostmoss Cleanse|Frostmoss Cleanse]]"
sold_through:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/items/managers/PotionRecipeManager.js
  - src/gameplay/research/managers/ResearchDefinitionManager.js
---

# Sleep Draught

> [!summary] At a glance
> It becomes brewable through [[mechanics/potions/Recipe Unlock Research|recipe research]] `unlockRecipe:sleepDraught` at player level 29. Its effective item base sell value is **200 coin**.

## Ordered recipe

| Order | Herb | Quantity |
| ---: | --- | ---: |
| 1 | [[mechanics/garden/herbs/Dreambell Herb|Dreambell]] | 1 |
| 2 | [[mechanics/garden/herbs/Lavender Herb|Lavender]] | 2 |
| 3 | [[mechanics/garden/herbs/Moonflower Herb|Moonflower]] | 1 |

Brewing costs **42 mana** and takes **1m 35s** before bottling. Ingredient order matters.

## Access

| Property | Value |
| --- | --- |
| Player level | 29 |
| Base research cost | 31,000 coin |
| Base research time | 45m |
| Previous recipe research | [[mechanics/potions/potions/Frostmoss Cleanse|Frostmoss Cleanse]] |

## Connections

- [[mechanics/garden/herbs/Dreambell Herb|Dreambell]] ×1
- [[mechanics/garden/herbs/Lavender Herb|Lavender]] ×2
- [[mechanics/garden/herbs/Moonflower Herb|Moonflower]] ×1
- Sold through: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item value. Actual market quotes can vary with demand and market licence.

