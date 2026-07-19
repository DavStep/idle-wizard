---
title: "Snowdrop Breath"
tags:
  - mechanics
  - entity/potion
  - system/potions
status: active
world: mechanics
note_type: potion
system: potions
implementation: shipped
catalog_order: 38
entity_id: snowdropBreath
item_type_id: 2038
recipe_access: "research"
base_sell_coin: 676
value_scope: effective-maincloud-items
mana_cost: 110
brew_seconds: 245
brew_time: "4m 5s"
ingredients:
  - "[[mechanics/garden/herbs/Snowdrop Herb|Snowdrop]]"
  - "[[mechanics/garden/herbs/Silverleaf Herb|Silverleaf]]"
  - "[[mechanics/garden/herbs/Moonflower Herb|Moonflower]]"
unlock_research_id: "unlockRecipe:snowdropBreath"
required_player_level: 71
default_research_cost_coin: 1300000
default_research_duration_seconds: 12600
default_research_duration: "3h 30m"
previous_recipe_research: "[[mechanics/potions/potions/Wormwood Purge|Wormwood Purge]]"
sold_through:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/items/managers/PotionRecipeManager.js
  - src/gameplay/research/managers/ResearchDefinitionManager.js
---

# Snowdrop Breath

> [!summary] At a glance
> It becomes brewable through [[mechanics/potions/Recipe Unlock Research|recipe research]] `unlockRecipe:snowdropBreath` at player level 71. Its effective item base sell value is **676 coin**.

## Ordered recipe

| Order | Herb | Quantity |
| ---: | --- | ---: |
| 1 | [[mechanics/garden/herbs/Snowdrop Herb|Snowdrop]] | 1 |
| 2 | [[mechanics/garden/herbs/Silverleaf Herb|Silverleaf]] | 1 |
| 3 | [[mechanics/garden/herbs/Moonflower Herb|Moonflower]] | 2 |

Brewing costs **110 mana** and takes **4m 5s** before bottling. Ingredient order matters.

## Access

| Property | Value |
| --- | --- |
| Player level | 71 |
| Base research cost | 1,300,000 coin |
| Base research time | 3h 30m |
| Previous recipe research | [[mechanics/potions/potions/Wormwood Purge|Wormwood Purge]] |

## Connections

- [[mechanics/garden/herbs/Snowdrop Herb|Snowdrop]] ×1
- [[mechanics/garden/herbs/Silverleaf Herb|Silverleaf]] ×1
- [[mechanics/garden/herbs/Moonflower Herb|Moonflower]] ×2
- Sold through: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item value. Actual market quotes can vary with demand and market licence.

