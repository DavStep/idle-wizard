---
title: "Unlock Pearlroot Seed"
aliases:
  - "Pearlroot Seed Research"
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
catalog_order: 24
research_id: "unlockSeed:pearlrootSeed"
required_player_level: 61
default_cost_coin: 925000
default_duration_seconds: 9000
default_duration: "2h 30m"
prerequisite: "[[mechanics/garden/research/Unlock Snowdrop Seed|Unlock Snowdrop Seed]]"
unlocks: "[[mechanics/garden/seeds/Pearlroot Seed|Pearlroot Seed]]"
produces_access_to: "[[mechanics/garden/herbs/Pearlroot Herb|Pearlroot]]"
value_scope: client-fallback-before-live-research-config
verified_on: 2026-07-19
source_files:
  - src/gameplay/research/managers/ResearchDefinitionManager.js
  - src/gameplay/research/managers/ResearchBalanceManager.js
---

# Unlock Pearlroot Seed

Completing this study adds [[mechanics/garden/seeds/Pearlroot Seed|Pearlroot Seed]] to [[mechanics/garden/Seed Summoning|Seed Summoning]], which gives access to [[mechanics/garden/herbs/Pearlroot Herb|Pearlroot]].

| Requirement | Value |
| --- | --- |
| Player level | 61 |
| Base coin cost | 925,000 |
| Base duration | 2h 30m |
| Prerequisite | [[mechanics/garden/research/Unlock Snowdrop Seed|Unlock Snowdrop Seed]] |

> [!note] Value scope
> These are client fallback values, not guaranteed live values. A matching SpacetimeDB `research_config` row can override coin cost and duration; coin-cost reduction can then lower the paid amount. See [[mechanics/garden/Garden Runtime Config|Runtime Config Status]] before changing balance.
