---
title: "Lavender Herb"
aliases:
  - "Lavender"
  - "lavender"
tags:
  - mechanics
  - entity/herb
  - system/garden
status: active
world: mechanics
note_type: herb
system: garden
implementation: shipped
catalog_order: 4
entity_id: lavenderHerb
item_type_id: 1004
base_growth_seconds: 40
base_growth_time: "40 seconds"
base_sell_coin: 10.4
value_scope: effective-maincloud-items
grows_from: "[[mechanics/garden/seeds/Lavender Seed|Lavender Seed]]"
unlocked_by: "[[mechanics/garden/research/Unlock Lavender Seed|Unlock Lavender Seed]]"
used_in:
  - "[[mechanics/potions/potions/Calming Draught|Calming Draught]]"
  - "[[mechanics/potions/potions/Moonlit Focus|Moonlit Focus]]"
  - "[[mechanics/potions/potions/Sleep Draught|Sleep Draught]]"
  - "[[mechanics/potions/potions/Yarrow Poultice|Yarrow Poultice]]"
  - "[[mechanics/potions/potions/Valerian Rest|Valerian Rest]]"
  - "[[mechanics/potions/potions/Ashen Memory|Ashen Memory]]"
  - "[[mechanics/potions/potions/Thorn Sleep|Thorn Sleep]]"
sold_through:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/items/managers/PotionRecipeManager.js
  - spacetimedb/src/index.ts
---

# Lavender Herb

> [!summary] At a glance
> Lavender grows from [[mechanics/garden/seeds/Lavender Seed|Lavender Seed]] in **40 seconds** and has an effective item base sell value of **10.4 coin**.

## Potion connections

| Potion | Herb quantity | Unlock path |
| --- | ---: | --- |
| [[mechanics/potions/potions/Calming Draught|Calming Draught]] | 1 | recipe research, level 9 |
| [[mechanics/potions/potions/Moonlit Focus|Moonlit Focus]] | 2 | recipe research, level 23 |
| [[mechanics/potions/potions/Sleep Draught|Sleep Draught]] | 2 | recipe research, level 29 |
| [[mechanics/potions/potions/Yarrow Poultice|Yarrow Poultice]] | 1 | recipe research, level 50 |
| [[mechanics/potions/potions/Valerian Rest|Valerian Rest]] | 1 | recipe research, level 56 |
| [[mechanics/potions/potions/Ashen Memory|Ashen Memory]] | 1 | global discovery |
| [[mechanics/potions/potions/Thorn Sleep|Thorn Sleep]] | 1 | global discovery |

## Connections

- Research: [[mechanics/garden/research/Unlock Lavender Seed|Unlock Lavender Seed]]
- Grown in: [[mechanics/garden/Garden Plots|any purchased plot]]
- Lifecycle: [[mechanics/garden/Garden Lifecycle|Garden Lifecycle]]
- Trade: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item base value. From player level 4, actual NPC payout comes from market demand and the active licence.

## Source status

The item catalog applies successfully from Maincloud. See [[mechanics/garden/Garden Runtime Config|Garden Runtime Config Status]].

