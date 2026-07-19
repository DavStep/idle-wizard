---
title: "Unlock Sage Seed"
aliases:
  - "Sage Seed Research"
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
catalog_order: 1
research_id: "unlockSeed:sageSeed"
required_player_level: 1
default_cost_coin: 0
default_duration_seconds: 3
default_duration: "3 seconds"
unlocks: "[[mechanics/garden/seeds/Sage Seed|Sage Seed]]"
produces_access_to: "[[mechanics/garden/herbs/Sage Herb|Sage]]"
value_scope: current-client-default
verified_on: 2026-07-19
source_files:
  - src/gameplay/research/managers/ResearchDefinitionManager.js
  - src/gameplay/research/managers/ResearchBalanceManager.js
---

# Unlock Sage Seed

Completing this study adds [[mechanics/garden/seeds/Sage Seed|Sage Seed]] to [[mechanics/garden/Seed Summoning|Seed Summoning]], which gives access to [[mechanics/garden/herbs/Sage Herb|Sage]].

| Requirement | Value |
| --- | --- |
| Player level | 1 |
| Base coin cost | 0 |
| Base duration | 3 seconds |
| Prerequisite | none |

> [!note] Value scope
> These are the current effective client defaults. Coin-cost reduction may lower the paid amount. See [[mechanics/garden/Garden Runtime Config|Runtime Config Status]] before changing balance.

