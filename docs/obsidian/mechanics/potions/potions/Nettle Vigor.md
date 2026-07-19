---
title: "Nettle Vigor"
tags:
  - mechanics
  - entity/potion
  - system/potions
status: active
world: mechanics
note_type: potion
system: potions
implementation: shipped
catalog_order: 3
entity_id: nettleVigor
item_type_id: 2003
recipe_access: "research"
base_sell_coin: 65.6
value_scope: effective-maincloud-items
mana_cost: 16
brew_seconds: 40
brew_time: "40 seconds"
ingredients:
  - "[[mechanics/garden/herbs/Nettle Herb|Nettle]]"
  - "[[mechanics/garden/herbs/Sage Herb|Sage]]"
unlock_research_id: "unlockRecipe:nettleVigor"
required_player_level: 8
default_research_cost_coin: 100
default_research_duration_seconds: 180
default_research_duration: "3m"
previous_recipe_research: "[[mechanics/potions/potions/Minor Healing Potion|Minor Healing Potion]]"
sold_through:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/items/managers/PotionRecipeManager.js
  - src/gameplay/research/managers/ResearchDefinitionManager.js
---

# Nettle Vigor

> [!summary] At a glance
> It becomes brewable through [[mechanics/potions/Recipe Unlock Research|recipe research]] `unlockRecipe:nettleVigor` at player level 8. Its effective item base sell value is **65.6 coin**.

## Ordered recipe

| Order | Herb | Quantity |
| ---: | --- | ---: |
| 1 | [[mechanics/garden/herbs/Nettle Herb|Nettle]] | 2 |
| 2 | [[mechanics/garden/herbs/Sage Herb|Sage]] | 1 |

Brewing costs **16 mana** and takes **40 seconds** before bottling. Ingredient order matters.

## Access

| Property | Value |
| --- | --- |
| Player level | 8 |
| Base research cost | 100 coin |
| Base research time | 3m |
| Previous recipe research | [[mechanics/potions/potions/Minor Healing Potion|Minor Healing Potion]] |

## Connections

- [[mechanics/garden/herbs/Nettle Herb|Nettle]] ×2
- [[mechanics/garden/herbs/Sage Herb|Sage]] ×1
- Sold through: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item value. Actual market quotes can vary with demand and market licence.

