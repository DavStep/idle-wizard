---
title: "Mandrake Herb"
aliases:
  - "Mandrake"
  - "mandrake"
tags:
  - mechanics
  - entity/herb
  - system/garden
status: active
world: mechanics
note_type: herb
system: garden
implementation: shipped
catalog_order: 7
entity_id: mandrakeHerb
item_type_id: 1007
base_growth_seconds: 75
base_growth_time: "1m 15s"
base_sell_coin: 17.6
value_scope: effective-maincloud-items
grows_from: "[[mechanics/garden/seeds/Mandrake Seed|Mandrake Seed]]"
unlocked_by: "[[mechanics/garden/research/Unlock Mandrake Seed|Unlock Mandrake Seed]]"
used_in:
  - "[[mechanics/potions/potions/Venom Draught|Venom Draught]]"
  - "[[mechanics/potions/potions/Healing Potion|Healing Potion]]"
  - "[[mechanics/potions/potions/Elixir Of Life|Elixir Of Life]]"
  - "[[mechanics/potions/potions/Comfrey Balm|Comfrey Balm]]"
  - "[[mechanics/potions/potions/Rootbound Resolve|Rootbound Resolve]]"
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

# Mandrake Herb

> [!summary] At a glance
> Mandrake grows from [[mechanics/garden/seeds/Mandrake Seed|Mandrake Seed]] in **1m 15s** and has an effective item base sell value of **17.6 coin**.

## Potion connections

| Potion | Herb quantity | Unlock path |
| --- | ---: | --- |
| [[mechanics/potions/potions/Venom Draught|Venom Draught]] | 1 | recipe research, level 16 |
| [[mechanics/potions/potions/Healing Potion|Healing Potion]] | 1 | recipe research, level 18 |
| [[mechanics/potions/potions/Elixir Of Life|Elixir Of Life]] | 3 | recipe research, level 32 |
| [[mechanics/potions/potions/Comfrey Balm|Comfrey Balm]] | 1 | recipe research, level 59 |
| [[mechanics/potions/potions/Rootbound Resolve|Rootbound Resolve]] | 1 | global discovery |
| [[mechanics/potions/potions/Frostvein Draught|Frostvein Draught]] | 1 | global discovery |

## Connections

- Research: [[mechanics/garden/research/Unlock Mandrake Seed|Unlock Mandrake Seed]]
- Grown in: [[mechanics/garden/Garden Plots|any purchased plot]]
- Lifecycle: [[mechanics/garden/Garden Lifecycle|Garden Lifecycle]]
- Trade: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item base value. From player level 4, actual NPC payout comes from market demand and the active licence.

## Source status

The item catalog applies successfully from Maincloud. See [[mechanics/garden/Garden Runtime Config|Garden Runtime Config Status]].

