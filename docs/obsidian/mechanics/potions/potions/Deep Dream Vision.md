---
title: "Deep Dream Vision"
tags:
  - mechanics
  - entity/potion
  - system/potions
status: active
world: mechanics
note_type: potion
system: potions
implementation: shipped
catalog_order: 17
entity_id: deepDreamVision
item_type_id: 2017
recipe_access: "research"
base_sell_coin: 365.6
value_scope: effective-maincloud-items
mana_cost: 62
brew_seconds: 135
brew_time: "2m 15s"
ingredients:
  - "[[mechanics/garden/herbs/Dreambell Herb|Dreambell]]"
  - "[[mechanics/garden/herbs/Star Anise Herb|Star Anise]]"
  - "[[mechanics/garden/herbs/Moonflower Herb|Moonflower]]"
unlock_research_id: "unlockRecipe:deepDreamVision"
required_player_level: 38
default_research_cost_coin: 68000
default_research_duration_seconds: 4200
default_research_duration: "1h 10m"
previous_recipe_research: "[[mechanics/potions/potions/Star-Luck Philtre|Star-Luck Philtre]]"
sold_through:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/items/managers/PotionRecipeManager.js
  - src/gameplay/research/managers/ResearchDefinitionManager.js
---

# Deep Dream Vision

> [!summary] At a glance
> It becomes brewable through [[mechanics/potions/Recipe Unlock Research|recipe research]] `unlockRecipe:deepDreamVision` at player level 38. Its effective item base sell value is **365.6 coin**.

## Ordered recipe

| Order | Herb | Quantity |
| ---: | --- | ---: |
| 1 | [[mechanics/garden/herbs/Dreambell Herb|Dreambell]] | 2 |
| 2 | [[mechanics/garden/herbs/Star Anise Herb|Star Anise]] | 1 |
| 3 | [[mechanics/garden/herbs/Moonflower Herb|Moonflower]] | 2 |

Brewing costs **62 mana** and takes **2m 15s** before bottling. Ingredient order matters.

## Access

| Property | Value |
| --- | --- |
| Player level | 38 |
| Base research cost | 68,000 coin |
| Base research time | 1h 10m |
| Previous recipe research | [[mechanics/potions/potions/Star-Luck Philtre|Star-Luck Philtre]] |

## Connections

- [[mechanics/garden/herbs/Dreambell Herb|Dreambell]] ×2
- [[mechanics/garden/herbs/Star Anise Herb|Star Anise]] ×1
- [[mechanics/garden/herbs/Moonflower Herb|Moonflower]] ×2
- Sold through: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item value. Actual market quotes can vary with demand and market licence.

