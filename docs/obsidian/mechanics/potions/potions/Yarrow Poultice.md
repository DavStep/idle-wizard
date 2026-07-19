---
title: "Yarrow Poultice"
tags:
  - mechanics
  - entity/potion
  - system/potions
status: active
world: mechanics
note_type: potion
system: potions
implementation: shipped
catalog_order: 31
entity_id: yarrowPoultice
item_type_id: 2031
recipe_access: "research"
base_sell_coin: 368
value_scope: effective-maincloud-items
mana_cost: 72
brew_seconds: 155
brew_time: "2m 35s"
ingredients:
  - "[[mechanics/garden/herbs/Yarrow Herb|Yarrow]]"
  - "[[mechanics/garden/herbs/Mint Herb|Mint]]"
  - "[[mechanics/garden/herbs/Lavender Herb|Lavender]]"
unlock_research_id: "unlockRecipe:yarrowPoultice"
required_player_level: 50
default_research_cost_coin: 195000
default_research_duration_seconds: 6600
default_research_duration: "1h 50m"
previous_recipe_research: "[[mechanics/potions/potions/Silverleaf Salve|Silverleaf Salve]]"
sold_through:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/items/managers/PotionRecipeManager.js
  - src/gameplay/research/managers/ResearchDefinitionManager.js
---

# Yarrow Poultice

> [!summary] At a glance
> It becomes brewable through [[mechanics/potions/Recipe Unlock Research|recipe research]] `unlockRecipe:yarrowPoultice` at player level 50. Its effective item base sell value is **368 coin**.

## Ordered recipe

| Order | Herb | Quantity |
| ---: | --- | ---: |
| 1 | [[mechanics/garden/herbs/Yarrow Herb|Yarrow]] | 2 |
| 2 | [[mechanics/garden/herbs/Mint Herb|Mint]] | 1 |
| 3 | [[mechanics/garden/herbs/Lavender Herb|Lavender]] | 1 |

Brewing costs **72 mana** and takes **2m 35s** before bottling. Ingredient order matters.

## Access

| Property | Value |
| --- | --- |
| Player level | 50 |
| Base research cost | 195,000 coin |
| Base research time | 1h 50m |
| Previous recipe research | [[mechanics/potions/potions/Silverleaf Salve|Silverleaf Salve]] |

## Connections

- [[mechanics/garden/herbs/Yarrow Herb|Yarrow]] ×2
- [[mechanics/garden/herbs/Mint Herb|Mint]] ×1
- [[mechanics/garden/herbs/Lavender Herb|Lavender]] ×1
- Sold through: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item value. Actual market quotes can vary with demand and market licence.

