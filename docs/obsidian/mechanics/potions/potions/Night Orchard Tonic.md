---
title: "Night Orchard Tonic"
tags:
  - mechanics
  - entity/potion
  - system/potions
status: active
world: mechanics
note_type: potion
system: potions
implementation: shipped
catalog_order: 25
entity_id: nightOrchardTonic
item_type_id: 2025
recipe_access: "global discovery + recipe research"
unlock_research_id: "unlockRecipe:nightOrchardTonic"
required_player_level: 35
previous_recipe_research: "[[mechanics/potions/potions/Star-Luck Philtre|Star-Luck Philtre]]"
base_sell_coin: 245.6
value_scope: effective-maincloud-items
mana_cost: 60
brew_seconds: 125
brew_time: "2m 5s"
ingredients:
  - "[[mechanics/garden/herbs/Bloodrose Herb|Bloodrose]]"
  - "[[mechanics/garden/herbs/Mint Herb|Mint]]"
  - "[[mechanics/garden/herbs/Dreambell Herb|Dreambell]]"
discovery: "[[mechanics/potions/Potion Discovery|Potion Discovery]]"
sold_through:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
verified_on: 2026-08-21
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/items/managers/PotionRecipeManager.js
  - src/gameplay/research/managers/ResearchDefinitionManager.js
---

# Night Orchard Tonic

> [!summary] At a glance
> Its exact ordered recipe is hidden from players until [[mechanics/potions/Potion Discovery|global discovery]]. Its effective item base sell value is **245.6 coin**.
> After discovery, other players unlock it through recipe research at level 35 after [[mechanics/potions/potions/Star-Luck Philtre|Star-Luck Philtre]].

## Ordered recipe

| Order | Herb | Quantity |
| ---: | --- | ---: |
| 1 | [[mechanics/garden/herbs/Bloodrose Herb|Bloodrose]] | 1 |
| 2 | [[mechanics/garden/herbs/Mint Herb|Mint]] | 2 |
| 3 | [[mechanics/garden/herbs/Dreambell Herb|Dreambell]] | 1 |

Brewing costs **60 mana** and takes **2m 5s** before bottling. Ingredient order matters.

## Access

| Property | Value |
| --- | --- |
| Access | Discovery owner, or recipe research after global discovery |
| Required player level | 35 |
| Previous recipe research | [[mechanics/potions/potions/Star-Luck Philtre|Star-Luck Philtre]] |
| Player visibility | hidden until discovered |

## Connections

- [[mechanics/garden/herbs/Bloodrose Herb|Bloodrose]] ×1
- [[mechanics/garden/herbs/Mint Herb|Mint]] ×2
- [[mechanics/garden/herbs/Dreambell Herb|Dreambell]] ×1
- Sold through: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item value. Actual market quotes can vary with demand and market licence.
