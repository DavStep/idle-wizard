---
title: "Mana Tonic"
tags:
  - mechanics
  - entity/potion
  - system/potions
status: active
world: mechanics
note_type: potion
system: potions
implementation: shipped
catalog_order: 1
entity_id: manaTonic
item_type_id: 2001
recipe_access: "research"
base_sell_coin: 55.2
value_scope: effective-maincloud-items
mana_cost: 12
brew_seconds: 30
brew_time: "30 seconds"
ingredients:
  - "[[mechanics/garden/herbs/Sage Herb|Sage]]"
unlock_research_id: "unlockRecipe:manaTonic"
required_player_level: 4
default_research_cost_coin: 0
default_research_duration_seconds: 10
default_research_duration: "10 seconds"
sold_through:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/items/managers/PotionRecipeManager.js
  - src/gameplay/research/managers/ResearchDefinitionManager.js
---

# Mana Tonic

> [!summary] At a glance
> It becomes brewable through [[mechanics/potions/Recipe Unlock Research|recipe research]] `unlockRecipe:manaTonic` at player level 4. Its effective item base sell value is **55.2 coin**.

## Ordered recipe

| Order | Herb | Quantity |
| ---: | --- | ---: |
| 1 | [[mechanics/garden/herbs/Sage Herb|Sage]] | 3 |

Brewing costs **12 mana** and takes **30 seconds** before bottling. Ingredient order matters.

## Access

| Property | Value |
| --- | --- |
| Player level | 4 |
| Base research cost | 0 coin |
| Base research time | 10 seconds |
| Previous recipe research | none |

## Connections

- [[mechanics/garden/herbs/Sage Herb|Sage]] ×3
- Sold through: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item value. Actual market quotes can vary with demand and market licence.

