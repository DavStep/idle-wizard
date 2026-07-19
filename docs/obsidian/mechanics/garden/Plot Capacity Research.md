---
title: "Plot Capacity Research"
tags:
  - mechanics
  - progression/research
  - system/garden
status: active
world: mechanics
note_type: research-component
system: garden
implementation: shipped
currency: emerald
default_cost_each: 1
default_duration_seconds: 3
persistent_through_prestige: true
verified_on: 2026-07-19
---

# Plot Capacity Research

Capacity studies unlock plots 6–12 in order.

| Plot | Research ID | Required Prestiges |
| ---: | --- | ---: |
| [[mechanics/garden/plots/Garden Plot 6|Plot 6]] | `advanced:plotCapacity:6` | 1 |
| [[mechanics/garden/plots/Garden Plot 7|Plot 7]] | `advanced:plotCapacity:7` | 2 |
| [[mechanics/garden/plots/Garden Plot 8|Plot 8]] | `advanced:plotCapacity:8` | 3 |
| [[mechanics/garden/plots/Garden Plot 9|Plot 9]] | `advanced:plotCapacity:9` | 4 |
| [[mechanics/garden/plots/Garden Plot 10|Plot 10]] | `advanced:plotCapacity:10` | 5 |
| [[mechanics/garden/plots/Garden Plot 11|Plot 11]] | `advanced:plotCapacity:11` | 6 |
| [[mechanics/garden/plots/Garden Plot 12|Plot 12]] | `advanced:plotCapacity:12` | 7 |

Each study costs a default **1 emerald**, takes **3 seconds**, requires the previous capacity study, and persists across Prestige. Completion raises the buy cap; the plot still costs coin.

## Source of truth

- `src/gameplay/research/capacityResearchIds.js`
- `src/gameplay/research/managers/ResearchDefinitionManager.js`
- `src/gameplay/garden/managers/GardenTilePurchaseManager.js`

