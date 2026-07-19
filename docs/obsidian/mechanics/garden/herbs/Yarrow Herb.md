---
title: "Yarrow Herb"
aliases:
  - "Yarrow"
  - "yarrow"
tags:
  - mechanics
  - entity/herb
  - system/garden
status: active
world: mechanics
note_type: herb
system: garden
implementation: shipped
catalog_order: 16
entity_id: yarrowHerb
item_type_id: 1016
base_growth_seconds: 270
base_growth_time: "4m 30s"
base_sell_coin: 76
value_scope: effective-maincloud-items
grows_from: "[[mechanics/garden/seeds/Yarrow Seed|Yarrow Seed]]"
unlocked_by: "[[mechanics/garden/research/Unlock Yarrow Seed|Unlock Yarrow Seed]]"
used_in:
  - "[[mechanics/potions/potions/Yarrow Poultice|Yarrow Poultice]]"
sold_through:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/items/managers/PotionRecipeManager.js
  - spacetimedb/src/index.ts
---

# Yarrow Herb

> [!summary] At a glance
> Yarrow grows from [[mechanics/garden/seeds/Yarrow Seed|Yarrow Seed]] in **4m 30s** and has an effective item base sell value of **76 coin**.

## Potion connections

| Potion | Herb quantity | Unlock path |
| --- | ---: | --- |
| [[mechanics/potions/potions/Yarrow Poultice|Yarrow Poultice]] | 2 | recipe research, level 50 |

## Connections

- Research: [[mechanics/garden/research/Unlock Yarrow Seed|Unlock Yarrow Seed]]
- Grown in: [[mechanics/garden/Garden Plots|any purchased plot]]
- Lifecycle: [[mechanics/garden/Garden Lifecycle|Garden Lifecycle]]
- Trade: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item base value. From player level 4, actual NPC payout comes from market demand and the active licence.

## Source status

The item catalog applies successfully from Maincloud. See [[mechanics/garden/Garden Runtime Config|Garden Runtime Config Status]].

