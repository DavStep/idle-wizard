---
title: "Mint Herb"
aliases:
  - "Mint"
  - "mint"
tags:
  - mechanics
  - entity/herb
  - system/garden
status: active
world: mechanics
note_type: herb
system: garden
implementation: shipped
catalog_order: 2
entity_id: mintHerb
item_type_id: 1002
base_growth_seconds: 25
base_growth_time: "25 seconds"
base_sell_coin: 7.2
value_scope: effective-maincloud-items
grows_from: "[[mechanics/garden/seeds/Mint Seed|Mint Seed]]"
unlocked_by: "[[mechanics/garden/research/Unlock Mint Seed|Unlock Mint Seed]]"
used_in:
  - "[[mechanics/potions/potions/Minor Healing Potion|Minor Healing Potion]]"
  - "[[mechanics/potions/potions/Calming Draught|Calming Draught]]"
  - "[[mechanics/potions/potions/Lantern Tonic|Lantern Tonic]]"
  - "[[mechanics/potions/potions/Star-Luck Philtre|Star-Luck Philtre]]"
  - "[[mechanics/potions/potions/Yarrow Poultice|Yarrow Poultice]]"
  - "[[mechanics/potions/potions/Silverleaf Quiet|Silverleaf Quiet]]"
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

# Mint Herb

> [!summary] At a glance
> Mint grows from [[mechanics/garden/seeds/Mint Seed|Mint Seed]] in **25 seconds** and has an effective item base sell value of **7.2 coin**.

## Potion connections

| Potion | Herb quantity | Unlock path |
| --- | ---: | --- |
| [[mechanics/potions/potions/Minor Healing Potion|Minor Healing Potion]] | 1 | recipe research, level 6 |
| [[mechanics/potions/potions/Calming Draught|Calming Draught]] | 2 | recipe research, level 9 |
| [[mechanics/potions/potions/Lantern Tonic|Lantern Tonic]] | 1 | recipe research, level 12 |
| [[mechanics/potions/potions/Star-Luck Philtre|Star-Luck Philtre]] | 2 | recipe research, level 35 |
| [[mechanics/potions/potions/Yarrow Poultice|Yarrow Poultice]] | 1 | recipe research, level 50 |
| [[mechanics/potions/potions/Silverleaf Quiet|Silverleaf Quiet]] | 1 | global discovery |
| [[mechanics/potions/potions/Night Orchard Tonic|Night Orchard Tonic]] | 2 | global discovery |

## Connections

- Research: [[mechanics/garden/research/Unlock Mint Seed|Unlock Mint Seed]]
- Grown in: [[mechanics/garden/Garden Plots|any purchased plot]]
- Lifecycle: [[mechanics/garden/Garden Lifecycle|Garden Lifecycle]]
- Trade: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item base value. From player level 4, actual NPC payout comes from market demand and the active licence.

## Source status

The item catalog applies successfully from Maincloud. See [[mechanics/garden/Garden Runtime Config|Garden Runtime Config Status]].

