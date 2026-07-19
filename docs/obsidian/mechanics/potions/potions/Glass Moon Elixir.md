---
title: "Glass Moon Elixir"
tags:
  - mechanics
  - entity/potion
  - system/potions
status: active
world: mechanics
note_type: potion
system: potions
implementation: shipped
catalog_order: 23
entity_id: glassMoonElixir
item_type_id: 2023
recipe_access: "global discovery"
base_sell_coin: 285.6
value_scope: effective-maincloud-items
mana_cost: 52
brew_seconds: 110
brew_time: "1m 50s"
ingredients:
  - "[[mechanics/garden/herbs/Moonflower Herb|Moonflower]]"
  - "[[mechanics/garden/herbs/Frostmoss Herb|Frostmoss]]"
  - "[[mechanics/garden/herbs/Star Anise Herb|Star Anise]]"
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

# Glass Moon Elixir

> [!summary] At a glance
> Its exact ordered recipe is hidden from players until [[mechanics/potions/Potion Discovery|global discovery]]. Its effective item base sell value is **285.6 coin**.

## Ordered recipe

| Order | Herb | Quantity |
| ---: | --- | ---: |
| 1 | [[mechanics/garden/herbs/Moonflower Herb|Moonflower]] | 2 |
| 2 | [[mechanics/garden/herbs/Frostmoss Herb|Frostmoss]] | 1 |
| 3 | [[mechanics/garden/herbs/Star Anise Herb|Star Anise]] | 1 |

Brewing costs **52 mana** and takes **1m 50s** before bottling. Ingredient order matters.

## Access

| Property | Value |
| --- | --- |
| Access | [[mechanics/potions/Potion Discovery|Global discovery]] |
| Player visibility | hidden until discovered |

## Connections

- [[mechanics/garden/herbs/Moonflower Herb|Moonflower]] ×2
- [[mechanics/garden/herbs/Frostmoss Herb|Frostmoss]] ×1
- [[mechanics/garden/herbs/Star Anise Herb|Star Anise]] ×1
- Sold through: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item value. Actual market quotes can vary with demand and market licence.

