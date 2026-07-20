---
title: "Unlock Moonflower Seed"
aliases:
  - "Moonflower Seed Research"
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
catalog_order: 9
research_id: "unlockSeed:moonflowerSeed"
required_player_level: 16
default_cost_coin: 5200
default_duration_seconds: 1320
default_duration: "22m"
prerequisite: "[[mechanics/garden/research/Unlock Sunroot Seed|Unlock Sunroot Seed]]"
unlocks: "[[mechanics/garden/seeds/Moonflower Seed|Moonflower Seed]]"
produces_access_to: "[[mechanics/garden/herbs/Moonflower Herb|Moonflower]]"
value_scope: client-fallback-before-live-research-config
verified_on: 2026-07-19
source_files:
  - src/gameplay/research/managers/ResearchDefinitionManager.js
  - src/gameplay/research/managers/ResearchBalanceManager.js
---

# Unlock Moonflower Seed

Completing this study adds [[mechanics/garden/seeds/Moonflower Seed|Moonflower Seed]] to [[mechanics/garden/Seed Summoning|Seed Summoning]], which gives access to [[mechanics/garden/herbs/Moonflower Herb|Moonflower]].

| Requirement | Value |
| --- | --- |
| Player level | 16 |
| Base coin cost | 5,200 |
| Base duration | 22m |
| Prerequisite | [[mechanics/garden/research/Unlock Sunroot Seed|Unlock Sunroot Seed]] |

> [!note] Value scope
> These are client fallback values, not guaranteed live values. A matching SpacetimeDB `research_config` row can override coin cost and duration; coin-cost reduction can then lower the paid amount. See [[mechanics/garden/Garden Runtime Config|Runtime Config Status]] before changing balance.
