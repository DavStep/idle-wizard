---
title: "Starless Courage"
tags:
  - mechanics
  - entity/potion
  - system/potions
status: active
world: mechanics
note_type: potion
system: potions
implementation: shipped
catalog_order: 26
entity_id: starlessCourage
item_type_id: 2026
recipe_access: "global discovery"
base_sell_coin: 325.6
value_scope: effective-maincloud-items
mana_cost: 68
brew_seconds: 140
brew_time: "2m 20s"
ingredients:
  - "[[mechanics/garden/herbs/Dragonpepper Herb|Dragonpepper]]"
  - "[[mechanics/garden/herbs/Bloodrose Herb|Bloodrose]]"
  - "[[mechanics/garden/herbs/Sunroot Herb|Sunroot]]"
  - "[[mechanics/garden/herbs/Nettle Herb|Nettle]]"
discovery: "[[mechanics/potions/Potion Discovery|Potion Discovery]]"
sold_through:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/items/managers/PotionRecipeManager.js
  - src/gameplay/research/managers/ResearchDefinitionManager.js
---

# Starless Courage

> [!summary] At a glance
> Its exact ordered recipe is hidden from players until [[mechanics/potions/Potion Discovery|global discovery]]. Its effective item base sell value is **325.6 coin**.

## Ordered recipe

| Order | Herb | Quantity |
| ---: | --- | ---: |
| 1 | [[mechanics/garden/herbs/Dragonpepper Herb|Dragonpepper]] | 1 |
| 2 | [[mechanics/garden/herbs/Bloodrose Herb|Bloodrose]] | 1 |
| 3 | [[mechanics/garden/herbs/Sunroot Herb|Sunroot]] | 1 |
| 4 | [[mechanics/garden/herbs/Nettle Herb|Nettle]] | 1 |

Brewing costs **68 mana** and takes **2m 20s** before bottling. Ingredient order matters.

## Access

| Property | Value |
| --- | --- |
| Access | [[mechanics/potions/Potion Discovery|Global discovery]] |
| Player visibility | hidden until discovered |

## Connections

- [[mechanics/garden/herbs/Dragonpepper Herb|Dragonpepper]] ×1
- [[mechanics/garden/herbs/Bloodrose Herb|Bloodrose]] ×1
- [[mechanics/garden/herbs/Sunroot Herb|Sunroot]] ×1
- [[mechanics/garden/herbs/Nettle Herb|Nettle]] ×1
- Sold through: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item value. Actual market quotes can vary with demand and market licence.

