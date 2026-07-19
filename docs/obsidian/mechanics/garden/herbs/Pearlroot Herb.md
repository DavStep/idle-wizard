---
title: "Pearlroot Herb"
aliases:
  - "Pearlroot"
  - "pearlroot"
tags:
  - mechanics
  - entity/herb
  - system/garden
status: active
world: mechanics
note_type: herb
system: garden
implementation: shipped
catalog_order: 24
entity_id: pearlrootHerb
item_type_id: 1024
base_growth_seconds: 520
base_growth_time: "8m 40s"
base_sell_coin: 328
value_scope: effective-maincloud-items
grows_from: "[[mechanics/garden/seeds/Pearlroot Seed|Pearlroot Seed]]"
unlocked_by: "[[mechanics/garden/research/Unlock Pearlroot Seed|Unlock Pearlroot Seed]]"
used_in:
  - "[[mechanics/potions/potions/Pearlroot Draught|Pearlroot Draught]]"
sold_through:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/items/managers/PotionRecipeManager.js
  - spacetimedb/src/index.ts
---

# Pearlroot Herb

> [!summary] At a glance
> Pearlroot grows from [[mechanics/garden/seeds/Pearlroot Seed|Pearlroot Seed]] in **8m 40s** and has an effective item base sell value of **328 coin**.

## Potion connections

| Potion | Herb quantity | Unlock path |
| --- | ---: | --- |
| [[mechanics/potions/potions/Pearlroot Draught|Pearlroot Draught]] | 1 | recipe research, level 74 |

## Connections

- Research: [[mechanics/garden/research/Unlock Pearlroot Seed|Unlock Pearlroot Seed]]
- Grown in: [[mechanics/garden/Garden Plots|any purchased plot]]
- Lifecycle: [[mechanics/garden/Garden Lifecycle|Garden Lifecycle]]
- Trade: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item base value. From player level 4, actual NPC payout comes from market demand and the active licence.

## Source status

The item catalog applies successfully from Maincloud. See [[mechanics/garden/Garden Runtime Config|Garden Runtime Config Status]].

