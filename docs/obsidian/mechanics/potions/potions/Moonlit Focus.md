---
title: "Moonlit Focus"
tags:
  - mechanics
  - entity/potion
  - system/potions
status: active
world: mechanics
note_type: potion
system: potions
implementation: shipped
catalog_order: 10
entity_id: moonlitFocus
item_type_id: 2010
recipe_access: "research"
base_sell_coin: 125.6
value_scope: effective-maincloud-items
mana_cost: 30
brew_seconds: 70
brew_time: "1m 10s"
ingredients:
  - "[[mechanics/garden/herbs/Moonflower Herb|Moonflower]]"
  - "[[mechanics/garden/herbs/Lavender Herb|Lavender]]"
unlock_research_id: "unlockRecipe:moonlitFocus"
required_player_level: 23
default_research_cost_coin: 17500
default_research_duration_seconds: 2100
default_research_duration: "35m"
previous_recipe_research: "[[mechanics/potions/potions/Sunroot Stamina|Sunroot Stamina]]"
sold_through:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/items/managers/PotionRecipeManager.js
  - src/gameplay/research/managers/ResearchDefinitionManager.js
---

# Moonlit Focus

> [!summary] At a glance
> It becomes brewable through [[mechanics/potions/Recipe Unlock Research|recipe research]] `unlockRecipe:moonlitFocus` at player level 23. Its effective item base sell value is **125.6 coin**.

## Ordered recipe

| Order | Herb | Quantity |
| ---: | --- | ---: |
| 1 | [[mechanics/garden/herbs/Moonflower Herb|Moonflower]] | 1 |
| 2 | [[mechanics/garden/herbs/Lavender Herb|Lavender]] | 2 |

Brewing costs **30 mana** and takes **1m 10s** before bottling. Ingredient order matters.

## Access

| Property | Value |
| --- | --- |
| Player level | 23 |
| Base research cost | 17,500 coin |
| Base research time | 35m |
| Previous recipe research | [[mechanics/potions/potions/Sunroot Stamina|Sunroot Stamina]] |

## Connections

- [[mechanics/garden/herbs/Moonflower Herb|Moonflower]] ×1
- [[mechanics/garden/herbs/Lavender Herb|Lavender]] ×2
- Sold through: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item value. Actual market quotes can vary with demand and market licence.

