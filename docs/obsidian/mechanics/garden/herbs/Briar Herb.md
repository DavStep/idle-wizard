---
title: "Briar Herb"
aliases:
  - "Briar"
  - "briar"
tags:
  - mechanics
  - entity/herb
  - system/garden
status: active
world: mechanics
note_type: herb
system: garden
implementation: shipped
catalog_order: 5
entity_id: briarHerb
item_type_id: 1005
base_growth_seconds: 50
base_growth_time: "50 seconds"
base_sell_coin: 12
value_scope: effective-maincloud-items
grows_from: "[[mechanics/garden/seeds/Briar Seed|Briar Seed]]"
unlocked_by: "[[mechanics/garden/research/Unlock Briar Seed|Unlock Briar Seed]]"
used_in:
  - "[[mechanics/potions/potions/Briar Ward|Briar Ward]]"
  - "[[mechanics/potions/potions/Pact Ward|Pact Ward]]"
  - "[[mechanics/potions/potions/Thorn Sleep|Thorn Sleep]]"
  - "[[mechanics/potions/potions/Rootbound Resolve|Rootbound Resolve]]"
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

# Briar Herb

> [!summary] At a glance
> Briar grows from [[mechanics/garden/seeds/Briar Seed|Briar Seed]] in **50 seconds** and has an effective item base sell value of **12 coin**.

## Potion connections

| Potion | Herb quantity | Unlock path |
| --- | ---: | --- |
| [[mechanics/potions/potions/Briar Ward|Briar Ward]] | 2 | recipe research, level 10 |
| [[mechanics/potions/potions/Pact Ward|Pact Ward]] | 2 | recipe research, level 41 |
| [[mechanics/potions/potions/Thorn Sleep|Thorn Sleep]] | 1 | global discovery |
| [[mechanics/potions/potions/Rootbound Resolve|Rootbound Resolve]] | 2 | global discovery |
| [[mechanics/potions/potions/Bloodlight Ward|Bloodlight Ward]] | 1 | global discovery |

## Connections

- Research: [[mechanics/garden/research/Unlock Briar Seed|Unlock Briar Seed]]
- Grown in: [[mechanics/garden/Garden Plots|any purchased plot]]
- Lifecycle: [[mechanics/garden/Garden Lifecycle|Garden Lifecycle]]
- Trade: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item base value. From player level 4, actual NPC payout comes from market demand and the active licence.

## Source status

The item catalog applies successfully from Maincloud. See [[mechanics/garden/Garden Runtime Config|Garden Runtime Config Status]].

