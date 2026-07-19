---
title: "Moonflower Herb"
aliases:
  - "Moonflower"
  - "moonflower"
tags:
  - mechanics
  - entity/herb
  - system/garden
status: active
world: mechanics
note_type: herb
system: garden
implementation: shipped
catalog_order: 9
entity_id: moonflowerHerb
item_type_id: 1009
base_growth_seconds: 105
base_growth_time: "1m 45s"
base_sell_coin: 24
value_scope: effective-maincloud-items
grows_from: "[[mechanics/garden/seeds/Moonflower Seed|Moonflower Seed]]"
unlocked_by: "[[mechanics/garden/research/Unlock Moonflower Seed|Unlock Moonflower Seed]]"
used_in:
  - "[[mechanics/potions/potions/Moonlit Focus|Moonlit Focus]]"
  - "[[mechanics/potions/potions/Sleep Draught|Sleep Draught]]"
  - "[[mechanics/potions/potions/Elixir Of Life|Elixir Of Life]]"
  - "[[mechanics/potions/potions/Star-Luck Philtre|Star-Luck Philtre]]"
  - "[[mechanics/potions/potions/Deep Dream Vision|Deep Dream Vision]]"
  - "[[mechanics/potions/potions/Hyssop Clarity|Hyssop Clarity]]"
  - "[[mechanics/potions/potions/Snowdrop Breath|Snowdrop Breath]]"
  - "[[mechanics/potions/potions/Silverleaf Quiet|Silverleaf Quiet]]"
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

# Moonflower Herb

> [!summary] At a glance
> Moonflower grows from [[mechanics/garden/seeds/Moonflower Seed|Moonflower Seed]] in **1m 45s** and has an effective item base sell value of **24 coin**.

## Potion connections

| Potion | Herb quantity | Unlock path |
| --- | ---: | --- |
| [[mechanics/potions/potions/Moonlit Focus|Moonlit Focus]] | 1 | recipe research, level 23 |
| [[mechanics/potions/potions/Sleep Draught|Sleep Draught]] | 1 | recipe research, level 29 |
| [[mechanics/potions/potions/Elixir Of Life|Elixir Of Life]] | 2 | recipe research, level 32 |
| [[mechanics/potions/potions/Star-Luck Philtre|Star-Luck Philtre]] | 2 | recipe research, level 35 |
| [[mechanics/potions/potions/Deep Dream Vision|Deep Dream Vision]] | 2 | recipe research, level 38 |
| [[mechanics/potions/potions/Hyssop Clarity|Hyssop Clarity]] | 1 | recipe research, level 53 |
| [[mechanics/potions/potions/Snowdrop Breath|Snowdrop Breath]] | 2 | recipe research, level 71 |
| [[mechanics/potions/potions/Silverleaf Quiet|Silverleaf Quiet]] | 1 | global discovery |
| [[mechanics/potions/potions/Glass Moon Elixir|Glass Moon Elixir]] | 2 | global discovery |

## Connections

- Research: [[mechanics/garden/research/Unlock Moonflower Seed|Unlock Moonflower Seed]]
- Grown in: [[mechanics/garden/Garden Plots|any purchased plot]]
- Lifecycle: [[mechanics/garden/Garden Lifecycle|Garden Lifecycle]]
- Trade: [[mechanics/market/NPC Market|NPC Market]] and [[mechanics/market/Player Market|Player Market]]

> [!note] Price meaning
> `base_sell_coin` is the item base value. From player level 4, actual NPC payout comes from market demand and the active licence.

## Source status

The item catalog applies successfully from Maincloud. See [[mechanics/garden/Garden Runtime Config|Garden Runtime Config Status]].

