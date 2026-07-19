---
title: "Silverleaf Salve"
tags:
  - mechanics
  - entity/potion
  - system/potions
status: active
world: mechanics
note_type: potion
system: potions
implementation: shipped
catalog_order: 30
entity_id: silverleafSalve
item_type_id: 2030
recipe_access: "research"
base_sell_coin: 340
value_scope: effective-maincloud-items
mana_cost: 70
brew_seconds: 150
brew_time: "2m 30s"
ingredients:
  - "[[mechanics/garden/herbs/Silverleaf Herb|Silverleaf]]"
  - "[[mechanics/garden/herbs/Sage Herb|Sage]]"
  - "[[mechanics/garden/herbs/Comfrey Herb|Comfrey]]"
unlock_research_id: "unlockRecipe:silverleafSalve"
required_player_level: 47
default_research_cost_coin: 150000
default_research_duration_seconds: 6000
default_research_duration: "1h 40m"
previous_recipe_research: "[[mechanics/potions/potions/Dragon Courage|Dragon Courage]]"
sold_through:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/items/managers/PotionRecipeManager.js
  - src/gameplay/research/managers/ResearchDefinitionManager.js
---

# Silverleaf Salve

> [!summary] At a glance
> It becomes brewable through [[mechanics/potions/Recipe Unlock Research|recipe research]] `unlockRecipe:silverleafSalve` at player level 47. Its effective item base sell value is **340 coin**.

## Ordered recipe

| Order | Herb | Quantity |
| ---: | --- | ---: |
| 1 | [[mechanics/garden/herbs/Silverleaf Herb|Silverleaf]] | 2 |
| 2 | [[mechanics/garden/herbs/Sage Herb|Sage]] | 1 |
| 3 | [[mechanics/garden/herbs/Comfrey Herb|Comfrey]] | 1 |

Brewing costs **70 mana** and takes **2m 30s** before bottling. Ingredient order matters.

## Access

| Property | Value |
| --- | --- |
| Player level | 47 |
| Base research cost | 150,000 coin |
| Base research time | 1h 40m |
| Previous recipe research | [[mechanics/potions/potions/Dragon Courage|Dragon Courage]] |

## Connections

- [[mechanics/garden/herbs/Silverleaf Herb|Silverleaf]] ×2
- [[mechanics/garden/herbs/Sage Herb|Sage]] ×1
- [[mechanics/garden/herbs/Comfrey Herb|Comfrey]] ×1
- Sold through: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item value. Actual market quotes can vary with demand and market licence.

