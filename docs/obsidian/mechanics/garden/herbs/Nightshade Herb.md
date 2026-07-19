---
title: "Nightshade Herb"
aliases:
  - "Nightshade"
  - "nightshade"
tags:
  - mechanics
  - entity/herb
  - system/garden
status: active
world: mechanics
note_type: herb
system: garden
implementation: shipped
catalog_order: 20
entity_id: nightshadeHerb
item_type_id: 1020
base_growth_seconds: 390
base_growth_time: "6m 30s"
base_sell_coin: 160
value_scope: effective-maincloud-items
grows_from: "[[mechanics/garden/seeds/Nightshade Seed|Nightshade Seed]]"
unlocked_by: "[[mechanics/garden/research/Unlock Nightshade Seed|Unlock Nightshade Seed]]"
used_in:
  - "[[mechanics/potions/potions/Nightshade Veil|Nightshade Veil]]"
sold_through:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/items/managers/PotionRecipeManager.js
  - spacetimedb/src/index.ts
---

# Nightshade Herb

> [!summary] At a glance
> Nightshade grows from [[mechanics/garden/seeds/Nightshade Seed|Nightshade Seed]] in **6m 30s** and has an effective item base sell value of **160 coin**.

## Potion connections

| Potion | Herb quantity | Unlock path |
| --- | ---: | --- |
| [[mechanics/potions/potions/Nightshade Veil|Nightshade Veil]] | 1 | recipe research, level 62 |

## Connections

- Research: [[mechanics/garden/research/Unlock Nightshade Seed|Unlock Nightshade Seed]]
- Grown in: [[mechanics/garden/Garden Plots|any purchased plot]]
- Lifecycle: [[mechanics/garden/Garden Lifecycle|Garden Lifecycle]]
- Trade: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item base value. From player level 4, actual NPC payout comes from market demand and the active licence.

## Source status

The item catalog applies successfully from Maincloud. See [[mechanics/garden/Garden Runtime Config|Garden Runtime Config Status]].

