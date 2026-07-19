---
title: "Glowcap Herb"
aliases:
  - "Glowcap"
  - "glowcap"
tags:
  - mechanics
  - entity/herb
  - system/garden
status: active
world: mechanics
note_type: herb
system: garden
implementation: shipped
catalog_order: 6
entity_id: glowcapHerb
item_type_id: 1006
base_growth_seconds: 60
base_growth_time: "1m"
base_sell_coin: 14.4
value_scope: effective-maincloud-items
grows_from: "[[mechanics/garden/seeds/Glowcap Seed|Glowcap Seed]]"
unlocked_by: "[[mechanics/garden/research/Unlock Glowcap Seed|Unlock Glowcap Seed]]"
used_in:
  - "[[mechanics/potions/potions/Lantern Tonic|Lantern Tonic]]"
  - "[[mechanics/potions/potions/Simple Antidote|Simple Antidote]]"
  - "[[mechanics/potions/potions/Venom Draught|Venom Draught]]"
  - "[[mechanics/potions/potions/Frostmoss Cleanse|Frostmoss Cleanse]]"
  - "[[mechanics/potions/potions/Hyssop Clarity|Hyssop Clarity]]"
  - "[[mechanics/potions/potions/Belladonna Sight|Belladonna Sight]]"
  - "[[mechanics/potions/potions/Silverleaf Quiet|Silverleaf Quiet]]"
  - "[[mechanics/potions/potions/Bloodlight Ward|Bloodlight Ward]]"
sold_through:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/items/managers/PotionRecipeManager.js
  - spacetimedb/src/index.ts
---

# Glowcap Herb

> [!summary] At a glance
> Glowcap grows from [[mechanics/garden/seeds/Glowcap Seed|Glowcap Seed]] in **1m** and has an effective item base sell value of **14.4 coin**.

## Potion connections

| Potion | Herb quantity | Unlock path |
| --- | ---: | --- |
| [[mechanics/potions/potions/Lantern Tonic|Lantern Tonic]] | 2 | recipe research, level 12 |
| [[mechanics/potions/potions/Simple Antidote|Simple Antidote]] | 1 | recipe research, level 14 |
| [[mechanics/potions/potions/Venom Draught|Venom Draught]] | 1 | recipe research, level 16 |
| [[mechanics/potions/potions/Frostmoss Cleanse|Frostmoss Cleanse]] | 2 | recipe research, level 26 |
| [[mechanics/potions/potions/Hyssop Clarity|Hyssop Clarity]] | 1 | recipe research, level 53 |
| [[mechanics/potions/potions/Belladonna Sight|Belladonna Sight]] | 2 | recipe research, level 65 |
| [[mechanics/potions/potions/Silverleaf Quiet|Silverleaf Quiet]] | 1 | global discovery |
| [[mechanics/potions/potions/Bloodlight Ward|Bloodlight Ward]] | 2 | global discovery |

## Connections

- Research: [[mechanics/garden/research/Unlock Glowcap Seed|Unlock Glowcap Seed]]
- Grown in: [[mechanics/garden/Garden Plots|any purchased plot]]
- Lifecycle: [[mechanics/garden/Garden Lifecycle|Garden Lifecycle]]
- Trade: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item base value. From player level 4, actual NPC payout comes from market demand and the active licence.

## Source status

The item catalog applies successfully from Maincloud. See [[mechanics/garden/Garden Runtime Config|Garden Runtime Config Status]].

