---
title: "Garden Lifecycle"
tags:
  - mechanics
  - system/garden
  - component
status: active
world: mechanics
note_type: component
system: garden
implementation: shipped
verified_on: 2026-07-19
related:
  - "[[mechanics/garden/Garden And Herbs|Garden and Herbs]]"
  - "[[mechanics/garden/Garden Plots|Garden Plots]]"
  - "[[mechanics/garden/Seed Summoning|Seed Summoning]]"
---

# Garden Lifecycle

```text
choose seed → plant → grow → ready → harvest → herb inventory
```

- Planting consumes the plot's selected seed quantity.
- Growth duration comes from the matching herb's base time, modified by plot growth research.
- Ready crops wait until harvesting starts.
- Harvest is a separate fixed 3-second phase in the current effective client.
- Completion adds herbs and keeps the seed selected, but does not automatically replant.
- Replacing a growing crop returns its committed seeds and restarts growth.
- Canceling growth or harvest returns the planted seeds and clears selection.
- Any purchased plot can grow any researched seed; herbs are not plot-specific.

## Connected systems

- Input: [[mechanics/garden/Seed Summoning|Seed Summoning]]
- Space: [[mechanics/garden/Garden Plots|Garden Plots]]
- Modifiers: [[mechanics/garden/Plot Research|Plot Research]]
- Output: [[mechanics/potions/Potion Recipes|Potion Recipes]] and [[mechanics/market/Market Systems|Market Systems]]

## Source of truth

- `src/gameplay/garden/managers/GardenPlantingManager.js`
- `src/gameplay/garden/managers/GardenProcessManager.js`
- `src/gameplay/garden/managers/GardenTileEntityManager.js`

