---
title: "Sage Seed"
tags:
  - mechanics
  - entity/seed
  - system/garden
status: active
world: mechanics
note_type: seed
system: garden
implementation: shipped
catalog_order: 1
entity_id: sageSeed
item_type_id: 1
drop_weight: 1
summon_mana_cost: 10
base_sell_coin: 1
produces: "[[mechanics/garden/herbs/Sage Herb|Sage]]"
unlocked_by: "[[mechanics/garden/research/Unlock Sage Seed|Unlock Sage Seed]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/seedSummoning/
---

# Sage Seed

Sage Seed is summoned after [[mechanics/garden/research/Unlock Sage Seed|Unlock Sage Seed]] is complete. Planting it in [[mechanics/garden/Garden Plots|a purchased plot]] consumes the seed and grows [[mechanics/garden/herbs/Sage Herb|Sage]].

## Base facts

| Property | Value |
| --- | --- |
| Summon mana per base roll | 10 |
| Drop weight | 1 |
| Base sell value | 1 coin |
| Produces | [[mechanics/garden/herbs/Sage Herb|Sage]] |

Player seed preferences modify the drop weight at roll time. See [[mechanics/garden/Seed Summoning|Seed Summoning]].

