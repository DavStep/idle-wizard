---
title: "Unlock Wormwood Seed"
aliases:
  - "Wormwood Seed Research"
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
catalog_order: 22
research_id: "unlockSeed:wormwoodSeed"
required_player_level: 55
default_cost_coin: 470000
default_duration_seconds: 7200
default_duration: "2h"
prerequisite: "[[mechanics/garden/research/Unlock Belladonna Seed|Unlock Belladonna Seed]]"
unlocks: "[[mechanics/garden/seeds/Wormwood Seed|Wormwood Seed]]"
produces_access_to: "[[mechanics/garden/herbs/Wormwood Herb|Wormwood]]"
value_scope: client-fallback-before-live-research-config
verified_on: 2026-07-19
source_files:
  - src/gameplay/research/managers/ResearchDefinitionManager.js
  - src/gameplay/research/managers/ResearchBalanceManager.js
---

# Unlock Wormwood Seed

Completing this study adds [[mechanics/garden/seeds/Wormwood Seed|Wormwood Seed]] to [[mechanics/garden/Seed Summoning|Seed Summoning]], which gives access to [[mechanics/garden/herbs/Wormwood Herb|Wormwood]].

| Requirement | Value |
| --- | --- |
| Player level | 55 |
| Base coin cost | 470,000 |
| Base duration | 2h |
| Prerequisite | [[mechanics/garden/research/Unlock Belladonna Seed|Unlock Belladonna Seed]] |

> [!note] Value scope
> These are client fallback values, not guaranteed live values. A matching SpacetimeDB `research_config` row can override coin cost and duration; coin-cost reduction can then lower the paid amount. See [[mechanics/garden/Garden Runtime Config|Runtime Config Status]] before changing balance.
