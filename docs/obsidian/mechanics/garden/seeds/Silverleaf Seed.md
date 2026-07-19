---
title: "Silverleaf Seed"
tags:
  - mechanics
  - entity/seed
  - system/garden
status: active
world: mechanics
note_type: seed
system: garden
implementation: shipped
catalog_order: 15
entity_id: silverleafSeed
item_type_id: 15
drop_weight: 1
summon_mana_cost: 10
base_sell_coin: 1
produces: "[[mechanics/garden/herbs/Silverleaf Herb|Silverleaf]]"
unlocked_by: "[[mechanics/garden/research/Unlock Silverleaf Seed|Unlock Silverleaf Seed]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/items/managers/ItemDefinitionManager.js
  - src/gameplay/seedSummoning/
---

# Silverleaf Seed

Silverleaf Seed is summoned after [[mechanics/garden/research/Unlock Silverleaf Seed|Unlock Silverleaf Seed]] is complete. Planting it in [[mechanics/garden/Garden Plots|a purchased plot]] consumes the seed and grows [[mechanics/garden/herbs/Silverleaf Herb|Silverleaf]].

## Base facts

| Property | Value |
| --- | --- |
| Summon mana per base roll | 10 |
| Drop weight | 1 |
| Base sell value | 1 coin |
| Produces | [[mechanics/garden/herbs/Silverleaf Herb|Silverleaf]] |

Player seed preferences modify the drop weight at roll time. See [[mechanics/garden/Seed Summoning|Seed Summoning]].

