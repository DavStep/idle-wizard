---
title: "Unlock Bloodrose Seed"
aliases:
  - "Bloodrose Seed Research"
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
catalog_order: 13
research_id: "unlockSeed:bloodroseSeed"
required_player_level: 28
default_cost_coin: 22000
default_duration_seconds: 2400
default_duration: "40m"
prerequisite: "[[mechanics/garden/research/Unlock Star Anise Seed|Unlock Star Anise Seed]]"
unlocks: "[[mechanics/garden/seeds/Bloodrose Seed|Bloodrose Seed]]"
produces_access_to: "[[mechanics/garden/herbs/Bloodrose Herb|Bloodrose]]"
value_scope: client-fallback-before-live-research-config
verified_on: 2026-07-19
source_files:
  - src/gameplay/research/managers/ResearchDefinitionManager.js
  - src/gameplay/research/managers/ResearchBalanceManager.js
---

# Unlock Bloodrose Seed

Completing this study adds [[mechanics/garden/seeds/Bloodrose Seed|Bloodrose Seed]] to [[mechanics/garden/Seed Summoning|Seed Summoning]], which gives access to [[mechanics/garden/herbs/Bloodrose Herb|Bloodrose]].

| Requirement | Value |
| --- | --- |
| Player level | 28 |
| Base coin cost | 22,000 |
| Base duration | 40m |
| Prerequisite | [[mechanics/garden/research/Unlock Star Anise Seed|Unlock Star Anise Seed]] |

> [!note] Value scope
> These are client fallback values, not guaranteed live values. A matching SpacetimeDB `research_config` row can override coin cost and duration; coin-cost reduction can then lower the paid amount. See [[mechanics/garden/Garden Runtime Config|Runtime Config Status]] before changing balance.
