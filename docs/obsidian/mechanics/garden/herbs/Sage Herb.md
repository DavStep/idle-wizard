---
title: "Sage Herb"
aliases:
  - "Sage"
  - "sage"
tags:
  - mechanics
  - entity/herb
  - system/garden
status: active
world: mechanics
note_type: herb
system: garden
implementation: shipped
catalog_order: 1
entity_id: sageHerb
item_type_id: 1001
base_growth_seconds: 12
base_growth_time: "12 seconds"
base_sell_coin: 6.4
value_scope: effective-maincloud-items
grows_from: "[[mechanics/garden/seeds/Sage Seed|Sage Seed]]"
unlocked_by: "[[mechanics/garden/research/Unlock Sage Seed|Unlock Sage Seed]]"
used_in:
  - "[[mechanics/potions/potions/Mana Tonic|Mana Tonic]]"
  - "[[mechanics/potions/potions/Minor Healing Potion|Minor Healing Potion]]"
  - "[[mechanics/potions/potions/Nettle Vigor|Nettle Vigor]]"
  - "[[mechanics/potions/potions/Briar Ward|Briar Ward]]"
  - "[[mechanics/potions/potions/Simple Antidote|Simple Antidote]]"
  - "[[mechanics/potions/potions/Healing Potion|Healing Potion]]"
  - "[[mechanics/potions/potions/Silverleaf Salve|Silverleaf Salve]]"
  - "[[mechanics/potions/potions/Ashen Memory|Ashen Memory]]"
  - "[[mechanics/potions/potions/Ember Sight|Ember Sight]]"
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

# Sage Herb

> [!summary] At a glance
> Sage grows from [[mechanics/garden/seeds/Sage Seed|Sage Seed]] in **12 seconds** and has an effective item base sell value of **6.4 coin**.

## Potion connections

| Potion | Herb quantity | Unlock path |
| --- | ---: | --- |
| [[mechanics/potions/potions/Mana Tonic|Mana Tonic]] | 3 | recipe research, level 4 |
| [[mechanics/potions/potions/Minor Healing Potion|Minor Healing Potion]] | 2 | recipe research, level 6 |
| [[mechanics/potions/potions/Nettle Vigor|Nettle Vigor]] | 1 | recipe research, level 8 |
| [[mechanics/potions/potions/Briar Ward|Briar Ward]] | 2 | recipe research, level 10 |
| [[mechanics/potions/potions/Simple Antidote|Simple Antidote]] | 1 | recipe research, level 14 |
| [[mechanics/potions/potions/Healing Potion|Healing Potion]] | 2 | recipe research, level 18 |
| [[mechanics/potions/potions/Silverleaf Salve|Silverleaf Salve]] | 1 | recipe research, level 47 |
| [[mechanics/potions/potions/Ashen Memory|Ashen Memory]] | 1 | global discovery |
| [[mechanics/potions/potions/Ember Sight|Ember Sight]] | 1 | global discovery |
| [[mechanics/potions/potions/Bloodlight Ward|Bloodlight Ward]] | 1 | global discovery |

## Connections

- Research: [[mechanics/garden/research/Unlock Sage Seed|Unlock Sage Seed]]
- Grown in: [[mechanics/garden/Garden Plots|any purchased plot]]
- Lifecycle: [[mechanics/garden/Garden Lifecycle|Garden Lifecycle]]
- Trade: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item base value. From player level 4, actual NPC payout comes from market demand and the active licence.

## Source status

The item catalog applies successfully from Maincloud. See [[mechanics/garden/Garden Runtime Config|Garden Runtime Config Status]].

