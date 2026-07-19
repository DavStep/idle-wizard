---
title: "Dragonpepper Herb"
aliases:
  - "Dragonpepper"
  - "dragonpepper"
tags:
  - mechanics
  - entity/herb
  - system/garden
status: active
world: mechanics
note_type: herb
system: garden
implementation: shipped
catalog_order: 14
entity_id: dragonpepperHerb
item_type_id: 1014
base_growth_seconds: 210
base_growth_time: "3m 30s"
base_sell_coin: 52
value_scope: effective-maincloud-items
grows_from: "[[mechanics/garden/seeds/Dragonpepper Seed|Dragonpepper Seed]]"
unlocked_by: "[[mechanics/garden/research/Unlock Dragonpepper Seed|Unlock Dragonpepper Seed]]"
used_in:
  - "[[mechanics/potions/potions/Dragon Courage|Dragon Courage]]"
  - "[[mechanics/potions/potions/Pearlroot Draught|Pearlroot Draught]]"
  - "[[mechanics/potions/potions/Ember Sight|Ember Sight]]"
  - "[[mechanics/potions/potions/Starless Courage|Starless Courage]]"
sold_through:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/items/managers/PotionRecipeManager.js
  - spacetimedb/src/index.ts
---

# Dragonpepper Herb

> [!summary] At a glance
> Dragonpepper grows from [[mechanics/garden/seeds/Dragonpepper Seed|Dragonpepper Seed]] in **3m 30s** and has an effective item base sell value of **52 coin**.

## Potion connections

| Potion | Herb quantity | Unlock path |
| --- | ---: | --- |
| [[mechanics/potions/potions/Dragon Courage|Dragon Courage]] | 1 | recipe research, level 44 |
| [[mechanics/potions/potions/Pearlroot Draught|Pearlroot Draught]] | 1 | recipe research, level 74 |
| [[mechanics/potions/potions/Ember Sight|Ember Sight]] | 1 | global discovery |
| [[mechanics/potions/potions/Starless Courage|Starless Courage]] | 1 | global discovery |

## Connections

- Research: [[mechanics/garden/research/Unlock Dragonpepper Seed|Unlock Dragonpepper Seed]]
- Grown in: [[mechanics/garden/Garden Plots|any purchased plot]]
- Lifecycle: [[mechanics/garden/Garden Lifecycle|Garden Lifecycle]]
- Trade: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item base value. From player level 4, actual NPC payout comes from market demand and the active licence.

## Source status

The item catalog applies successfully from Maincloud. See [[mechanics/garden/Garden Runtime Config|Garden Runtime Config Status]].

