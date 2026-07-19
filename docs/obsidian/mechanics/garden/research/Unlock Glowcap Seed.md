---
title: "Unlock Glowcap Seed"
aliases:
  - "Glowcap Seed Research"
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
catalog_order: 6
research_id: "unlockSeed:glowcapSeed"
required_player_level: 10
default_cost_coin: 200
default_duration_seconds: 300
default_duration: "5m"
prerequisite: "[[mechanics/garden/research/Unlock Briar Seed|Unlock Briar Seed]]"
unlocks: "[[mechanics/garden/seeds/Glowcap Seed|Glowcap Seed]]"
produces_access_to: "[[mechanics/garden/herbs/Glowcap Herb|Glowcap]]"
value_scope: current-client-default
verified_on: 2026-07-19
source_files:
  - src/gameplay/research/managers/ResearchDefinitionManager.js
  - src/gameplay/research/managers/ResearchBalanceManager.js
---

# Unlock Glowcap Seed

Completing this study adds [[mechanics/garden/seeds/Glowcap Seed|Glowcap Seed]] to [[mechanics/garden/Seed Summoning|Seed Summoning]], which gives access to [[mechanics/garden/herbs/Glowcap Herb|Glowcap]].

| Requirement | Value |
| --- | --- |
| Player level | 10 |
| Base coin cost | 200 |
| Base duration | 5m |
| Prerequisite | [[mechanics/garden/research/Unlock Briar Seed|Unlock Briar Seed]] |

> [!note] Value scope
> These are the current effective client defaults. Coin-cost reduction may lower the paid amount. See [[mechanics/garden/Garden Runtime Config|Runtime Config Status]] before changing balance.

