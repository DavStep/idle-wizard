---
title: "Unlock Hyssop Seed"
aliases:
  - "Hyssop Seed Research"
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
catalog_order: 17
research_id: "unlockSeed:hyssopSeed"
required_player_level: 40
default_cost_coin: 88000
default_duration_seconds: 4200
default_duration: "1h 10m"
prerequisite: "[[mechanics/garden/research/Unlock Yarrow Seed|Unlock Yarrow Seed]]"
unlocks: "[[mechanics/garden/seeds/Hyssop Seed|Hyssop Seed]]"
produces_access_to: "[[mechanics/garden/herbs/Hyssop Herb|Hyssop]]"
value_scope: current-client-default
verified_on: 2026-07-19
source_files:
  - src/gameplay/research/managers/ResearchDefinitionManager.js
  - src/gameplay/research/managers/ResearchBalanceManager.js
---

# Unlock Hyssop Seed

Completing this study adds [[mechanics/garden/seeds/Hyssop Seed|Hyssop Seed]] to [[mechanics/garden/Seed Summoning|Seed Summoning]], which gives access to [[mechanics/garden/herbs/Hyssop Herb|Hyssop]].

| Requirement | Value |
| --- | --- |
| Player level | 40 |
| Base coin cost | 88,000 |
| Base duration | 1h 10m |
| Prerequisite | [[mechanics/garden/research/Unlock Yarrow Seed|Unlock Yarrow Seed]] |

> [!note] Value scope
> These are the current effective client defaults. Coin-cost reduction may lower the paid amount. See [[mechanics/garden/Garden Runtime Config|Runtime Config Status]] before changing balance.

