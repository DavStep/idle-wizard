---
title: "Bloodrose Herb"
aliases:
  - "Bloodrose"
  - "bloodrose"
tags:
  - mechanics
  - entity/herb
  - system/garden
status: active
world: mechanics
note_type: herb
system: garden
implementation: shipped
catalog_order: 13
entity_id: bloodroseHerb
item_type_id: 1013
base_growth_seconds: 180
base_growth_time: "3m"
base_sell_coin: 44
value_scope: effective-maincloud-items
grows_from: "[[mechanics/garden/seeds/Bloodrose Seed|Bloodrose Seed]]"
unlocked_by: "[[mechanics/garden/research/Unlock Bloodrose Seed|Unlock Bloodrose Seed]]"
used_in:
  - "[[mechanics/potions/potions/Pact Ward|Pact Ward]]"
  - "[[mechanics/potions/potions/Nightshade Veil|Nightshade Veil]]"
  - "[[mechanics/potions/potions/Night Orchard Tonic|Night Orchard Tonic]]"
  - "[[mechanics/potions/potions/Starless Courage|Starless Courage]]"
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

# Bloodrose Herb

> [!summary] At a glance
> Bloodrose grows from [[mechanics/garden/seeds/Bloodrose Seed|Bloodrose Seed]] in **3m** and has an effective item base sell value of **44 coin**.

## Potion connections

| Potion | Herb quantity | Unlock path |
| --- | ---: | --- |
| [[mechanics/potions/potions/Pact Ward|Pact Ward]] | 1 | recipe research, level 41 |
| [[mechanics/potions/potions/Nightshade Veil|Nightshade Veil]] | 1 | recipe research, level 62 |
| [[mechanics/potions/potions/Night Orchard Tonic|Night Orchard Tonic]] | 1 | global discovery |
| [[mechanics/potions/potions/Starless Courage|Starless Courage]] | 1 | global discovery |
| [[mechanics/potions/potions/Bloodlight Ward|Bloodlight Ward]] | 1 | global discovery |

## Connections

- Research: [[mechanics/garden/research/Unlock Bloodrose Seed|Unlock Bloodrose Seed]]
- Grown in: [[mechanics/garden/Garden Plots|any purchased plot]]
- Lifecycle: [[mechanics/garden/Garden Lifecycle|Garden Lifecycle]]
- Trade: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item base value. From player level 4, actual NPC payout comes from market demand and the active licence.

## Source status

The item catalog applies successfully from Maincloud. See [[mechanics/garden/Garden Runtime Config|Garden Runtime Config Status]].

