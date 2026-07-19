---
title: "Star Anise Herb"
aliases:
  - "Star Anise"
  - "star anise"
tags:
  - mechanics
  - entity/herb
  - system/garden
status: active
world: mechanics
note_type: herb
system: garden
implementation: shipped
catalog_order: 12
entity_id: starAniseHerb
item_type_id: 1012
base_growth_seconds: 150
base_growth_time: "2m 30s"
base_sell_coin: 36
value_scope: effective-maincloud-items
grows_from: "[[mechanics/garden/seeds/Star Anise Seed|Star Anise Seed]]"
unlocked_by: "[[mechanics/garden/research/Unlock Star Anise Seed|Unlock Star Anise Seed]]"
used_in:
  - "[[mechanics/potions/potions/Star-Luck Philtre|Star-Luck Philtre]]"
  - "[[mechanics/potions/potions/Deep Dream Vision|Deep Dream Vision]]"
  - "[[mechanics/potions/potions/Belladonna Sight|Belladonna Sight]]"
  - "[[mechanics/potions/potions/Ember Sight|Ember Sight]]"
  - "[[mechanics/potions/potions/Glass Moon Elixir|Glass Moon Elixir]]"
sold_through:
  - "[[mechanics/market/NPC Market|NPC Market]]"
  - "[[mechanics/market/Player Market|Player Market]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/items/managers/PotionRecipeManager.js
  - spacetimedb/src/index.ts
---

# Star Anise Herb

> [!summary] At a glance
> Star Anise grows from [[mechanics/garden/seeds/Star Anise Seed|Star Anise Seed]] in **2m 30s** and has an effective item base sell value of **36 coin**.

## Potion connections

| Potion | Herb quantity | Unlock path |
| --- | ---: | --- |
| [[mechanics/potions/potions/Star-Luck Philtre|Star-Luck Philtre]] | 1 | recipe research, level 35 |
| [[mechanics/potions/potions/Deep Dream Vision|Deep Dream Vision]] | 1 | recipe research, level 38 |
| [[mechanics/potions/potions/Belladonna Sight|Belladonna Sight]] | 1 | recipe research, level 65 |
| [[mechanics/potions/potions/Ember Sight|Ember Sight]] | 1 | global discovery |
| [[mechanics/potions/potions/Glass Moon Elixir|Glass Moon Elixir]] | 1 | global discovery |

## Connections

- Research: [[mechanics/garden/research/Unlock Star Anise Seed|Unlock Star Anise Seed]]
- Grown in: [[mechanics/garden/Garden Plots|any purchased plot]]
- Lifecycle: [[mechanics/garden/Garden Lifecycle|Garden Lifecycle]]
- Trade: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item base value. From player level 4, actual NPC payout comes from market demand and the active licence.

## Source status

The item catalog applies successfully from Maincloud. See [[mechanics/garden/Garden Runtime Config|Garden Runtime Config Status]].

