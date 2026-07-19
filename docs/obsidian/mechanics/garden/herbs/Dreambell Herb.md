---
title: "Dreambell Herb"
aliases:
  - "Dreambell"
  - "dreambell"
tags:
  - mechanics
  - entity/herb
  - system/garden
status: active
world: mechanics
note_type: herb
system: garden
implementation: shipped
catalog_order: 11
entity_id: dreambellHerb
item_type_id: 1011
base_growth_seconds: 135
base_growth_time: "2m 15s"
base_sell_coin: 32
value_scope: effective-maincloud-items
grows_from: "[[mechanics/garden/seeds/Dreambell Seed|Dreambell Seed]]"
unlocked_by: "[[mechanics/garden/research/Unlock Dreambell Seed|Unlock Dreambell Seed]]"
used_in:
  - "[[mechanics/potions/potions/Sleep Draught|Sleep Draught]]"
  - "[[mechanics/potions/potions/Deep Dream Vision|Deep Dream Vision]]"
  - "[[mechanics/potions/potions/Valerian Rest|Valerian Rest]]"
  - "[[mechanics/potions/potions/Thorn Sleep|Thorn Sleep]]"
  - "[[mechanics/potions/potions/Night Orchard Tonic|Night Orchard Tonic]]"
sold_through:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/items/managers/PotionRecipeManager.js
  - spacetimedb/src/index.ts
---

# Dreambell Herb

> [!summary] At a glance
> Dreambell grows from [[mechanics/garden/seeds/Dreambell Seed|Dreambell Seed]] in **2m 15s** and has an effective item base sell value of **32 coin**.

## Potion connections

| Potion | Herb quantity | Unlock path |
| --- | ---: | --- |
| [[mechanics/potions/potions/Sleep Draught|Sleep Draught]] | 1 | recipe research, level 29 |
| [[mechanics/potions/potions/Deep Dream Vision|Deep Dream Vision]] | 2 | recipe research, level 38 |
| [[mechanics/potions/potions/Valerian Rest|Valerian Rest]] | 1 | recipe research, level 56 |
| [[mechanics/potions/potions/Thorn Sleep|Thorn Sleep]] | 1 | global discovery |
| [[mechanics/potions/potions/Night Orchard Tonic|Night Orchard Tonic]] | 1 | global discovery |

## Connections

- Research: [[mechanics/garden/research/Unlock Dreambell Seed|Unlock Dreambell Seed]]
- Grown in: [[mechanics/garden/Garden Plots|any purchased plot]]
- Lifecycle: [[mechanics/garden/Garden Lifecycle|Garden Lifecycle]]
- Trade: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item base value. From player level 4, actual NPC payout comes from market demand and the active licence.

## Source status

The item catalog applies successfully from Maincloud. See [[mechanics/garden/Garden Runtime Config|Garden Runtime Config Status]].

