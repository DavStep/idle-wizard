---
title: "Hyssop Herb"
aliases:
  - "Hyssop"
  - "hyssop"
tags:
  - mechanics
  - entity/herb
  - system/garden
status: active
world: mechanics
note_type: herb
system: garden
implementation: shipped
catalog_order: 17
entity_id: hyssopHerb
item_type_id: 1017
base_growth_seconds: 300
base_growth_time: "5m"
base_sell_coin: 92
value_scope: effective-maincloud-items
grows_from: "[[mechanics/garden/seeds/Hyssop Seed|Hyssop Seed]]"
unlocked_by: "[[mechanics/garden/research/Unlock Hyssop Seed|Unlock Hyssop Seed]]"
used_in:
  - "[[mechanics/potions/potions/Hyssop Clarity|Hyssop Clarity]]"
sold_through:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/items/managers/PotionRecipeManager.js
  - spacetimedb/src/index.ts
---

# Hyssop Herb

> [!summary] At a glance
> Hyssop grows from [[mechanics/garden/seeds/Hyssop Seed|Hyssop Seed]] in **5m** and has an effective item base sell value of **92 coin**.

## Potion connections

| Potion | Herb quantity | Unlock path |
| --- | ---: | --- |
| [[mechanics/potions/potions/Hyssop Clarity|Hyssop Clarity]] | 2 | recipe research, level 53 |

## Connections

- Research: [[mechanics/garden/research/Unlock Hyssop Seed|Unlock Hyssop Seed]]
- Grown in: [[mechanics/garden/Garden Plots|any purchased plot]]
- Lifecycle: [[mechanics/garden/Garden Lifecycle|Garden Lifecycle]]
- Trade: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item base value. From player level 4, actual NPC payout comes from market demand and the active licence.

## Source status

The item catalog applies successfully from Maincloud. See [[mechanics/garden/Garden Runtime Config|Garden Runtime Config Status]].

