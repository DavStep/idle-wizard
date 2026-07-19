---
title: "Unlock Snowdrop Seed"
aliases:
  - "Snowdrop Seed Research"
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
catalog_order: 23
research_id: "unlockSeed:snowdropSeed"
required_player_level: 58
default_cost_coin: 660000
default_duration_seconds: 8100
default_duration: "2h 15m"
prerequisite: "[[mechanics/garden/research/Unlock Wormwood Seed|Unlock Wormwood Seed]]"
unlocks: "[[mechanics/garden/seeds/Snowdrop Seed|Snowdrop Seed]]"
produces_access_to: "[[mechanics/garden/herbs/Snowdrop Herb|Snowdrop]]"
value_scope: current-client-default
verified_on: 2026-07-19
source_files:
  - src/gameplay/research/managers/ResearchDefinitionManager.js
  - src/gameplay/research/managers/ResearchBalanceManager.js
---

# Unlock Snowdrop Seed

Completing this study adds [[mechanics/garden/seeds/Snowdrop Seed|Snowdrop Seed]] to [[mechanics/garden/Seed Summoning|Seed Summoning]], which gives access to [[mechanics/garden/herbs/Snowdrop Herb|Snowdrop]].

| Requirement | Value |
| --- | --- |
| Player level | 58 |
| Base coin cost | 660,000 |
| Base duration | 2h 15m |
| Prerequisite | [[mechanics/garden/research/Unlock Wormwood Seed|Unlock Wormwood Seed]] |

> [!note] Value scope
> These are the current effective client defaults. Coin-cost reduction may lower the paid amount. See [[mechanics/garden/Garden Runtime Config|Runtime Config Status]] before changing balance.

