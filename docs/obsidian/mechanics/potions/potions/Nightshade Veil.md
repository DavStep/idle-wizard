---
title: "Nightshade Veil"
tags:
  - mechanics
  - entity/potion
  - system/potions
status: active
world: mechanics
note_type: potion
system: potions
implementation: shipped
catalog_order: 35
entity_id: nightshadeVeil
item_type_id: 2035
recipe_access: "research"
base_sell_coin: 520
value_scope: effective-maincloud-items
mana_cost: 90
brew_seconds: 200
brew_time: "3m 20s"
ingredients:
  - "[[mechanics/garden/herbs/Nightshade Herb|Nightshade]]"
  - "[[mechanics/garden/herbs/Frostmoss Herb|Frostmoss]]"
  - "[[mechanics/garden/herbs/Bloodrose Herb|Bloodrose]]"
unlock_research_id: "unlockRecipe:nightshadeVeil"
required_player_level: 62
default_research_cost_coin: 580000
default_research_duration_seconds: 9900
default_research_duration: "2h 45m"
previous_recipe_research: "[[mechanics/potions/potions/Comfrey Balm|Comfrey Balm]]"
sold_through:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/items/managers/PotionRecipeManager.js
  - src/gameplay/research/managers/ResearchDefinitionManager.js
---

# Nightshade Veil

> [!summary] At a glance
> It becomes brewable through [[mechanics/potions/Recipe Unlock Research|recipe research]] `unlockRecipe:nightshadeVeil` at player level 62. Its effective item base sell value is **520 coin**.

## Ordered recipe

| Order | Herb | Quantity |
| ---: | --- | ---: |
| 1 | [[mechanics/garden/herbs/Nightshade Herb|Nightshade]] | 1 |
| 2 | [[mechanics/garden/herbs/Frostmoss Herb|Frostmoss]] | 1 |
| 3 | [[mechanics/garden/herbs/Bloodrose Herb|Bloodrose]] | 1 |

Brewing costs **90 mana** and takes **3m 20s** before bottling. Ingredient order matters.

## Access

| Property | Value |
| --- | --- |
| Player level | 62 |
| Base research cost | 580,000 coin |
| Base research time | 2h 45m |
| Previous recipe research | [[mechanics/potions/potions/Comfrey Balm|Comfrey Balm]] |

## Connections

- [[mechanics/garden/herbs/Nightshade Herb|Nightshade]] ×1
- [[mechanics/garden/herbs/Frostmoss Herb|Frostmoss]] ×1
- [[mechanics/garden/herbs/Bloodrose Herb|Bloodrose]] ×1
- Sold through: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item value. Actual market quotes can vary with demand and market licence.

