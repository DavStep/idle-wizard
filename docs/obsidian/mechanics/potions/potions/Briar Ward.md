---
title: "Briar Ward"
tags:
  - mechanics
  - entity/potion
  - system/potions
status: active
world: mechanics
note_type: potion
system: potions
implementation: shipped
catalog_order: 7
entity_id: briarWard
item_type_id: 2007
recipe_access: "research"
base_sell_coin: 105.6
value_scope: effective-maincloud-items
mana_cost: 24
brew_seconds: 60
brew_time: "1m"
ingredients:
  - "[[mechanics/garden/herbs/Briar Herb|Briar]]"
  - "[[mechanics/garden/herbs/Sage Herb|Sage]]"
unlock_research_id: "unlockRecipe:briarWard"
required_player_level: 10
default_research_cost_coin: 220
default_research_duration_seconds: 300
default_research_duration: "5m"
previous_recipe_research: "[[mechanics/potions/potions/Calming Draught|Calming Draught]]"
sold_through:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/items/managers/PotionRecipeManager.js
  - src/gameplay/research/managers/ResearchDefinitionManager.js
---

# Briar Ward

> [!summary] At a glance
> It becomes brewable through [[mechanics/potions/Recipe Unlock Research|recipe research]] `unlockRecipe:briarWard` at player level 10. Its effective item base sell value is **105.6 coin**.

## Ordered recipe

| Order | Herb | Quantity |
| ---: | --- | ---: |
| 1 | [[mechanics/garden/herbs/Briar Herb|Briar]] | 2 |
| 2 | [[mechanics/garden/herbs/Sage Herb|Sage]] | 2 |

Brewing costs **24 mana** and takes **1m** before bottling. Ingredient order matters.

## Access

| Property | Value |
| --- | --- |
| Player level | 10 |
| Base research cost | 220 coin |
| Base research time | 5m |
| Previous recipe research | [[mechanics/potions/potions/Calming Draught|Calming Draught]] |

## Connections

- [[mechanics/garden/herbs/Briar Herb|Briar]] ×2
- [[mechanics/garden/herbs/Sage Herb|Sage]] ×2
- Sold through: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item value. Actual market quotes can vary with demand and market licence.

