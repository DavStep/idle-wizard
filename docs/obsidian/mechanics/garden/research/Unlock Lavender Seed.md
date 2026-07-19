---
title: "Unlock Lavender Seed"
aliases:
  - "Lavender Seed Research"
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
catalog_order: 4
research_id: "unlockSeed:lavenderSeed"
required_player_level: 7
default_cost_coin: 80
default_duration_seconds: 180
default_duration: "3m"
prerequisite: "[[mechanics/garden/research/Unlock Nettle Seed|Unlock Nettle Seed]]"
unlocks: "[[mechanics/garden/seeds/Lavender Seed|Lavender Seed]]"
produces_access_to: "[[mechanics/garden/herbs/Lavender Herb|Lavender]]"
value_scope: current-client-default
verified_on: 2026-07-19
source_files:
  - src/gameplay/research/managers/ResearchDefinitionManager.js
  - src/gameplay/research/managers/ResearchBalanceManager.js
---

# Unlock Lavender Seed

Completing this study adds [[mechanics/garden/seeds/Lavender Seed|Lavender Seed]] to [[mechanics/garden/Seed Summoning|Seed Summoning]], which gives access to [[mechanics/garden/herbs/Lavender Herb|Lavender]].

| Requirement | Value |
| --- | --- |
| Player level | 7 |
| Base coin cost | 80 |
| Base duration | 3m |
| Prerequisite | [[mechanics/garden/research/Unlock Nettle Seed|Unlock Nettle Seed]] |

> [!note] Value scope
> These are the current effective client defaults. Coin-cost reduction may lower the paid amount. See [[mechanics/garden/Garden Runtime Config|Runtime Config Status]] before changing balance.

