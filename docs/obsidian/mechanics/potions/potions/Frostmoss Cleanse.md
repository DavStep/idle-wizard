---
title: "Frostmoss Cleanse"
tags:
  - mechanics
  - entity/potion
  - system/potions
status: active
world: mechanics
note_type: potion
system: potions
implementation: shipped
catalog_order: 12
entity_id: frostmossCleanse
item_type_id: 2012
recipe_access: "research"
base_sell_coin: 160
value_scope: effective-maincloud-items
mana_cost: 38
brew_seconds: 85
brew_time: "1m 25s"
ingredients:
  - "[[mechanics/garden/herbs/Frostmoss Herb|Frostmoss]]"
  - "[[mechanics/garden/herbs/Glowcap Herb|Glowcap]]"
unlock_research_id: "unlockRecipe:frostmossCleanse"
required_player_level: 26
default_research_cost_coin: 23500
default_research_duration_seconds: 2400
default_research_duration: "40m"
previous_recipe_research: "[[mechanics/potions/potions/Moonlit Focus|Moonlit Focus]]"
sold_through:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/items/managers/PotionRecipeManager.js
  - src/gameplay/research/managers/ResearchDefinitionManager.js
---

# Frostmoss Cleanse

> [!summary] At a glance
> It becomes brewable through [[mechanics/potions/Recipe Unlock Research|recipe research]] `unlockRecipe:frostmossCleanse` at player level 26. Its effective item base sell value is **160 coin**.

## Ordered recipe

| Order | Herb | Quantity |
| ---: | --- | ---: |
| 1 | [[mechanics/garden/herbs/Frostmoss Herb|Frostmoss]] | 1 |
| 2 | [[mechanics/garden/herbs/Glowcap Herb|Glowcap]] | 2 |

Brewing costs **38 mana** and takes **1m 25s** before bottling. Ingredient order matters.

## Access

| Property | Value |
| --- | --- |
| Player level | 26 |
| Base research cost | 23,500 coin |
| Base research time | 40m |
| Previous recipe research | [[mechanics/potions/potions/Moonlit Focus|Moonlit Focus]] |

## Connections

- [[mechanics/garden/herbs/Frostmoss Herb|Frostmoss]] ×1
- [[mechanics/garden/herbs/Glowcap Herb|Glowcap]] ×2
- Sold through: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item value. Actual market quotes can vary with demand and market licence.

