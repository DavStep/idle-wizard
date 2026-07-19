---
title: "Unlock Dreambell Seed"
aliases:
  - "Dreambell Seed Research"
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
catalog_order: 11
research_id: "unlockSeed:dreambellSeed"
required_player_level: 22
default_cost_coin: 11000
default_duration_seconds: 1800
default_duration: "30m"
prerequisite: "[[mechanics/garden/research/Unlock Frostmoss Seed|Unlock Frostmoss Seed]]"
unlocks: "[[mechanics/garden/seeds/Dreambell Seed|Dreambell Seed]]"
produces_access_to: "[[mechanics/garden/herbs/Dreambell Herb|Dreambell]]"
value_scope: current-client-default
verified_on: 2026-07-19
source_files:
  - src/gameplay/research/managers/ResearchDefinitionManager.js
  - src/gameplay/research/managers/ResearchBalanceManager.js
---

# Unlock Dreambell Seed

Completing this study adds [[mechanics/garden/seeds/Dreambell Seed|Dreambell Seed]] to [[mechanics/garden/Seed Summoning|Seed Summoning]], which gives access to [[mechanics/garden/herbs/Dreambell Herb|Dreambell]].

| Requirement | Value |
| --- | --- |
| Player level | 22 |
| Base coin cost | 11,000 |
| Base duration | 30m |
| Prerequisite | [[mechanics/garden/research/Unlock Frostmoss Seed|Unlock Frostmoss Seed]] |

> [!note] Value scope
> These are the current effective client defaults. Coin-cost reduction may lower the paid amount. See [[mechanics/garden/Garden Runtime Config|Runtime Config Status]] before changing balance.

