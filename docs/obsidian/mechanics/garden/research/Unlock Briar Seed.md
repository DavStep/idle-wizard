---
title: "Unlock Briar Seed"
aliases:
  - "Briar Seed Research"
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
catalog_order: 5
research_id: "unlockSeed:briarSeed"
required_player_level: 8
default_cost_coin: 130
default_duration_seconds: 240
default_duration: "4m"
prerequisite: "[[mechanics/garden/research/Unlock Lavender Seed|Unlock Lavender Seed]]"
unlocks: "[[mechanics/garden/seeds/Briar Seed|Briar Seed]]"
produces_access_to: "[[mechanics/garden/herbs/Briar Herb|Briar]]"
value_scope: current-client-default
verified_on: 2026-07-19
source_files:
  - src/gameplay/research/managers/ResearchDefinitionManager.js
  - src/gameplay/research/managers/ResearchBalanceManager.js
---

# Unlock Briar Seed

Completing this study adds [[mechanics/garden/seeds/Briar Seed|Briar Seed]] to [[mechanics/garden/Seed Summoning|Seed Summoning]], which gives access to [[mechanics/garden/herbs/Briar Herb|Briar]].

| Requirement | Value |
| --- | --- |
| Player level | 8 |
| Base coin cost | 130 |
| Base duration | 4m |
| Prerequisite | [[mechanics/garden/research/Unlock Lavender Seed|Unlock Lavender Seed]] |

> [!note] Value scope
> These are the current effective client defaults. Coin-cost reduction may lower the paid amount. See [[mechanics/garden/Garden Runtime Config|Runtime Config Status]] before changing balance.

