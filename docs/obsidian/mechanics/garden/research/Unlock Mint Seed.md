---
title: "Unlock Mint Seed"
aliases:
  - "Mint Seed Research"
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
catalog_order: 2
research_id: "unlockSeed:mintSeed"
required_player_level: 2
default_cost_coin: 0
default_duration_seconds: 60
default_duration: "1m"
prerequisite: "[[mechanics/garden/research/Unlock Sage Seed|Unlock Sage Seed]]"
unlocks: "[[mechanics/garden/seeds/Mint Seed|Mint Seed]]"
produces_access_to: "[[mechanics/garden/herbs/Mint Herb|Mint]]"
value_scope: client-fallback-before-live-research-config
verified_on: 2026-07-19
source_files:
  - src/gameplay/research/managers/ResearchDefinitionManager.js
  - src/gameplay/research/managers/ResearchBalanceManager.js
---

# Unlock Mint Seed

Completing this study adds [[mechanics/garden/seeds/Mint Seed|Mint Seed]] to [[mechanics/garden/Seed Summoning|Seed Summoning]], which gives access to [[mechanics/garden/herbs/Mint Herb|Mint]].

| Requirement | Value |
| --- | --- |
| Player level | 2 |
| Base coin cost | 0 |
| Base duration | 1m |
| Prerequisite | [[mechanics/garden/research/Unlock Sage Seed|Unlock Sage Seed]] |

> [!note] Value scope
> These are client fallback values, not guaranteed live values. A matching SpacetimeDB `research_config` row can override coin cost and duration; coin-cost reduction can then lower the paid amount. See [[mechanics/garden/Garden Runtime Config|Runtime Config Status]] before changing balance.
