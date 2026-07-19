---
title: "Garden Plot 3"
aliases:
  - "Plot 3"
tags:
  - mechanics
  - entity/plot
  - system/garden
status: active
world: mechanics
note_type: plot
system: garden
implementation: shipped
plot_number: 3
unlock_path: "player-level cap"
required_player_level: 2
purchase_cost_coin: 75
effective_harvest_seconds: 3
auto_plant_research_id: "automation:autoPlantTile:3"
auto_harvest_research_id: "automation:autoHarvestPlant:3"
growth_research_series: "advanced:plotGrowth:3:L"
yield_level_series: "emerald:plotPlanting:3:M"
research:
  - "[[mechanics/garden/Plot Automation Research|Plot Automation Research]]"
  - "[[mechanics/garden/Plot Growth Research|Plot Growth Research]]"
  - "[[mechanics/garden/Plot Levels|Plot Levels]]"
verified_on: 2026-07-19
source_files:
  - src/gameplay/garden/managers/GardenBalanceManager.js
  - src/gameplay/garden/managers/GardenTilePurchaseManager.js
  - src/gameplay/research/managers/ResearchDefinitionManager.js
---

# Garden Plot 3

Player level 2 raises the buy cap to include this plot. It must then be purchased for 75 coin.

## Research connections

- Auto plant: `automation:autoPlantTile:3`
- Auto harvest: `automation:autoHarvestPlant:3`
- Growth levels: `advanced:plotGrowth:3:1..12`
- Yield levels: `emerald:plotPlanting:3:2..5`

## Crop rules

Any researched seed can grow here. Growth time comes from the herb and this plot's growth research. The effective harvest phase is **3 seconds**.

## Related

- [[mechanics/garden/Garden Plots|All plots]]
- [[mechanics/garden/Garden Lifecycle|Garden Lifecycle]]
- [[mechanics/garden/Herb Catalog.base|Herb Catalog]]
- [[mechanics/garden/Garden Runtime Config|Runtime Config Status]]

