---
title: "Valerian Rest"
tags:
  - mechanics
  - entity/potion
  - system/potions
status: active
world: mechanics
note_type: potion
system: potions
implementation: shipped
catalog_order: 33
entity_id: valerianRest
item_type_id: 2033
recipe_access: "research"
base_sell_coin: 436
value_scope: effective-maincloud-items
mana_cost: 80
brew_seconds: 175
brew_time: "2m 55s"
ingredients:
  - "[[mechanics/garden/herbs/Valerian Herb|Valerian]]"
  - "[[mechanics/garden/herbs/Dreambell Herb|Dreambell]]"
  - "[[mechanics/garden/herbs/Lavender Herb|Lavender]]"
unlock_research_id: "unlockRecipe:valerianRest"
required_player_level: 56
default_research_cost_coin: 335000
default_research_duration_seconds: 8100
default_research_duration: "2h 15m"
previous_recipe_research: "[[mechanics/potions/potions/Hyssop Clarity|Hyssop Clarity]]"
sold_through:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/items/managers/PotionRecipeManager.js
  - src/gameplay/research/managers/ResearchDefinitionManager.js
---

# Valerian Rest

> [!summary] At a glance
> It becomes brewable through [[mechanics/potions/Recipe Unlock Research|recipe research]] `unlockRecipe:valerianRest` at player level 56. Its effective item base sell value is **436 coin**.

## Ordered recipe

| Order | Herb | Quantity |
| ---: | --- | ---: |
| 1 | [[mechanics/garden/herbs/Valerian Herb|Valerian]] | 2 |
| 2 | [[mechanics/garden/herbs/Dreambell Herb|Dreambell]] | 1 |
| 3 | [[mechanics/garden/herbs/Lavender Herb|Lavender]] | 1 |

Brewing costs **80 mana** and takes **2m 55s** before bottling. Ingredient order matters.

## Access

| Property | Value |
| --- | --- |
| Player level | 56 |
| Base research cost | 335,000 coin |
| Base research time | 2h 15m |
| Previous recipe research | [[mechanics/potions/potions/Hyssop Clarity|Hyssop Clarity]] |

## Connections

- [[mechanics/garden/herbs/Valerian Herb|Valerian]] ×2
- [[mechanics/garden/herbs/Dreambell Herb|Dreambell]] ×1
- [[mechanics/garden/herbs/Lavender Herb|Lavender]] ×1
- Sold through: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item value. Actual market quotes can vary with demand and market licence.

