---
title: "Dragon Courage"
tags:
  - mechanics
  - entity/potion
  - system/potions
status: active
world: mechanics
note_type: potion
system: potions
implementation: shipped
catalog_order: 16
entity_id: dragonCourage
item_type_id: 2016
recipe_access: "research"
base_sell_coin: 285.6
value_scope: effective-maincloud-items
mana_cost: 58
brew_seconds: 125
brew_time: "2m 5s"
ingredients:
  - "[[mechanics/garden/herbs/Dragonpepper Herb|Dragonpepper]]"
  - "[[mechanics/garden/herbs/Sunroot Herb|Sunroot]]"
  - "[[mechanics/garden/herbs/Nettle Herb|Nettle]]"
unlock_research_id: "unlockRecipe:dragonCourage"
required_player_level: 44
default_research_cost_coin: 115000
default_research_duration_seconds: 5400
default_research_duration: "1h 30m"
previous_recipe_research: "[[mechanics/potions/potions/Pact Ward|Pact Ward]]"
sold_through:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/items/managers/PotionRecipeManager.js
  - src/gameplay/research/managers/ResearchDefinitionManager.js
---

# Dragon Courage

> [!summary] At a glance
> It becomes brewable through [[mechanics/potions/Recipe Unlock Research|recipe research]] `unlockRecipe:dragonCourage` at player level 44. Its effective item base sell value is **285.6 coin**.

## Ordered recipe

| Order | Herb | Quantity |
| ---: | --- | ---: |
| 1 | [[mechanics/garden/herbs/Dragonpepper Herb|Dragonpepper]] | 1 |
| 2 | [[mechanics/garden/herbs/Sunroot Herb|Sunroot]] | 2 |
| 3 | [[mechanics/garden/herbs/Nettle Herb|Nettle]] | 2 |

Brewing costs **58 mana** and takes **2m 5s** before bottling. Ingredient order matters.

## Access

| Property | Value |
| --- | --- |
| Player level | 44 |
| Base research cost | 115,000 coin |
| Base research time | 1h 30m |
| Previous recipe research | [[mechanics/potions/potions/Pact Ward|Pact Ward]] |

## Connections

- [[mechanics/garden/herbs/Dragonpepper Herb|Dragonpepper]] ×1
- [[mechanics/garden/herbs/Sunroot Herb|Sunroot]] ×2
- [[mechanics/garden/herbs/Nettle Herb|Nettle]] ×2
- Sold through: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item value. Actual market quotes can vary with demand and market licence.

