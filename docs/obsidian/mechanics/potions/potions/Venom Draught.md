---
title: "Venom Draught"
tags:
  - mechanics
  - entity/potion
  - system/potions
status: active
world: mechanics
note_type: potion
system: potions
implementation: shipped
catalog_order: 6
entity_id: venomDraught
item_type_id: 2006
recipe_access: "research"
base_sell_coin: 125.6
value_scope: effective-maincloud-items
mana_cost: 24
brew_seconds: 60
brew_time: "1m"
ingredients:
  - "[[mechanics/garden/herbs/Mandrake Herb|Mandrake]]"
  - "[[mechanics/garden/herbs/Nettle Herb|Nettle]]"
  - "[[mechanics/garden/herbs/Glowcap Herb|Glowcap]]"
unlock_research_id: "unlockRecipe:venomDraught"
required_player_level: 16
default_research_cost_coin: 6800
default_research_duration_seconds: 1320
default_research_duration: "22m"
previous_recipe_research: "[[mechanics/potions/potions/Simple Antidote|Simple Antidote]]"
sold_through:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/items/managers/PotionRecipeManager.js
  - src/gameplay/research/managers/ResearchDefinitionManager.js
---

# Venom Draught

> [!summary] At a glance
> It becomes brewable through [[mechanics/potions/Recipe Unlock Research|recipe research]] `unlockRecipe:venomDraught` at player level 16. Its effective item base sell value is **125.6 coin**.

## Ordered recipe

| Order | Herb | Quantity |
| ---: | --- | ---: |
| 1 | [[mechanics/garden/herbs/Mandrake Herb|Mandrake]] | 1 |
| 2 | [[mechanics/garden/herbs/Nettle Herb|Nettle]] | 2 |
| 3 | [[mechanics/garden/herbs/Glowcap Herb|Glowcap]] | 1 |

Brewing costs **24 mana** and takes **1m** before bottling. Ingredient order matters.

## Access

| Property | Value |
| --- | --- |
| Player level | 16 |
| Base research cost | 6,800 coin |
| Base research time | 22m |
| Previous recipe research | [[mechanics/potions/potions/Simple Antidote|Simple Antidote]] |

## Connections

- [[mechanics/garden/herbs/Mandrake Herb|Mandrake]] ×1
- [[mechanics/garden/herbs/Nettle Herb|Nettle]] ×2
- [[mechanics/garden/herbs/Glowcap Herb|Glowcap]] ×1
- Sold through: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item value. Actual market quotes can vary with demand and market licence.

