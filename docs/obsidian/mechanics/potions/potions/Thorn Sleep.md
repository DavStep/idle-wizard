---
title: "Thorn Sleep"
tags:
  - mechanics
  - entity/potion
  - system/potions
status: active
world: mechanics
note_type: potion
system: potions
implementation: shipped
catalog_order: 22
entity_id: thornSleep
item_type_id: 2022
recipe_access: "global discovery"
base_sell_coin: 155.2
value_scope: effective-maincloud-items
mana_cost: 44
brew_seconds: 90
brew_time: "1m 30s"
ingredients:
  - "[[mechanics/garden/herbs/Briar Herb|Briar]]"
  - "[[mechanics/garden/herbs/Dreambell Herb|Dreambell]]"
  - "[[mechanics/garden/herbs/Lavender Herb|Lavender]]"
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

# Thorn Sleep

> [!summary] At a glance
> Its exact ordered recipe is hidden from players until [[mechanics/potions/Potion Discovery|global discovery]]. Its effective item base sell value is **155.2 coin**.

## Ordered recipe

| Order | Herb | Quantity |
| ---: | --- | ---: |
| 1 | [[mechanics/garden/herbs/Briar Herb|Briar]] | 1 |
| 2 | [[mechanics/garden/herbs/Dreambell Herb|Dreambell]] | 1 |
| 3 | [[mechanics/garden/herbs/Lavender Herb|Lavender]] | 1 |

Brewing costs **44 mana** and takes **1m 30s** before bottling. Ingredient order matters.

## Access

| Property | Value |
| --- | --- |
| Access | [[mechanics/potions/Potion Discovery|Global discovery]] |
| Player visibility | hidden until discovered |

## Connections

- [[mechanics/garden/herbs/Briar Herb|Briar]] ×1
- [[mechanics/garden/herbs/Dreambell Herb|Dreambell]] ×1
- [[mechanics/garden/herbs/Lavender Herb|Lavender]] ×1
- Sold through: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item value. Actual market quotes can vary with demand and market licence.

