---
title: "Wormwood Seed"
tags:
  - mechanics
  - entity/seed
  - system/garden
status: active
world: mechanics
note_type: seed
system: garden
implementation: shipped
catalog_order: 22
entity_id: wormwoodSeed
item_type_id: 22
drop_weight: 1
summon_mana_cost: 10
base_sell_coin: 1
produces: "[[mechanics/garden/herbs/Wormwood Herb|Wormwood]]"
unlocked_by: "[[mechanics/garden/research/Unlock Wormwood Seed|Unlock Wormwood Seed]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/seedSummoning/
---

# Wormwood Seed

Wormwood Seed is summoned after [[mechanics/garden/research/Unlock Wormwood Seed|Unlock Wormwood Seed]] is complete. Planting it in [[mechanics/garden/Garden Plots|a purchased plot]] consumes the seed and grows [[mechanics/garden/herbs/Wormwood Herb|Wormwood]].

## Base facts

| Property | Value |
| --- | --- |
| Summon mana per base roll | 10 |
| Drop weight | 1 |
| Base sell value | 1 coin |
| Produces | [[mechanics/garden/herbs/Wormwood Herb|Wormwood]] |

Player seed preferences modify the drop weight at roll time. See [[mechanics/garden/Seed Summoning|Seed Summoning]].

