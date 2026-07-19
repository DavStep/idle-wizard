---
title: "Calming Draught"
tags:
  - mechanics
  - entity/potion
  - system/potions
status: active
world: mechanics
note_type: potion
system: potions
implementation: shipped
catalog_order: 4
entity_id: calmingDraught
item_type_id: 2004
recipe_access: "research"
base_sell_coin: 75.2
value_scope: effective-maincloud-items
mana_cost: 18
brew_seconds: 45
brew_time: "45 seconds"
ingredients:
  - "[[mechanics/garden/herbs/Mint Herb|Mint]]"
  - "[[mechanics/garden/herbs/Lavender Herb|Lavender]]"
unlock_research_id: "unlockRecipe:calmingDraught"
required_player_level: 9
default_research_cost_coin: 160
default_research_duration_seconds: 240
default_research_duration: "4m"
previous_recipe_research: "[[mechanics/potions/potions/Nettle Vigor|Nettle Vigor]]"
sold_through:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/items/managers/PotionRecipeManager.js
  - src/gameplay/research/managers/ResearchDefinitionManager.js
---

# Calming Draught

> [!summary] At a glance
> It becomes brewable through [[mechanics/potions/Recipe Unlock Research|recipe research]] `unlockRecipe:calmingDraught` at player level 9. Its effective item base sell value is **75.2 coin**.

## Ordered recipe

| Order | Herb | Quantity |
| ---: | --- | ---: |
| 1 | [[mechanics/garden/herbs/Mint Herb|Mint]] | 2 |
| 2 | [[mechanics/garden/herbs/Lavender Herb|Lavender]] | 1 |

Brewing costs **18 mana** and takes **45 seconds** before bottling. Ingredient order matters.

## Access

| Property | Value |
| --- | --- |
| Player level | 9 |
| Base research cost | 160 coin |
| Base research time | 4m |
| Previous recipe research | [[mechanics/potions/potions/Nettle Vigor|Nettle Vigor]] |

## Connections

- [[mechanics/garden/herbs/Mint Herb|Mint]] ×2
- [[mechanics/garden/herbs/Lavender Herb|Lavender]] ×1
- Sold through: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item value. Actual market quotes can vary with demand and market licence.

