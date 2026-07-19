---
title: "Comfrey Balm"
tags:
  - mechanics
  - entity/potion
  - system/potions
status: active
world: mechanics
note_type: potion
system: potions
implementation: shipped
catalog_order: 34
entity_id: comfreyBalm
item_type_id: 2034
recipe_access: "research"
base_sell_coin: 476
value_scope: effective-maincloud-items
mana_cost: 84
brew_seconds: 185
brew_time: "3m 5s"
ingredients:
  - "[[mechanics/garden/herbs/Comfrey Herb|Comfrey]]"
  - "[[mechanics/garden/herbs/Sunroot Herb|Sunroot]]"
  - "[[mechanics/garden/herbs/Mandrake Herb|Mandrake]]"
unlock_research_id: "unlockRecipe:comfreyBalm"
required_player_level: 59
default_research_cost_coin: 440000
default_research_duration_seconds: 9000
default_research_duration: "2h 30m"
previous_recipe_research: "[[mechanics/potions/potions/Valerian Rest|Valerian Rest]]"
sold_through:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/items/managers/PotionRecipeManager.js
  - src/gameplay/research/managers/ResearchDefinitionManager.js
---

# Comfrey Balm

> [!summary] At a glance
> It becomes brewable through [[mechanics/potions/Recipe Unlock Research|recipe research]] `unlockRecipe:comfreyBalm` at player level 59. Its effective item base sell value is **476 coin**.

## Ordered recipe

| Order | Herb | Quantity |
| ---: | --- | ---: |
| 1 | [[mechanics/garden/herbs/Comfrey Herb|Comfrey]] | 2 |
| 2 | [[mechanics/garden/herbs/Sunroot Herb|Sunroot]] | 1 |
| 3 | [[mechanics/garden/herbs/Mandrake Herb|Mandrake]] | 1 |

Brewing costs **84 mana** and takes **3m 5s** before bottling. Ingredient order matters.

## Access

| Property | Value |
| --- | --- |
| Player level | 59 |
| Base research cost | 440,000 coin |
| Base research time | 2h 30m |
| Previous recipe research | [[mechanics/potions/potions/Valerian Rest|Valerian Rest]] |

## Connections

- [[mechanics/garden/herbs/Comfrey Herb|Comfrey]] ×2
- [[mechanics/garden/herbs/Sunroot Herb|Sunroot]] ×1
- [[mechanics/garden/herbs/Mandrake Herb|Mandrake]] ×1
- Sold through: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item value. Actual market quotes can vary with demand and market licence.

