---
title: "Nettle Herb"
aliases:
  - "Nettle"
  - "nettle"
tags:
  - mechanics
  - entity/herb
  - system/garden
status: active
world: mechanics
note_type: herb
system: garden
implementation: shipped
catalog_order: 3
entity_id: nettleHerb
item_type_id: 1003
base_growth_seconds: 30
base_growth_time: "30 seconds"
base_sell_coin: 8
value_scope: effective-maincloud-items
grows_from: "[[mechanics/garden/seeds/Nettle Seed|Nettle Seed]]"
unlocked_by: "[[mechanics/garden/research/Unlock Nettle Seed|Unlock Nettle Seed]]"
used_in:
  - "[[mechanics/potions/potions/Nettle Vigor|Nettle Vigor]]"
  - "[[mechanics/potions/potions/Simple Antidote|Simple Antidote]]"
  - "[[mechanics/potions/potions/Venom Draught|Venom Draught]]"
  - "[[mechanics/potions/potions/Sunroot Stamina|Sunroot Stamina]]"
  - "[[mechanics/potions/potions/Dragon Courage|Dragon Courage]]"
  - "[[mechanics/potions/potions/Wormwood Purge|Wormwood Purge]]"
  - "[[mechanics/potions/potions/Starless Courage|Starless Courage]]"
  - "[[mechanics/potions/potions/Frostvein Draught|Frostvein Draught]]"
sold_through:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/items/managers/PotionRecipeManager.js
  - spacetimedb/src/index.ts
---

# Nettle Herb

> [!summary] At a glance
> Nettle grows from [[mechanics/garden/seeds/Nettle Seed|Nettle Seed]] in **30 seconds** and has an effective item base sell value of **8 coin**.

## Potion connections

| Potion | Herb quantity | Unlock path |
| --- | ---: | --- |
| [[mechanics/potions/potions/Nettle Vigor|Nettle Vigor]] | 2 | recipe research, level 8 |
| [[mechanics/potions/potions/Simple Antidote|Simple Antidote]] | 2 | recipe research, level 14 |
| [[mechanics/potions/potions/Venom Draught|Venom Draught]] | 2 | recipe research, level 16 |
| [[mechanics/potions/potions/Sunroot Stamina|Sunroot Stamina]] | 2 | recipe research, level 20 |
| [[mechanics/potions/potions/Dragon Courage|Dragon Courage]] | 2 | recipe research, level 44 |
| [[mechanics/potions/potions/Wormwood Purge|Wormwood Purge]] | 2 | recipe research, level 68 |
| [[mechanics/potions/potions/Starless Courage|Starless Courage]] | 1 | global discovery |
| [[mechanics/potions/potions/Frostvein Draught|Frostvein Draught]] | 1 | global discovery |

## Connections

- Research: [[mechanics/garden/research/Unlock Nettle Seed|Unlock Nettle Seed]]
- Grown in: [[mechanics/garden/Garden Plots|any purchased plot]]
- Lifecycle: [[mechanics/garden/Garden Lifecycle|Garden Lifecycle]]
- Trade: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item base value. From player level 4, actual NPC payout comes from market demand and the active licence.

## Source status

The item catalog applies successfully from Maincloud. See [[mechanics/garden/Garden Runtime Config|Garden Runtime Config Status]].

