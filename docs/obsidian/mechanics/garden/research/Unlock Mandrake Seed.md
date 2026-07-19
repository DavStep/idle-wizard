---
title: "Unlock Mandrake Seed"
aliases:
  - "Mandrake Seed Research"
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
catalog_order: 7
research_id: "unlockSeed:mandrakeSeed"
required_player_level: 11
default_cost_coin: 2100
default_duration_seconds: 900
default_duration: "15m"
prerequisite: "[[mechanics/garden/research/Unlock Glowcap Seed|Unlock Glowcap Seed]]"
unlocks: "[[mechanics/garden/seeds/Mandrake Seed|Mandrake Seed]]"
produces_access_to: "[[mechanics/garden/herbs/Mandrake Herb|Mandrake]]"
value_scope: current-client-default
verified_on: 2026-07-19
source_files:
  - src/gameplay/research/managers/ResearchDefinitionManager.js
  - src/gameplay/research/managers/ResearchBalanceManager.js
---

# Unlock Mandrake Seed

Completing this study adds [[mechanics/garden/seeds/Mandrake Seed|Mandrake Seed]] to [[mechanics/garden/Seed Summoning|Seed Summoning]], which gives access to [[mechanics/garden/herbs/Mandrake Herb|Mandrake]].

| Requirement | Value |
| --- | --- |
| Player level | 11 |
| Base coin cost | 2,100 |
| Base duration | 15m |
| Prerequisite | [[mechanics/garden/research/Unlock Glowcap Seed|Unlock Glowcap Seed]] |

> [!note] Value scope
> These are the current effective client defaults. Coin-cost reduction may lower the paid amount. See [[mechanics/garden/Garden Runtime Config|Runtime Config Status]] before changing balance.

