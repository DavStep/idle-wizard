---
title: "Unlock Valerian Seed"
aliases:
  - "Valerian Seed Research"
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
catalog_order: 18
research_id: "unlockSeed:valerianSeed"
required_player_level: 43
default_cost_coin: 123000
default_duration_seconds: 4800
default_duration: "1h 20m"
prerequisite: "[[mechanics/garden/research/Unlock Hyssop Seed|Unlock Hyssop Seed]]"
unlocks: "[[mechanics/garden/seeds/Valerian Seed|Valerian Seed]]"
produces_access_to: "[[mechanics/garden/herbs/Valerian Herb|Valerian]]"
value_scope: current-client-default
verified_on: 2026-07-19
source_files:
  - src/gameplay/research/managers/ResearchDefinitionManager.js
  - src/gameplay/research/managers/ResearchBalanceManager.js
---

# Unlock Valerian Seed

Completing this study adds [[mechanics/garden/seeds/Valerian Seed|Valerian Seed]] to [[mechanics/garden/Seed Summoning|Seed Summoning]], which gives access to [[mechanics/garden/herbs/Valerian Herb|Valerian]].

| Requirement | Value |
| --- | --- |
| Player level | 43 |
| Base coin cost | 123,000 |
| Base duration | 1h 20m |
| Prerequisite | [[mechanics/garden/research/Unlock Hyssop Seed|Unlock Hyssop Seed]] |

> [!note] Value scope
> These are the current effective client defaults. Coin-cost reduction may lower the paid amount. See [[mechanics/garden/Garden Runtime Config|Runtime Config Status]] before changing balance.

