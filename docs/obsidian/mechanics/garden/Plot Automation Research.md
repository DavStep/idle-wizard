---
title: "Plot Automation Research"
tags:
  - mechanics
  - progression/research
  - system/garden
status: active
world: mechanics
note_type: research-component
system: garden
implementation: shipped
currency: ruby
default_duration_seconds: 3
persistent_through_prestige: false
verified_on: 2026-07-19
---

# Plot Automation Research

Every plot has two ordered automation studies:

- `automation:autoPlantTile:N` plants the selected seed when enough seeds are available.
- `automation:autoHarvestPlant:N` starts harvesting a ready crop.

Each study costs **N ruby** for plot N and takes **3 seconds**. The same lane for plot N requires the preceding plot's study. Automation resets on Prestige.

## Source of truth

- `src/gameplay/automation/automationResearchIds.js`
- `src/gameplay/research/managers/ResearchDefinitionManager.js`
- `src/gameplay/research/managers/ResearchBalanceManager.js`

