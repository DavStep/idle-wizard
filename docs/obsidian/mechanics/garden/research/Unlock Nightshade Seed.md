---
title: "Unlock Nightshade Seed"
aliases:
  - "Nightshade Seed Research"
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
catalog_order: 20
research_id: "unlockSeed:nightshadeSeed"
required_player_level: 49
default_cost_coin: 240000
default_duration_seconds: 6000
default_duration: "1h 40m"
prerequisite: "[[mechanics/garden/research/Unlock Comfrey Seed|Unlock Comfrey Seed]]"
unlocks: "[[mechanics/garden/seeds/Nightshade Seed|Nightshade Seed]]"
produces_access_to: "[[mechanics/garden/herbs/Nightshade Herb|Nightshade]]"
value_scope: current-client-default
verified_on: 2026-07-19
source_files:
  - src/gameplay/research/managers/ResearchDefinitionManager.js
  - src/gameplay/research/managers/ResearchBalanceManager.js
---

# Unlock Nightshade Seed

Completing this study adds [[mechanics/garden/seeds/Nightshade Seed|Nightshade Seed]] to [[mechanics/garden/Seed Summoning|Seed Summoning]], which gives access to [[mechanics/garden/herbs/Nightshade Herb|Nightshade]].

| Requirement | Value |
| --- | --- |
| Player level | 49 |
| Base coin cost | 240,000 |
| Base duration | 1h 40m |
| Prerequisite | [[mechanics/garden/research/Unlock Comfrey Seed|Unlock Comfrey Seed]] |

> [!note] Value scope
> These are the current effective client defaults. Coin-cost reduction may lower the paid amount. See [[mechanics/garden/Garden Runtime Config|Runtime Config Status]] before changing balance.

