---
title: "Simple Antidote"
tags:
  - mechanics
  - entity/potion
  - system/potions
status: active
world: mechanics
note_type: potion
system: potions
implementation: shipped
catalog_order: 5
entity_id: simpleAntidote
item_type_id: 2005
recipe_access: "research"
base_sell_coin: 100
value_scope: effective-maincloud-items
mana_cost: 22
brew_seconds: 50
brew_time: "50 seconds"
ingredients:
  - "[[mechanics/garden/herbs/Nettle Herb|Nettle]]"
  - "[[mechanics/garden/herbs/Sage Herb|Sage]]"
  - "[[mechanics/garden/herbs/Glowcap Herb|Glowcap]]"
unlock_research_id: "unlockRecipe:simpleAntidote"
required_player_level: 14
default_research_cost_coin: 4700
default_research_duration_seconds: 1080
default_research_duration: "18m"
previous_recipe_research: "[[mechanics/potions/potions/Lantern Tonic|Lantern Tonic]]"
sold_through:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/items/managers/PotionRecipeManager.js
  - src/gameplay/research/managers/ResearchDefinitionManager.js
---

# Simple Antidote

> [!summary] At a glance
> It becomes brewable through [[mechanics/potions/Recipe Unlock Research|recipe research]] `unlockRecipe:simpleAntidote` at player level 14. Its effective item base sell value is **100 coin**.

## Ordered recipe

| Order | Herb | Quantity |
| ---: | --- | ---: |
| 1 | [[mechanics/garden/herbs/Nettle Herb|Nettle]] | 2 |
| 2 | [[mechanics/garden/herbs/Sage Herb|Sage]] | 1 |
| 3 | [[mechanics/garden/herbs/Glowcap Herb|Glowcap]] | 1 |

Brewing costs **22 mana** and takes **50 seconds** before bottling. Ingredient order matters.

## Access

| Property | Value |
| --- | --- |
| Player level | 14 |
| Base research cost | 4,700 coin |
| Base research time | 18m |
| Previous recipe research | [[mechanics/potions/potions/Lantern Tonic|Lantern Tonic]] |

## Connections

- [[mechanics/garden/herbs/Nettle Herb|Nettle]] ×2
- [[mechanics/garden/herbs/Sage Herb|Sage]] ×1
- [[mechanics/garden/herbs/Glowcap Herb|Glowcap]] ×1
- Sold through: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item value. Actual market quotes can vary with demand and market licence.

