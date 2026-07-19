---
title: "Unlock Yarrow Seed"
aliases:
  - "Yarrow Seed Research"
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
catalog_order: 16
research_id: "unlockSeed:yarrowSeed"
required_player_level: 37
default_cost_coin: 63000
default_duration_seconds: 3600
default_duration: "1h"
prerequisite: "[[mechanics/garden/research/Unlock Silverleaf Seed|Unlock Silverleaf Seed]]"
unlocks: "[[mechanics/garden/seeds/Yarrow Seed|Yarrow Seed]]"
produces_access_to: "[[mechanics/garden/herbs/Yarrow Herb|Yarrow]]"
value_scope: current-client-default
verified_on: 2026-07-19
source_files:
  - src/gameplay/research/managers/ResearchDefinitionManager.js
  - src/gameplay/research/managers/ResearchBalanceManager.js
---

# Unlock Yarrow Seed

Completing this study adds [[mechanics/garden/seeds/Yarrow Seed|Yarrow Seed]] to [[mechanics/garden/Seed Summoning|Seed Summoning]], which gives access to [[mechanics/garden/herbs/Yarrow Herb|Yarrow]].

| Requirement | Value |
| --- | --- |
| Player level | 37 |
| Base coin cost | 63,000 |
| Base duration | 1h |
| Prerequisite | [[mechanics/garden/research/Unlock Silverleaf Seed|Unlock Silverleaf Seed]] |

> [!note] Value scope
> These are the current effective client defaults. Coin-cost reduction may lower the paid amount. See [[mechanics/garden/Garden Runtime Config|Runtime Config Status]] before changing balance.

