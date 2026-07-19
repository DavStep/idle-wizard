---
title: "Unlock Belladonna Seed"
aliases:
  - "Belladonna Seed Research"
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
catalog_order: 21
research_id: "unlockSeed:belladonnaSeed"
required_player_level: 52
default_cost_coin: 335000
default_duration_seconds: 6600
default_duration: "1h 50m"
prerequisite: "[[mechanics/garden/research/Unlock Nightshade Seed|Unlock Nightshade Seed]]"
unlocks: "[[mechanics/garden/seeds/Belladonna Seed|Belladonna Seed]]"
produces_access_to: "[[mechanics/garden/herbs/Belladonna Herb|Belladonna]]"
value_scope: current-client-default
verified_on: 2026-07-19
source_files:
  - src/gameplay/research/managers/ResearchDefinitionManager.js
  - src/gameplay/research/managers/ResearchBalanceManager.js
---

# Unlock Belladonna Seed

Completing this study adds [[mechanics/garden/seeds/Belladonna Seed|Belladonna Seed]] to [[mechanics/garden/Seed Summoning|Seed Summoning]], which gives access to [[mechanics/garden/herbs/Belladonna Herb|Belladonna]].

| Requirement | Value |
| --- | --- |
| Player level | 52 |
| Base coin cost | 335,000 |
| Base duration | 1h 50m |
| Prerequisite | [[mechanics/garden/research/Unlock Nightshade Seed|Unlock Nightshade Seed]] |

> [!note] Value scope
> These are the current effective client defaults. Coin-cost reduction may lower the paid amount. See [[mechanics/garden/Garden Runtime Config|Runtime Config Status]] before changing balance.

