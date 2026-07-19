---
title: "Unlock Comfrey Seed"
aliases:
  - "Comfrey Seed Research"
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
catalog_order: 19
research_id: "unlockSeed:comfreySeed"
required_player_level: 46
default_cost_coin: 172000
default_duration_seconds: 5400
default_duration: "1h 30m"
prerequisite: "[[mechanics/garden/research/Unlock Valerian Seed|Unlock Valerian Seed]]"
unlocks: "[[mechanics/garden/seeds/Comfrey Seed|Comfrey Seed]]"
produces_access_to: "[[mechanics/garden/herbs/Comfrey Herb|Comfrey]]"
value_scope: current-client-default
verified_on: 2026-07-19
source_files:
  - src/gameplay/research/managers/ResearchDefinitionManager.js
  - src/gameplay/research/managers/ResearchBalanceManager.js
---

# Unlock Comfrey Seed

Completing this study adds [[mechanics/garden/seeds/Comfrey Seed|Comfrey Seed]] to [[mechanics/garden/Seed Summoning|Seed Summoning]], which gives access to [[mechanics/garden/herbs/Comfrey Herb|Comfrey]].

| Requirement | Value |
| --- | --- |
| Player level | 46 |
| Base coin cost | 172,000 |
| Base duration | 1h 30m |
| Prerequisite | [[mechanics/garden/research/Unlock Valerian Seed|Unlock Valerian Seed]] |

> [!note] Value scope
> These are the current effective client defaults. Coin-cost reduction may lower the paid amount. See [[mechanics/garden/Garden Runtime Config|Runtime Config Status]] before changing balance.

