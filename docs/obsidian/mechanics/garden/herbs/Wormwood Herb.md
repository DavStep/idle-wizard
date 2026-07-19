---
title: "Wormwood Herb"
aliases:
  - "Wormwood"
  - "wormwood"
tags:
  - mechanics
  - entity/herb
  - system/garden
status: active
world: mechanics
note_type: herb
system: garden
implementation: shipped
catalog_order: 22
entity_id: wormwoodHerb
item_type_id: 1022
base_growth_seconds: 450
base_growth_time: "7m 30s"
base_sell_coin: 228
value_scope: effective-maincloud-items
grows_from: "[[mechanics/garden/seeds/Wormwood Seed|Wormwood Seed]]"
unlocked_by: "[[mechanics/garden/research/Unlock Wormwood Seed|Unlock Wormwood Seed]]"
used_in:
  - "[[mechanics/potions/potions/Wormwood Purge|Wormwood Purge]]"
sold_through:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/items/managers/PotionRecipeManager.js
  - spacetimedb/src/index.ts
---

# Wormwood Herb

> [!summary] At a glance
> Wormwood grows from [[mechanics/garden/seeds/Wormwood Seed|Wormwood Seed]] in **7m 30s** and has an effective item base sell value of **228 coin**.

## Potion connections

| Potion | Herb quantity | Unlock path |
| --- | ---: | --- |
| [[mechanics/potions/potions/Wormwood Purge|Wormwood Purge]] | 1 | recipe research, level 68 |

## Connections

- Research: [[mechanics/garden/research/Unlock Wormwood Seed|Unlock Wormwood Seed]]
- Grown in: [[mechanics/garden/Garden Plots|any purchased plot]]
- Lifecycle: [[mechanics/garden/Garden Lifecycle|Garden Lifecycle]]
- Trade: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item base value. From player level 4, actual NPC payout comes from market demand and the active licence.

## Source status

The item catalog applies successfully from Maincloud. See [[mechanics/garden/Garden Runtime Config|Garden Runtime Config Status]].

