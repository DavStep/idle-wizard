---
title: "Sunroot Herb"
aliases:
  - "Sunroot"
  - "sunroot"
tags:
  - mechanics
  - entity/herb
  - system/garden
status: active
world: mechanics
note_type: herb
system: garden
implementation: shipped
catalog_order: 8
entity_id: sunrootHerb
item_type_id: 1008
base_growth_seconds: 90
base_growth_time: "1m 30s"
base_sell_coin: 20
value_scope: effective-maincloud-items
grows_from: "[[mechanics/garden/seeds/Sunroot Seed|Sunroot Seed]]"
unlocked_by: "[[mechanics/garden/research/Unlock Sunroot Seed|Unlock Sunroot Seed]]"
used_in:
  - "[[mechanics/potions/potions/Sunroot Stamina|Sunroot Stamina]]"
  - "[[mechanics/potions/potions/Dragon Courage|Dragon Courage]]"
  - "[[mechanics/potions/potions/Comfrey Balm|Comfrey Balm]]"
  - "[[mechanics/potions/potions/Pearlroot Draught|Pearlroot Draught]]"
  - "[[mechanics/potions/potions/Rootbound Resolve|Rootbound Resolve]]"
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

# Sunroot Herb

> [!summary] At a glance
> Sunroot grows from [[mechanics/garden/seeds/Sunroot Seed|Sunroot Seed]] in **1m 30s** and has an effective item base sell value of **20 coin**.

## Potion connections

| Potion | Herb quantity | Unlock path |
| --- | ---: | --- |
| [[mechanics/potions/potions/Sunroot Stamina|Sunroot Stamina]] | 2 | recipe research, level 20 |
| [[mechanics/potions/potions/Dragon Courage|Dragon Courage]] | 2 | recipe research, level 44 |
| [[mechanics/potions/potions/Comfrey Balm|Comfrey Balm]] | 1 | recipe research, level 59 |
| [[mechanics/potions/potions/Pearlroot Draught|Pearlroot Draught]] | 1 | recipe research, level 74 |
| [[mechanics/potions/potions/Rootbound Resolve|Rootbound Resolve]] | 1 | global discovery |
| [[mechanics/potions/potions/Starless Courage|Starless Courage]] | 1 | global discovery |

## Connections

- Research: [[mechanics/garden/research/Unlock Sunroot Seed|Unlock Sunroot Seed]]
- Grown in: [[mechanics/garden/Garden Plots|any purchased plot]]
- Lifecycle: [[mechanics/garden/Garden Lifecycle|Garden Lifecycle]]
- Trade: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item base value. From player level 4, actual NPC payout comes from market demand and the active licence.

## Source status

The item catalog applies successfully from Maincloud. See [[mechanics/garden/Garden Runtime Config|Garden Runtime Config Status]].

