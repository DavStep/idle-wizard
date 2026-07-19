---
title: "Unlock Star Anise Seed"
aliases:
  - "Star Anise Seed Research"
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
catalog_order: 12
research_id: "unlockSeed:starAniseSeed"
required_player_level: 25
default_cost_coin: 15500
default_duration_seconds: 2100
default_duration: "35m"
prerequisite: "[[mechanics/garden/research/Unlock Dreambell Seed|Unlock Dreambell Seed]]"
unlocks: "[[mechanics/garden/seeds/Star Anise Seed|Star Anise Seed]]"
produces_access_to: "[[mechanics/garden/herbs/Star Anise Herb|Star Anise]]"
value_scope: current-client-default
verified_on: 2026-07-19
source_files:
  - src/gameplay/research/managers/ResearchDefinitionManager.js
  - src/gameplay/research/managers/ResearchBalanceManager.js
---

# Unlock Star Anise Seed

Completing this study adds [[mechanics/garden/seeds/Star Anise Seed|Star Anise Seed]] to [[mechanics/garden/Seed Summoning|Seed Summoning]], which gives access to [[mechanics/garden/herbs/Star Anise Herb|Star Anise]].

| Requirement | Value |
| --- | --- |
| Player level | 25 |
| Base coin cost | 15,500 |
| Base duration | 35m |
| Prerequisite | [[mechanics/garden/research/Unlock Dreambell Seed|Unlock Dreambell Seed]] |

> [!note] Value scope
> These are the current effective client defaults. Coin-cost reduction may lower the paid amount. See [[mechanics/garden/Garden Runtime Config|Runtime Config Status]] before changing balance.

