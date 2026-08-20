---
title: "Silverleaf Quiet"
tags:
  - mechanics
  - entity/potion
  - system/potions
status: active
world: mechanics
note_type: potion
system: potions
implementation: shipped
catalog_order: 20
entity_id: silverleafQuiet
item_type_id: 2020
recipe_access: "global discovery + recipe research"
unlock_research_id: "unlockRecipe:silverleafQuiet"
required_player_level: 23
previous_recipe_research: "[[mechanics/potions/potions/Moonlit Focus|Moonlit Focus]]"
base_sell_coin: 130.4
value_scope: effective-maincloud-items
mana_cost: 34
brew_seconds: 75
brew_time: "1m 15s"
ingredients:
  - "[[mechanics/garden/herbs/Mint Herb|Mint]]"
  - "[[mechanics/garden/herbs/Glowcap Herb|Glowcap]]"
  - "[[mechanics/garden/herbs/Moonflower Herb|Moonflower]]"
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

# Silverleaf Quiet

> [!summary] At a glance
> Its exact ordered recipe is hidden from players until [[mechanics/potions/Potion Discovery|global discovery]]. Its effective item base sell value is **130.4 coin**.
> After discovery, other players unlock it through recipe research at level 23 after [[mechanics/potions/potions/Moonlit Focus|Moonlit Focus]].

## Ordered recipe

| Order | Herb | Quantity |
| ---: | --- | ---: |
| 1 | [[mechanics/garden/herbs/Mint Herb|Mint]] | 1 |
| 2 | [[mechanics/garden/herbs/Glowcap Herb|Glowcap]] | 1 |
| 3 | [[mechanics/garden/herbs/Moonflower Herb|Moonflower]] | 1 |

Brewing costs **34 mana** and takes **1m 15s** before bottling. Ingredient order matters.

## Access

| Property | Value |
| --- | --- |
| Access | Discovery owner, or recipe research after global discovery |
| Required player level | 23 |
| Previous recipe research | [[mechanics/potions/potions/Moonlit Focus|Moonlit Focus]] |
| Player visibility | hidden until discovered |

## Connections

- [[mechanics/garden/herbs/Mint Herb|Mint]] ×1
- [[mechanics/garden/herbs/Glowcap Herb|Glowcap]] ×1
- [[mechanics/garden/herbs/Moonflower Herb|Moonflower]] ×1
- Sold through: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item value. Actual market quotes can vary with demand and market licence.
