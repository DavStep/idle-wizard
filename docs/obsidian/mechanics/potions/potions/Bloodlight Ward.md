---
title: "Bloodlight Ward"
tags:
  - mechanics
  - entity/potion
  - system/potions
status: active
world: mechanics
note_type: potion
system: potions
implementation: shipped
catalog_order: 28
entity_id: bloodlightWard
item_type_id: 2028
recipe_access: "global discovery"
base_sell_coin: 250.4
value_scope: effective-maincloud-items
mana_cost: 62
brew_seconds: 130
brew_time: "2m 10s"
ingredients:
  - "[[mechanics/garden/herbs/Bloodrose Herb|Bloodrose]]"
  - "[[mechanics/garden/herbs/Glowcap Herb|Glowcap]]"
  - "[[mechanics/garden/herbs/Briar Herb|Briar]]"
  - "[[mechanics/garden/herbs/Sage Herb|Sage]]"
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

# Bloodlight Ward

> [!summary] At a glance
> Its exact ordered recipe is hidden from players until [[mechanics/potions/Potion Discovery|global discovery]]. Its effective item base sell value is **250.4 coin**.

## Ordered recipe

| Order | Herb | Quantity |
| ---: | --- | ---: |
| 1 | [[mechanics/garden/herbs/Bloodrose Herb|Bloodrose]] | 1 |
| 2 | [[mechanics/garden/herbs/Glowcap Herb|Glowcap]] | 2 |
| 3 | [[mechanics/garden/herbs/Briar Herb|Briar]] | 1 |
| 4 | [[mechanics/garden/herbs/Sage Herb|Sage]] | 1 |

Brewing costs **62 mana** and takes **2m 10s** before bottling. Ingredient order matters.

## Access

| Property | Value |
| --- | --- |
| Access | [[mechanics/potions/Potion Discovery|Global discovery]] |
| Player visibility | hidden until discovered |

## Connections

- [[mechanics/garden/herbs/Bloodrose Herb|Bloodrose]] ×1
- [[mechanics/garden/herbs/Glowcap Herb|Glowcap]] ×2
- [[mechanics/garden/herbs/Briar Herb|Briar]] ×1
- [[mechanics/garden/herbs/Sage Herb|Sage]] ×1
- Sold through: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item value. Actual market quotes can vary with demand and market licence.

