---
title: "Comfrey Herb"
aliases:
  - "Comfrey"
  - "comfrey"
tags:
  - mechanics
  - entity/herb
  - system/garden
status: active
world: mechanics
note_type: herb
system: garden
implementation: shipped
catalog_order: 19
entity_id: comfreyHerb
item_type_id: 1019
base_growth_seconds: 360
base_growth_time: "6m"
base_sell_coin: 132
value_scope: effective-maincloud-items
grows_from: "[[mechanics/garden/seeds/Comfrey Seed|Comfrey Seed]]"
unlocked_by: "[[mechanics/garden/research/Unlock Comfrey Seed|Unlock Comfrey Seed]]"
used_in:
  - "[[mechanics/potions/potions/Silverleaf Salve|Silverleaf Salve]]"
  - "[[mechanics/potions/potions/Comfrey Balm|Comfrey Balm]]"
sold_through:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/items/managers/PotionRecipeManager.js
  - spacetimedb/src/index.ts
---

# Comfrey Herb

> [!summary] At a glance
> Comfrey grows from [[mechanics/garden/seeds/Comfrey Seed|Comfrey Seed]] in **6m** and has an effective item base sell value of **132 coin**.

## Potion connections

| Potion | Herb quantity | Unlock path |
| --- | ---: | --- |
| [[mechanics/potions/potions/Silverleaf Salve|Silverleaf Salve]] | 1 | recipe research, level 47 |
| [[mechanics/potions/potions/Comfrey Balm|Comfrey Balm]] | 2 | recipe research, level 59 |

## Connections

- Research: [[mechanics/garden/research/Unlock Comfrey Seed|Unlock Comfrey Seed]]
- Grown in: [[mechanics/garden/Garden Plots|any purchased plot]]
- Lifecycle: [[mechanics/garden/Garden Lifecycle|Garden Lifecycle]]
- Trade: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item base value. From player level 4, actual NPC payout comes from market demand and the active licence.

## Source status

The item catalog applies successfully from Maincloud. See [[mechanics/garden/Garden Runtime Config|Garden Runtime Config Status]].

