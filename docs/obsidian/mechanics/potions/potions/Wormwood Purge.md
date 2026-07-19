---
title: "Wormwood Purge"
tags:
  - mechanics
  - entity/potion
  - system/potions
status: active
world: mechanics
note_type: potion
system: potions
implementation: shipped
catalog_order: 37
entity_id: wormwoodPurge
item_type_id: 2037
recipe_access: "research"
base_sell_coin: 620
value_scope: effective-maincloud-items
mana_cost: 102
brew_seconds: 230
brew_time: "3m 50s"
ingredients:
  - "[[mechanics/garden/herbs/Wormwood Herb|Wormwood]]"
  - "[[mechanics/garden/herbs/Nettle Herb|Nettle]]"
  - "[[mechanics/garden/herbs/Frostmoss Herb|Frostmoss]]"
unlock_research_id: "unlockRecipe:wormwoodPurge"
required_player_level: 68
default_research_cost_coin: 1000000
default_research_duration_seconds: 11700
default_research_duration: "3h 15m"
previous_recipe_research: "[[mechanics/potions/potions/Belladonna Sight|Belladonna Sight]]"
sold_through:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/items/managers/PotionRecipeManager.js
  - src/gameplay/research/managers/ResearchDefinitionManager.js
---

# Wormwood Purge

> [!summary] At a glance
> It becomes brewable through [[mechanics/potions/Recipe Unlock Research|recipe research]] `unlockRecipe:wormwoodPurge` at player level 68. Its effective item base sell value is **620 coin**.

## Ordered recipe

| Order | Herb | Quantity |
| ---: | --- | ---: |
| 1 | [[mechanics/garden/herbs/Wormwood Herb|Wormwood]] | 1 |
| 2 | [[mechanics/garden/herbs/Nettle Herb|Nettle]] | 2 |
| 3 | [[mechanics/garden/herbs/Frostmoss Herb|Frostmoss]] | 1 |

Brewing costs **102 mana** and takes **3m 50s** before bottling. Ingredient order matters.

## Access

| Property | Value |
| --- | --- |
| Player level | 68 |
| Base research cost | 1,000,000 coin |
| Base research time | 3h 15m |
| Previous recipe research | [[mechanics/potions/potions/Belladonna Sight|Belladonna Sight]] |

## Connections

- [[mechanics/garden/herbs/Wormwood Herb|Wormwood]] ×1
- [[mechanics/garden/herbs/Nettle Herb|Nettle]] ×2
- [[mechanics/garden/herbs/Frostmoss Herb|Frostmoss]] ×1
- Sold through: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item value. Actual market quotes can vary with demand and market licence.

