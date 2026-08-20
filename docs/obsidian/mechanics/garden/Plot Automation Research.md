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

Every plot has one ordered automation study:

- `automation:autoPlantTile:N` unlocks the plot's Auto controls, plants its
  selected per-plot seed when enough stock is available, and starts harvesting
  when the crop is ready.

Each study costs **N ruby** for plot N and completes instantly. The same lane
for plot N requires the preceding plot's study. Automation research resets on
Prestige; the plot's Auto, seed, and `xN` settings persist in the gameplay save.

## Source of truth

- `src/gameplay/automation/automationResearchIds.js`
- `src/gameplay/research/managers/ResearchDefinitionManager.js`
- `src/gameplay/research/managers/ResearchBalanceManager.js`
