---
title: "Lantern Tonic"
tags:
  - mechanics
  - entity/potion
  - system/potions
status: active
world: mechanics
note_type: potion
system: potions
implementation: shipped
catalog_order: 8
entity_id: lanternTonic
item_type_id: 2008
recipe_access: "research"
base_sell_coin: 100
value_scope: effective-maincloud-items
mana_cost: 22
brew_seconds: 55
brew_time: "55 seconds"
ingredients:
  - "[[mechanics/garden/herbs/Glowcap Herb|Glowcap]]"
  - "[[mechanics/garden/herbs/Mint Herb|Mint]]"
unlock_research_id: "unlockRecipe:lanternTonic"
required_player_level: 12
default_research_cost_coin: 3200
default_research_duration_seconds: 900
default_research_duration: "15m"
previous_recipe_research: "[[mechanics/potions/potions/Briar Ward|Briar Ward]]"
sold_through:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/items/managers/PotionRecipeManager.js
  - src/gameplay/research/managers/ResearchDefinitionManager.js
---

# Lantern Tonic

> [!summary] At a glance
> It becomes brewable through [[mechanics/potions/Recipe Unlock Research|recipe research]] `unlockRecipe:lanternTonic` at player level 12. Its effective item base sell value is **100 coin**.

## Ordered recipe

| Order | Herb | Quantity |
| ---: | --- | ---: |
| 1 | [[mechanics/garden/herbs/Glowcap Herb|Glowcap]] | 2 |
| 2 | [[mechanics/garden/herbs/Mint Herb|Mint]] | 1 |

Brewing costs **22 mana** and takes **55 seconds** before bottling. Ingredient order matters.

## Access

| Property | Value |
| --- | --- |
| Player level | 12 |
| Base research cost | 3,200 coin |
| Base research time | 15m |
| Previous recipe research | [[mechanics/potions/potions/Briar Ward|Briar Ward]] |

## Connections

- [[mechanics/garden/herbs/Glowcap Herb|Glowcap]] ×2
- [[mechanics/garden/herbs/Mint Herb|Mint]] ×1
- Sold through: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item value. Actual market quotes can vary with demand and market licence.

