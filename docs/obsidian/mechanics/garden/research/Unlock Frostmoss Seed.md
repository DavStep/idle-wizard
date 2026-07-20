---
title: "Unlock Frostmoss Seed"
aliases:
  - "Frostmoss Seed Research"
tags:
  - mechanics
  - progression/research
  - progression/seed-research
  - system/garden
status: active
world: mechanics
note_type: research
research_family: seed-unlock
system: garden
implementation: shipped
catalog_order: 10
research_id: "unlockSeed:frostmossSeed"
required_player_level: 19
default_cost_coin: 7600
default_duration_seconds: 1560
default_duration: "26m"
prerequisite: "[[mechanics/garden/research/Unlock Moonflower Seed|Unlock Moonflower Seed]]"
unlocks: "[[mechanics/garden/seeds/Frostmoss Seed|Frostmoss Seed]]"
produces_access_to: "[[mechanics/garden/herbs/Frostmoss Herb|Frostmoss]]"
value_scope: client-fallback-before-live-research-config
verified_on: 2026-07-19
source_files:
  - src/gameplay/research/managers/ResearchDefinitionManager.js
  - src/gameplay/research/managers/ResearchBalanceManager.js
---

# Unlock Frostmoss Seed

Completing this study adds [[mechanics/garden/seeds/Frostmoss Seed|Frostmoss Seed]] to [[mechanics/garden/Seed Summoning|Seed Summoning]], which gives access to [[mechanics/garden/herbs/Frostmoss Herb|Frostmoss]].

| Requirement | Value |
| --- | --- |
| Player level | 19 |
| Base coin cost | 7,600 |
| Base duration | 26m |
| Prerequisite | [[mechanics/garden/research/Unlock Moonflower Seed|Unlock Moonflower Seed]] |

> [!note] Value scope
> These are client fallback values, not guaranteed live values. A matching SpacetimeDB `research_config` row can override coin cost and duration; coin-cost reduction can then lower the paid amount. See [[mechanics/garden/Garden Runtime Config|Runtime Config Status]] before changing balance.
