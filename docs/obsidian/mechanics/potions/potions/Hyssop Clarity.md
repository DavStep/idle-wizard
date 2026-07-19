---
title: "Hyssop Clarity"
tags:
  - mechanics
  - entity/potion
  - system/potions
status: active
world: mechanics
note_type: potion
system: potions
implementation: shipped
catalog_order: 32
entity_id: hyssopClarity
item_type_id: 2032
recipe_access: "research"
base_sell_coin: 400
value_scope: effective-maincloud-items
mana_cost: 76
brew_seconds: 165
brew_time: "2m 45s"
ingredients:
  - "[[mechanics/garden/herbs/Hyssop Herb|Hyssop]]"
  - "[[mechanics/garden/herbs/Moonflower Herb|Moonflower]]"
  - "[[mechanics/garden/herbs/Glowcap Herb|Glowcap]]"
unlock_research_id: "unlockRecipe:hyssopClarity"
required_player_level: 53
default_research_cost_coin: 255000
default_research_duration_seconds: 7200
default_research_duration: "2h"
previous_recipe_research: "[[mechanics/potions/potions/Yarrow Poultice|Yarrow Poultice]]"
sold_through:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/items/managers/PotionRecipeManager.js
  - src/gameplay/research/managers/ResearchDefinitionManager.js
---

# Hyssop Clarity

> [!summary] At a glance
> It becomes brewable through [[mechanics/potions/Recipe Unlock Research|recipe research]] `unlockRecipe:hyssopClarity` at player level 53. Its effective item base sell value is **400 coin**.

## Ordered recipe

| Order | Herb | Quantity |
| ---: | --- | ---: |
| 1 | [[mechanics/garden/herbs/Hyssop Herb|Hyssop]] | 2 |
| 2 | [[mechanics/garden/herbs/Moonflower Herb|Moonflower]] | 1 |
| 3 | [[mechanics/garden/herbs/Glowcap Herb|Glowcap]] | 1 |

Brewing costs **76 mana** and takes **2m 45s** before bottling. Ingredient order matters.

## Access

| Property | Value |
| --- | --- |
| Player level | 53 |
| Base research cost | 255,000 coin |
| Base research time | 2h |
| Previous recipe research | [[mechanics/potions/potions/Yarrow Poultice|Yarrow Poultice]] |

## Connections

- [[mechanics/garden/herbs/Hyssop Herb|Hyssop]] ×2
- [[mechanics/garden/herbs/Moonflower Herb|Moonflower]] ×1
- [[mechanics/garden/herbs/Glowcap Herb|Glowcap]] ×1
- Sold through: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item value. Actual market quotes can vary with demand and market licence.

