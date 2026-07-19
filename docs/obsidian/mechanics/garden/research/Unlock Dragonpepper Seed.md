---
title: "Unlock Dragonpepper Seed"
aliases:
  - "Dragonpepper Seed Research"
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
catalog_order: 14
research_id: "unlockSeed:dragonpepperSeed"
required_player_level: 31
default_cost_coin: 32000
default_duration_seconds: 2700
default_duration: "45m"
prerequisite: "[[mechanics/garden/research/Unlock Bloodrose Seed|Unlock Bloodrose Seed]]"
unlocks: "[[mechanics/garden/seeds/Dragonpepper Seed|Dragonpepper Seed]]"
produces_access_to: "[[mechanics/garden/herbs/Dragonpepper Herb|Dragonpepper]]"
value_scope: current-client-default
verified_on: 2026-07-19
source_files:
  - src/gameplay/research/managers/ResearchDefinitionManager.js
  - src/gameplay/research/managers/ResearchBalanceManager.js
---

# Unlock Dragonpepper Seed

Completing this study adds [[mechanics/garden/seeds/Dragonpepper Seed|Dragonpepper Seed]] to [[mechanics/garden/Seed Summoning|Seed Summoning]], which gives access to [[mechanics/garden/herbs/Dragonpepper Herb|Dragonpepper]].

| Requirement | Value |
| --- | --- |
| Player level | 31 |
| Base coin cost | 32,000 |
| Base duration | 45m |
| Prerequisite | [[mechanics/garden/research/Unlock Bloodrose Seed|Unlock Bloodrose Seed]] |

> [!note] Value scope
> These are the current effective client defaults. Coin-cost reduction may lower the paid amount. See [[mechanics/garden/Garden Runtime Config|Runtime Config Status]] before changing balance.

