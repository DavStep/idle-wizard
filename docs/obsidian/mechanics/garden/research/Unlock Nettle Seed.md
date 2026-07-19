---
title: "Unlock Nettle Seed"
aliases:
  - "Nettle Seed Research"
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
catalog_order: 3
research_id: "unlockSeed:nettleSeed"
required_player_level: 5
default_cost_coin: 40
default_duration_seconds: 120
default_duration: "2m"
prerequisite: "[[mechanics/garden/research/Unlock Mint Seed|Unlock Mint Seed]]"
unlocks: "[[mechanics/garden/seeds/Nettle Seed|Nettle Seed]]"
produces_access_to: "[[mechanics/garden/herbs/Nettle Herb|Nettle]]"
value_scope: current-client-default
verified_on: 2026-07-19
source_files:
  - src/gameplay/research/managers/ResearchDefinitionManager.js
  - src/gameplay/research/managers/ResearchBalanceManager.js
---

# Unlock Nettle Seed

Completing this study adds [[mechanics/garden/seeds/Nettle Seed|Nettle Seed]] to [[mechanics/garden/Seed Summoning|Seed Summoning]], which gives access to [[mechanics/garden/herbs/Nettle Herb|Nettle]].

| Requirement | Value |
| --- | --- |
| Player level | 5 |
| Base coin cost | 40 |
| Base duration | 2m |
| Prerequisite | [[mechanics/garden/research/Unlock Mint Seed|Unlock Mint Seed]] |

> [!note] Value scope
> These are the current effective client defaults. Coin-cost reduction may lower the paid amount. See [[mechanics/garden/Garden Runtime Config|Runtime Config Status]] before changing balance.

