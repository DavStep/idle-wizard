---
title: "Garden Plot 8"
aliases:
  - "Plot 8"
tags:
  - mechanics
  - entity/plot
  - system/garden
status: active
world: mechanics
note_type: plot
system: garden
implementation: shipped
plot_number: 8
unlock_path: "permanent capacity research"
required_prestiges: 3
purchase_cost_coin: 2200
capacity_research_id: "advanced:plotCapacity:8"
effective_harvest_seconds: 3
auto_plant_research_id: "automation:autoPlantTile:8"
auto_harvest_research_id: "automation:autoHarvestPlant:8"
growth_research_series: "advanced:plotGrowth:8:L"
yield_level_series: "emerald:plotPlanting:8:M"
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

# Garden Plot 8

It requires [[mechanics/garden/Plot Capacity Research|Plot Capacity Research]] `advanced:plotCapacity:8`, 3 completed Prestiges, and 2,200 coin.

## Research connections

- Auto plant: `automation:autoPlantTile:8`
- Auto harvest: `automation:autoHarvestPlant:8`
- Growth levels: `advanced:plotGrowth:8:1..12`
- Yield levels: `emerald:plotPlanting:8:2..5`
- Capacity: `advanced:plotCapacity:8`

## Crop rules

Any researched seed can grow here. Growth time comes from the herb and this plot's growth research. The effective harvest phase is **3 seconds**.

## Related

- [[mechanics/garden/Garden Plots|All plots]]
- [[mechanics/garden/Garden Lifecycle|Garden Lifecycle]]
- [[mechanics/garden/Herb Catalog.base|Herb Catalog]]
- [[mechanics/garden/Garden Runtime Config|Runtime Config Status]]

