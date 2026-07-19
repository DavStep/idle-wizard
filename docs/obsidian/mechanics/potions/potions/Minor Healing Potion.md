---
title: "Minor Healing Potion"
tags:
  - mechanics
  - entity/potion
  - system/potions
status: active
world: mechanics
note_type: potion
system: potions
implementation: shipped
catalog_order: 2
entity_id: minorHealingPotion
item_type_id: 2002
recipe_access: "research"
base_sell_coin: 60
value_scope: effective-maincloud-items
mana_cost: 14
brew_seconds: 35
brew_time: "35 seconds"
ingredients:
  - "[[mechanics/garden/herbs/Sage Herb|Sage]]"
  - "[[mechanics/garden/herbs/Mint Herb|Mint]]"
unlock_research_id: "unlockRecipe:minorHealingPotion"
required_player_level: 6
default_research_cost_coin: 60
default_research_duration_seconds: 120
default_research_duration: "2m"
previous_recipe_research: "[[mechanics/potions/potions/Mana Tonic|Mana Tonic]]"
sold_through:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/items/managers/PotionRecipeManager.js
  - src/gameplay/research/managers/ResearchDefinitionManager.js
---

# Minor Healing Potion

> [!summary] At a glance
> It becomes brewable through [[mechanics/potions/Recipe Unlock Research|recipe research]] `unlockRecipe:minorHealingPotion` at player level 6. Its effective item base sell value is **60 coin**.

## Ordered recipe

| Order | Herb | Quantity |
| ---: | --- | ---: |
| 1 | [[mechanics/garden/herbs/Sage Herb|Sage]] | 2 |
| 2 | [[mechanics/garden/herbs/Mint Herb|Mint]] | 1 |

Brewing costs **14 mana** and takes **35 seconds** before bottling. Ingredient order matters.

## Access

| Property | Value |
| --- | --- |
| Player level | 6 |
| Base research cost | 60 coin |
| Base research time | 2m |
| Previous recipe research | [[mechanics/potions/potions/Mana Tonic|Mana Tonic]] |

## Connections

- [[mechanics/garden/herbs/Sage Herb|Sage]] ×2
- [[mechanics/garden/herbs/Mint Herb|Mint]] ×1
- Sold through: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item value. Actual market quotes can vary with demand and market licence.

