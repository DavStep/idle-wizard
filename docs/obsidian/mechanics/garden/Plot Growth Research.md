---
title: "Plot Growth Research"
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
levels_per_plot: 12
reduction_per_level_percent: 5
maximum_reduction_percent: 60
default_duration_seconds: 3
persistent_through_prestige: false
verified_on: 2026-07-19
---

# Plot Growth Research

Each plot has 12 ordered levels under `advanced:plotGrowth:N:L`.

- Level L costs **L emerald** and takes **3 seconds**.
- Every level removes another **5%** from that plot's herb growth time.
- Level 12 gives **60% total reduction**, so growth takes 40% of the herb's base time.
- Levels 6–12 require at least **5 completed Prestiges**.
- The harvest phase remains 3 seconds and is not reduced.
- Growth research resets on Prestige.

## Source of truth

- `src/gameplay/research/advancedResearchIds.js`
- `src/gameplay/research/managers/ResearchDefinitionManager.js`
- `src/gameplay/research/managers/ResearchBalanceManager.js`

