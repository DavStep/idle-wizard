---
title: "Frostmoss Herb"
aliases:
  - "Frostmoss"
  - "frostmoss"
tags:
  - mechanics
  - entity/herb
  - system/garden
status: active
world: mechanics
note_type: herb
system: garden
implementation: shipped
catalog_order: 10
entity_id: frostmossHerb
item_type_id: 1010
base_growth_seconds: 120
base_growth_time: "2m"
base_sell_coin: 28
value_scope: effective-maincloud-items
grows_from: "[[mechanics/garden/seeds/Frostmoss Seed|Frostmoss Seed]]"
unlocked_by: "[[mechanics/garden/research/Unlock Frostmoss Seed|Unlock Frostmoss Seed]]"
used_in:
  - "[[mechanics/potions/potions/Frostmoss Cleanse|Frostmoss Cleanse]]"
  - "[[mechanics/potions/potions/Pact Ward|Pact Ward]]"
  - "[[mechanics/potions/potions/Nightshade Veil|Nightshade Veil]]"
  - "[[mechanics/potions/potions/Wormwood Purge|Wormwood Purge]]"
  - "[[mechanics/potions/potions/Ashen Memory|Ashen Memory]]"
  - "[[mechanics/potions/potions/Glass Moon Elixir|Glass Moon Elixir]]"
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

# Frostmoss Herb

> [!summary] At a glance
> Frostmoss grows from [[mechanics/garden/seeds/Frostmoss Seed|Frostmoss Seed]] in **2m** and has an effective item base sell value of **28 coin**.

## Potion connections

| Potion | Herb quantity | Unlock path |
| --- | ---: | --- |
| [[mechanics/potions/potions/Frostmoss Cleanse|Frostmoss Cleanse]] | 1 | recipe research, level 26 |
| [[mechanics/potions/potions/Pact Ward|Pact Ward]] | 1 | recipe research, level 41 |
| [[mechanics/potions/potions/Nightshade Veil|Nightshade Veil]] | 1 | recipe research, level 62 |
| [[mechanics/potions/potions/Wormwood Purge|Wormwood Purge]] | 1 | recipe research, level 68 |
| [[mechanics/potions/potions/Ashen Memory|Ashen Memory]] | 1 | global discovery |
| [[mechanics/potions/potions/Glass Moon Elixir|Glass Moon Elixir]] | 1 | global discovery |
| [[mechanics/potions/potions/Frostvein Draught|Frostvein Draught]] | 2 | global discovery |

## Connections

- Research: [[mechanics/garden/research/Unlock Frostmoss Seed|Unlock Frostmoss Seed]]
- Grown in: [[mechanics/garden/Garden Plots|any purchased plot]]
- Lifecycle: [[mechanics/garden/Garden Lifecycle|Garden Lifecycle]]
- Trade: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item base value. From player level 4, actual NPC payout comes from market demand and the active licence.

## Source status

The item catalog applies successfully from Maincloud. See [[mechanics/garden/Garden Runtime Config|Garden Runtime Config Status]].

