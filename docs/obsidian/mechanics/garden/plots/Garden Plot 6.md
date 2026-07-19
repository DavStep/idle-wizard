---
title: "Garden Plot 6"
aliases:
  - "Plot 6"
tags:
  - mechanics
  - entity/plot
  - system/garden
status: active
world: mechanics
note_type: plot
system: garden
implementation: shipped
plot_number: 6
unlock_path: "permanent capacity research"
required_prestiges: 1
purchase_cost_coin: 800
capacity_research_id: "advanced:plotCapacity:6"
effective_harvest_seconds: 3
auto_plant_research_id: "automation:autoPlantTile:6"
auto_harvest_research_id: "automation:autoHarvestPlant:6"
growth_research_series: "advanced:plotGrowth:6:L"
yield_level_series: "emerald:plotPlanting:6:M"
research:
  - "[[mechanics/garden/Plot Automation Research|Plot Automation Research]]"
  - "[[mechanics/garden/Plot Growth Research|Plot Growth Research]]"
  - "[[mechanics/garden/Plot Levels|Plot Levels]]"
  - "[[mechanics/garden/Plot Capacity Research|Plot Capacity Research]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/garden/managers/GardenBalanceManager.js
  - src/gameplay/garden/managers/GardenTilePurchaseManager.js
  - src/gameplay/research/managers/ResearchDefinitionManager.js
---

# Garden Plot 6

It requires [[mechanics/garden/Plot Capacity Research|Plot Capacity Research]] `advanced:plotCapacity:6`, 1 completed Prestige, and 800 coin.

## Research connections

- Auto plant: `automation:autoPlantTile:6`
- Auto harvest: `automation:autoHarvestPlant:6`
- Growth levels: `advanced:plotGrowth:6:1..12`
- Yield levels: `emerald:plotPlanting:6:2..5`
- Capacity: `advanced:plotCapacity:6`

## Crop rules

Any researched seed can grow here. Growth time comes from the herb and this plot's growth research. The effective harvest phase is **3 seconds**.

## Related

- [[mechanics/garden/Garden Plots|All plots]]
- [[mechanics/garden/Garden Lifecycle|Garden Lifecycle]]
- [[mechanics/garden/Herb Catalog.base|Herb Catalog]]
- [[mechanics/garden/Garden Runtime Config|Runtime Config Status]]

