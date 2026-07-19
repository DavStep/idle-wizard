---
title: "Garden Plot 9"
aliases:
  - "Plot 9"
tags:
  - mechanics
  - entity/plot
  - system/garden
status: active
world: mechanics
note_type: plot
system: garden
implementation: shipped
plot_number: 9
unlock_path: "permanent capacity research"
required_prestiges: 4
purchase_cost_coin: 3300
capacity_research_id: "advanced:plotCapacity:9"
effective_harvest_seconds: 3
auto_plant_research_id: "automation:autoPlantTile:9"
auto_harvest_research_id: "automation:autoHarvestPlant:9"
growth_research_series: "advanced:plotGrowth:9:L"
yield_level_series: "emerald:plotPlanting:9:M"
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

# Garden Plot 9

It requires [[mechanics/garden/Plot Capacity Research|Plot Capacity Research]] `advanced:plotCapacity:9`, 4 completed Prestiges, and 3,300 coin.

## Research connections

- Auto plant: `automation:autoPlantTile:9`
- Auto harvest: `automation:autoHarvestPlant:9`
- Growth levels: `advanced:plotGrowth:9:1..12`
- Yield levels: `emerald:plotPlanting:9:2..5`
- Capacity: `advanced:plotCapacity:9`

## Crop rules

Any researched seed can grow here. Growth time comes from the herb and this plot's growth research. The effective harvest phase is **3 seconds**.

## Related

- [[mechanics/garden/Garden Plots|All plots]]
- [[mechanics/garden/Garden Lifecycle|Garden Lifecycle]]
- [[mechanics/garden/Herb Catalog.base|Herb Catalog]]
- [[mechanics/garden/Garden Runtime Config|Runtime Config Status]]

