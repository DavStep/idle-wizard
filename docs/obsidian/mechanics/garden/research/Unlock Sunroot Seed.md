---
title: "Unlock Sunroot Seed"
aliases:
  - "Sunroot Seed Research"
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
catalog_order: 8
research_id: "unlockSeed:sunrootSeed"
required_player_level: 13
default_cost_coin: 3400
default_duration_seconds: 1080
default_duration: "18m"
prerequisite: "[[mechanics/garden/research/Unlock Mandrake Seed|Unlock Mandrake Seed]]"
unlocks: "[[mechanics/garden/seeds/Sunroot Seed|Sunroot Seed]]"
produces_access_to: "[[mechanics/garden/herbs/Sunroot Herb|Sunroot]]"
value_scope: current-client-default
verified_on: 2026-07-19
source_files:
  - src/gameplay/research/managers/ResearchDefinitionManager.js
  - src/gameplay/research/managers/ResearchBalanceManager.js
---

# Unlock Sunroot Seed

Completing this study adds [[mechanics/garden/seeds/Sunroot Seed|Sunroot Seed]] to [[mechanics/garden/Seed Summoning|Seed Summoning]], which gives access to [[mechanics/garden/herbs/Sunroot Herb|Sunroot]].

| Requirement | Value |
| --- | --- |
| Player level | 13 |
| Base coin cost | 3,400 |
| Base duration | 18m |
| Prerequisite | [[mechanics/garden/research/Unlock Mandrake Seed|Unlock Mandrake Seed]] |

> [!note] Value scope
> These are the current effective client defaults. Coin-cost reduction may lower the paid amount. See [[mechanics/garden/Garden Runtime Config|Runtime Config Status]] before changing balance.

